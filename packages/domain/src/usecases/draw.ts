import type { Assignment, Group, GroupId, UserId, Wish } from '../entities.js';
import { DomainError } from '../errors.js';
import type { Deps } from '../ports.js';
import { allowedRecipients, draw, isValidDraw } from '../rules/draw.js';

/** Minimum possible recipients per participant after exclusions. */
export const MIN_OPTIONS = 2;
import { toDetail, type GroupDetailView } from './groups.js';
import {
  cloneGroup,
  colombiaToday,
  daysBetween,
  loadGroupForMember,
  mutateGroup,
  participantsOf,
  profilesById,
  requireOrganizer,
  requireStatus,
  type PublicProfile,
} from './shared.js';

type DrawDeps = Pick<
  Deps,
  | 'groups'
  | 'users'
  | 'assignments'
  | 'messages'
  | 'random'
  | 'ids'
  | 'clock'
  | 'policy'
  | 'notifications'
>;

async function executeDraw(
  deps: DrawDeps,
  actorId: UserId,
  groupId: GroupId,
  mode: 'first' | 'redraw',
): Promise<GroupDetailView> {
  let pairs: Assignment[] = [];
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    if (mode === 'first') requireStatus(g, 'open');
    else {
      requireStatus(g, 'drawn');
      if (g.drawCount - 1 >= deps.policy.maxRedraws) {
        throw new DomainError('REDRAW_LIMIT', 'redraw limit reached', {
          max: deps.policy.maxRedraws,
        });
      }
    }
    const participants = participantsOf(g);
    const allowed = allowedRecipients(participants, g.exclusions);
    const tooFew = participants.filter((p) => (allowed.get(p)?.size ?? 0) < MIN_OPTIONS);
    if (participants.length >= 3 && tooFew.length > 0) {
      // Everybody keeps at least 2 possible recipients, so exclusions can't be
      // used to force a specific pair.
      throw new DomainError('DRAW_IMPOSSIBLE', 'too many exclusions for some people', {
        blocking: tooFew,
      });
    }
    const result = draw(participants, g.exclusions, deps.random);
    if (!result.ok) {
      if (result.reason === 'not_enough_participants') {
        throw new DomainError('NOT_ENOUGH_PARTICIPANTS', 'need at least 3 participants', {
          min: 3,
        });
      }
      throw new DomainError('DRAW_IMPOSSIBLE', 'exclusions make the draw impossible', {
        blocking: result.blocking,
      });
    }
    /* c8 ignore next 3 -- defensive guard, the algorithm is property-tested */
    if (!isValidDraw(participants, g.exclusions, result.pairs)) {
      throw new DomainError('CONFLICT', 'invalid draw');
    }
    const now = deps.clock.now();
    g.drawCount += 1;
    g.status = 'drawn';
    g.drawnAt = now;
    g.members = g.members.map((m) => ({ ...m, hasSeenAssignment: false }));
    pairs = result.pairs.map((p) => ({
      id: deps.ids.id(),
      groupId: g.id,
      giverId: p.giverId,
      receiverId: p.receiverId,
      drawNumber: g.drawCount,
      chatBlocked: false,
      createdAt: now,
    }));
    return g;
  });
  // Group is saved as drawn first, then assignments are written. A redraw
  // also wipes old anonymous chats: they belonged to the previous pairs.
  await deps.messages.deleteForGroup(groupId);
  await deps.assignments.replaceForGroup(groupId, pairs);
  await deps.notifications.notify(
    group.members.map((m) => m.userId),
    { type: 'draw_done', groupId, groupName: group.name, redraw: mode === 'redraw' },
  );
  return toDetail(deps, group, actorId);
}

export const runDraw = (deps: DrawDeps, actorId: UserId, groupId: GroupId) =>
  executeDraw(deps, actorId, groupId, 'first');

/** Explicit re-draw by the organizer (UI asks for confirmation). Everyone is notified. */
export const redraw = (deps: DrawDeps, actorId: UserId, groupId: GroupId) =>
  executeDraw(deps, actorId, groupId, 'redraw');

/**
 * Reopens a drawn group so people can join or leave. Deletes the current
 * assignments and chats; a new draw is needed afterwards.
 */
export async function reopenGroup(
  deps: Pick<
    Deps,
    'groups' | 'users' | 'assignments' | 'messages' | 'clock' | 'policy' | 'notifications'
  >,
  actorId: UserId,
  groupId: GroupId,
): Promise<GroupDetailView> {
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    requireStatus(g, 'drawn');
    if (g.drawCount - 1 >= deps.policy.maxRedraws) {
      throw new DomainError('REDRAW_LIMIT', 'redraw limit reached', {
        max: deps.policy.maxRedraws,
      });
    }
    g.status = 'open';
    g.drawnAt = null;
    g.members = g.members.map((m) => ({ ...m, hasSeenAssignment: false }));
    return g;
  });
  await deps.assignments.deleteForGroup(groupId);
  await deps.messages.deleteForGroup(groupId);
  await deps.notifications.notify(
    group.members.map((m) => m.userId),
    { type: 'group_reopened', groupId, groupName: group.name },
  );
  return toDetail(deps, group, actorId);
}

export interface MyAssignmentView {
  groupId: GroupId;
  drawNumber: number;
  recipient: PublicProfile;
  wishlist: Wish[];
  chatBlocked: boolean;
}

/** The giver sees who they got and that person's wishlist. Nobody else can. */
export async function getMyAssignment(
  deps: Pick<Deps, 'groups' | 'users' | 'assignments' | 'wishlists'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<MyAssignmentView> {
  const { group, member } = await loadGroupForMember(deps, groupId, actorId);
  if (group.status === 'open') throw new DomainError('DRAW_NOT_DONE', 'draw not done yet');
  const assignment = await deps.assignments.findByGiver(groupId, actorId);
  if (!assignment) throw new DomainError('NOT_FOUND', 'you are not part of this draw');
  const [profiles, wishlist] = await Promise.all([
    profilesById(deps, [assignment.receiverId]),
    deps.wishlists.get(groupId, assignment.receiverId),
  ]);
  if (!member.hasSeenAssignment) await markSeen(deps, group, actorId);
  return {
    groupId,
    drawNumber: assignment.drawNumber,
    recipient: profiles.get(assignment.receiverId) as PublicProfile,
    wishlist: wishlist?.items ?? [],
    chatBlocked: assignment.chatBlocked,
  };
}

async function markSeen(deps: Pick<Deps, 'groups'>, group: Group, actorId: UserId) {
  // Best effort: losing this flag on a race is harmless.
  const next = cloneGroup(group);
  next.members = next.members.map((m) =>
    m.userId === actorId ? { ...m, hasSeenAssignment: true } : m,
  );
  next.version = group.version + 1;
  await deps.groups.save(next);
}

export async function reveal(
  deps: Pick<Deps, 'groups' | 'users' | 'clock' | 'policy' | 'notifications'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<GroupDetailView> {
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    requireStatus(g, 'drawn');
    // Reveal only from the delivery day on (Colombia time), so an organizer
    // cannot use it to peek at the assignments early.
    if (daysBetween(colombiaToday(deps.clock.now()), g.deliveryDate) > 0) {
      throw new DomainError('NOT_REVEALED', 'reveal is available from the delivery day', {
        deliveryDate: g.deliveryDate.toISOString().slice(0, 10),
      });
    }
    g.status = 'revealed';
    g.revealedAt = deps.clock.now();
    return g;
  });
  await deps.notifications.notify(
    group.members.map((m) => m.userId),
    { type: 'revealed', groupId, groupName: group.name },
  );
  return toDetail(deps, group, actorId);
}

export interface RevealView {
  groupId: GroupId;
  /** Who gave to me (null if I did not participate). */
  myGiver: PublicProfile | null;
  pairs: { giver: PublicProfile; receiver: PublicProfile }[];
}

/** After the reveal, every member sees every pair (it's the party moment). */
export async function getReveal(
  deps: Pick<Deps, 'groups' | 'users' | 'assignments'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<RevealView> {
  const { group } = await loadGroupForMember(deps, groupId, actorId);
  if (group.status !== 'revealed') throw new DomainError('NOT_REVEALED', 'not revealed yet');
  const assignments = await deps.assignments.listForGroup(groupId);
  const profiles = await profilesById(deps, [
    ...new Set(assignments.flatMap((a) => [a.giverId, a.receiverId])),
  ]);
  const mine = assignments.find((a) => a.receiverId === actorId);
  return {
    groupId,
    myGiver: mine ? (profiles.get(mine.giverId) as PublicProfile) : null,
    pairs: assignments.map((a) => ({
      giver: profiles.get(a.giverId) as PublicProfile,
      receiver: profiles.get(a.receiverId) as PublicProfile,
    })),
  };
}
