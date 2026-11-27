import type {
  Assignment,
  AssignmentId,
  ChatMessage,
  Group,
  GroupId,
  Report,
  User,
  UserId,
  Wishlist,
} from './entities.js';

/** Ports (interfaces) the application layer depends on. Infrastructure implements them. */

export interface Clock {
  now(): Date;
}

export interface RandomSource {
  /** Uniform integer in [0, maxExclusive). Must be cryptographically secure in production. */
  int(maxExclusive: number): number;
}

export interface IdGenerator {
  /** Opaque, unguessable id (>= 128 bits of entropy). */
  id(): string;
  /** Human-typeable invite code (see rules/invite.ts). */
  inviteCode(): string;
}

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findManyByIds(ids: readonly UserId[]): Promise<User[]>;
  findByProvider(provider: 'google' | 'apple', sub: string): Promise<User | null>;
  create(user: User): Promise<void>;
  update(id: UserId, patch: Partial<Pick<User, 'name' | 'photo'>>): Promise<User | null>;
  delete(id: UserId): Promise<void>;
}

export interface GroupRepository {
  create(group: Group): Promise<void>;
  findById(id: GroupId): Promise<Group | null>;
  findByInviteCode(code: string): Promise<Group | null>;
  listForUser(userId: UserId): Promise<Group[]>;
  /**
   * Saves the group only if the stored version equals `group.version - 1`.
   * Returns false on a concurrent modification.
   */
  save(group: Group): Promise<boolean>;
  delete(id: GroupId): Promise<void>;
  /** Groups whose delivery date is before `date` (retention purge). */
  listDeliveredBefore(date: Date): Promise<GroupId[]>;
  /** Drawn groups whose delivery date is before `date` and are not revealed yet. */
  listPendingAutoReveal(date: Date): Promise<Group[]>;
  /** Drawn groups whose delivery date is in [from, to]. */
  listDrawnDeliveringBetween(from: Date, to: Date): Promise<Group[]>;
}

export interface AssignmentRepository {
  /** Atomically replaces every assignment of the group. */
  replaceForGroup(groupId: GroupId, assignments: Assignment[]): Promise<void>;
  findByGiver(groupId: GroupId, giverId: UserId): Promise<Assignment | null>;
  findByReceiver(groupId: GroupId, receiverId: UserId): Promise<Assignment | null>;
  findById(id: AssignmentId): Promise<Assignment | null>;
  listForGroup(groupId: GroupId): Promise<Assignment[]>;
  setChatBlocked(id: AssignmentId, blocked: boolean): Promise<void>;
  deleteForGroup(groupId: GroupId): Promise<void>;
}

export interface MessageRepository {
  add(message: ChatMessage): Promise<void>;
  /** Newest first, strictly before `before` when given. */
  listForThread(threadId: AssignmentId, limit: number, before?: Date): Promise<ChatMessage[]>;
  countForThreadSince(threadId: AssignmentId, since: Date): Promise<number>;
  deleteForGroup(groupId: GroupId): Promise<void>;
}

export interface WishlistRepository {
  get(groupId: GroupId, userId: UserId): Promise<Wishlist | null>;
  put(wishlist: Wishlist): Promise<void>;
  deleteForGroup(groupId: GroupId): Promise<void>;
  deleteForUser(groupId: GroupId, userId: UserId): Promise<void>;
}

export interface ReportRepository {
  add(report: Report): Promise<void>;
}

export type NotificationEvent =
  | { type: 'draw_done'; groupId: GroupId; groupName: string; redraw: boolean }
  | { type: 'group_reopened'; groupId: GroupId; groupName: string }
  | { type: 'new_message'; groupId: GroupId; groupName: string; side: 'giver' | 'receiver' }
  | { type: 'revealed'; groupId: GroupId; groupName: string }
  | { type: 'countdown'; groupId: GroupId; groupName: string; daysLeft: number }
  | { type: 'member_joined'; groupId: GroupId; groupName: string; memberName: string };

export interface NotificationService {
  /**
   * Fire-and-forget. Payloads must never contain the identity of an anonymous
   * sender nor any assignment detail.
   */
  notify(userIds: readonly UserId[], event: NotificationEvent): Promise<void>;
}

export interface Deps {
  clock: Clock;
  random: RandomSource;
  ids: IdGenerator;
  users: UserRepository;
  groups: GroupRepository;
  assignments: AssignmentRepository;
  messages: MessageRepository;
  wishlists: WishlistRepository;
  reports: ReportRepository;
  notifications: NotificationService;
  policy: Policy;
}

/** Server-side switches (e.g. the free-plan member limit, off in v1). */
export interface Policy {
  /** null = unlimited. */
  maxMembersFree: number | null;
  maxMembersPremium: number;
  /** Absolute cap per group regardless of plan. */
  maxMembersHard: number;
  maxRedraws: number;
  inviteTtlDays: number;
  retentionDays: number;
}

export const defaultPolicy: Policy = {
  maxMembersFree: null,
  maxMembersPremium: 100,
  maxMembersHard: 100,
  maxRedraws: 2,
  inviteTtlDays: 60,
  retentionDays: 60,
};
