import type { Assignment, ChatMessage, GroupId, MessageDirection, UserId } from '../entities.js';
import { DomainError } from '../errors.js';
import type { Deps } from '../ports.js';
import { cleanMultiline, cleanText, LIMITS } from '../rules/validation.js';
import { loadGroupForMember, profilesById, type PublicProfile } from './shared.js';

/**
 * Anonymous chat.
 *
 * - side "giver": I write to the person I give a gift to. They don't know it's me.
 * - side "receiver": I talk to my anonymous secret friend.
 *
 * Views never include user ids, the thread id is opaque and both sides get
 * exactly the same message shape, so the receiver cannot learn who the giver is.
 */
export type ChatSide = 'giver' | 'receiver';

export interface MessageView {
  id: string;
  mine: boolean;
  text: string;
  createdAt: string;
}

export interface ThreadView {
  side: ChatSide;
  /** Only on the giver side: who I'm writing to. The receiver side never has it. */
  counterpart: PublicProfile | null;
  blocked: boolean;
  messages: MessageView[];
  hasMore: boolean;
}

const myDirection = (side: ChatSide): MessageDirection =>
  side === 'giver' ? 'from_giver' : 'from_receiver';

async function loadThread(
  deps: Pick<Deps, 'groups' | 'assignments'>,
  actorId: UserId,
  groupId: GroupId,
  side: ChatSide,
): Promise<Assignment> {
  const { group } = await loadGroupForMember(deps, groupId, actorId);
  if (group.status === 'open') throw new DomainError('DRAW_NOT_DONE', 'draw not done yet');
  const assignment =
    side === 'giver'
      ? await deps.assignments.findByGiver(groupId, actorId)
      : await deps.assignments.findByReceiver(groupId, actorId);
  if (!assignment) throw new DomainError('NOT_FOUND', 'no chat for you in this group');
  return assignment;
}

const toView = (m: ChatMessage, side: ChatSide): MessageView => ({
  id: m.id,
  mine: m.direction === myDirection(side),
  text: m.text,
  // Rounded to the minute: precise timestamps help correlate who was typing.
  createdAt: new Date(Math.floor(m.createdAt.getTime() / 60_000) * 60_000).toISOString(),
});

export async function listMessages(
  deps: Pick<Deps, 'groups' | 'assignments' | 'messages' | 'users'>,
  actorId: UserId,
  groupId: GroupId,
  side: ChatSide,
  opts: { limit?: number; before?: Date } = {},
): Promise<ThreadView> {
  const thread = await loadThread(deps, actorId, groupId, side);
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 50);
  const page = await deps.messages.listForThread(thread.id, limit + 1, opts.before);
  const counterpart =
    side === 'giver'
      ? ((await profilesById(deps, [thread.receiverId])).get(thread.receiverId) ?? null)
      : null;
  return {
    side,
    counterpart,
    blocked: thread.chatBlocked,
    messages: page.slice(0, limit).map((m) => toView(m, side)),
    hasMore: page.length > limit,
  };
}

/** Basic anti-spam: max messages per thread (both directions) in a rolling hour. */
export const MAX_THREAD_MESSAGES_PER_HOUR = 60;

export async function sendMessage(
  deps: Pick<Deps, 'groups' | 'assignments' | 'messages' | 'ids' | 'clock' | 'notifications'>,
  actorId: UserId,
  groupId: GroupId,
  side: ChatSide,
  text: string,
): Promise<MessageView> {
  const { group } = await loadGroupForMember(deps, groupId, actorId);
  const thread = await loadThread(deps, actorId, groupId, side);
  if (side === 'giver' && thread.chatBlocked) {
    throw new DomainError('CHAT_BLOCKED', 'the recipient paused the chat');
  }
  const now = deps.clock.now();
  const recent = await deps.messages.countForThreadSince(
    thread.id,
    new Date(now.getTime() - 3_600_000),
  );
  if (recent >= MAX_THREAD_MESSAGES_PER_HOUR) {
    throw new DomainError('CONFLICT', 'too many messages, wait a bit');
  }
  const message: ChatMessage = {
    id: deps.ids.id(),
    threadId: thread.id,
    groupId,
    direction: myDirection(side),
    text: cleanMultiline(text, 'text', LIMITS.messageText.min, LIMITS.messageText.max),
    createdAt: now,
  };
  await deps.messages.add(message);
  const recipient = side === 'giver' ? thread.receiverId : thread.giverId;
  await deps.notifications.notify([recipient], {
    type: 'new_message',
    groupId,
    groupName: group.name,
    // The recipient reads it on the opposite side of the thread.
    side: side === 'giver' ? 'receiver' : 'giver',
  });
  return toView(message, side);
}

/** The receiver can pause messages from their anonymous giver (and resume them). */
export async function setGiverBlocked(
  deps: Pick<Deps, 'groups' | 'assignments'>,
  actorId: UserId,
  groupId: GroupId,
  blocked: boolean,
): Promise<void> {
  const thread = await loadThread(deps, actorId, groupId, 'receiver');
  await deps.assignments.setChatBlocked(thread.id, blocked);
}

export async function reportThread(
  deps: Pick<Deps, 'groups' | 'assignments' | 'reports' | 'ids' | 'clock'>,
  actorId: UserId,
  groupId: GroupId,
  side: ChatSide,
  input: { messageId: string | null; reason: string },
): Promise<void> {
  const thread = await loadThread(deps, actorId, groupId, side);
  await deps.reports.add({
    id: deps.ids.id(),
    groupId,
    threadId: thread.id,
    messageId: input.messageId,
    reporterId: actorId,
    reason: cleanText(input.reason || 'Sin motivo', 'reason', 1, LIMITS.reportReason),
    createdAt: deps.clock.now(),
  });
}
