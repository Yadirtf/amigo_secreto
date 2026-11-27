/**
 * In-memory adapters for tests (domain unit tests and API tests).
 * Not used in production.
 */
import type { Assignment, ChatMessage, Group, Report, User, Wishlist } from '../entities.js';
import type {
  AssignmentRepository,
  Clock,
  Deps,
  GroupRepository,
  IdGenerator,
  MessageRepository,
  NotificationEvent,
  NotificationService,
  Policy,
  RandomSource,
  ReportRepository,
  UserRepository,
  WishlistRepository,
} from '../ports.js';
import { defaultPolicy } from '../ports.js';
import { generateInviteCode } from '../rules/invite.js';
import { cloneGroup } from '../usecases/shared.js';

/** Deterministic PRNG (mulberry32) for reproducible tests. */
export function seededRandom(seed: number): RandomSource {
  let a = seed >>> 0;
  return {
    int(max: number) {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return Math.floor(r * max);
    },
  };
}

export class FixedClock implements Clock {
  constructor(public current: Date) {}
  now() {
    return new Date(this.current);
  }
  advanceDays(days: number) {
    this.current = new Date(this.current.getTime() + days * 86_400_000);
  }
}

export class SeqIds implements IdGenerator {
  private n = 0;
  constructor(private random: RandomSource) {}
  id() {
    this.n++;
    return `id${String(this.n).padStart(6, '0')}`;
  }
  inviteCode() {
    return generateInviteCode(this.random);
  }
}

export class MemoryUsers implements UserRepository {
  data = new Map<string, User>();
  async findById(id: string) {
    const u = this.data.get(id);
    return u ? { ...u } : null;
  }
  async findManyByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.data.get(id))
      .filter((u): u is User => !!u)
      .map((u) => ({ ...u }));
  }
  async findByProvider(provider: 'google' | 'apple', sub: string) {
    for (const u of this.data.values()) {
      if ((provider === 'google' ? u.googleSub : u.appleSub) === sub) return { ...u };
    }
    return null;
  }
  async create(user: User) {
    this.data.set(user.id, { ...user });
  }
  async update(id: string, patch: Partial<Pick<User, 'name' | 'photo'>>) {
    const u = this.data.get(id);
    if (!u) return null;
    const next = { ...u, ...patch };
    this.data.set(id, next);
    return { ...next };
  }
  async delete(id: string) {
    this.data.delete(id);
  }
}

export class MemoryGroups implements GroupRepository {
  data = new Map<string, Group>();
  /** Set to N to make the next N saves fail (simulates concurrency). */
  failNextSaves = 0;
  async create(group: Group) {
    this.data.set(group.id, cloneGroup(group));
  }
  async findById(id: string) {
    const g = this.data.get(id);
    return g ? cloneGroup(g) : null;
  }
  async findByInviteCode(code: string) {
    for (const g of this.data.values()) if (g.inviteCode === code) return cloneGroup(g);
    return null;
  }
  async listForUser(userId: string) {
    return [...this.data.values()]
      .filter((g) => g.members.some((m) => m.userId === userId))
      .map(cloneGroup);
  }
  async save(group: Group) {
    if (this.failNextSaves > 0) {
      this.failNextSaves--;
      return false;
    }
    const current = this.data.get(group.id);
    if (!current || current.version !== group.version - 1) return false;
    this.data.set(group.id, cloneGroup(group));
    return true;
  }
  async delete(id: string) {
    this.data.delete(id);
  }
  async listDeliveredBefore(date: Date) {
    return [...this.data.values()].filter((g) => g.deliveryDate < date).map((g) => g.id);
  }
  async listPendingAutoReveal(date: Date) {
    return [...this.data.values()]
      .filter((g) => g.status === 'drawn' && g.deliveryDate < date)
      .map(cloneGroup);
  }
  async listDrawnDeliveringBetween(from: Date, to: Date) {
    return [...this.data.values()]
      .filter((g) => g.status === 'drawn' && g.deliveryDate >= from && g.deliveryDate <= to)
      .map(cloneGroup);
  }
}

export class MemoryAssignments implements AssignmentRepository {
  data = new Map<string, Assignment>();
  async replaceForGroup(groupId: string, assignments: Assignment[]) {
    await this.deleteForGroup(groupId);
    for (const a of assignments) this.data.set(a.id, { ...a });
  }
  private find(pred: (a: Assignment) => boolean) {
    for (const a of this.data.values()) if (pred(a)) return { ...a };
    return null;
  }
  async findByGiver(groupId: string, giverId: string) {
    return this.find((a) => a.groupId === groupId && a.giverId === giverId);
  }
  async findByReceiver(groupId: string, receiverId: string) {
    return this.find((a) => a.groupId === groupId && a.receiverId === receiverId);
  }
  async findById(id: string) {
    return this.find((a) => a.id === id);
  }
  async listForGroup(groupId: string) {
    return [...this.data.values()].filter((a) => a.groupId === groupId).map((a) => ({ ...a }));
  }
  async setChatBlocked(id: string, blocked: boolean) {
    const a = this.data.get(id);
    if (a) a.chatBlocked = blocked;
  }
  async deleteForGroup(groupId: string) {
    for (const [id, a] of this.data) if (a.groupId === groupId) this.data.delete(id);
  }
}

export class MemoryMessages implements MessageRepository {
  data: ChatMessage[] = [];
  async add(m: ChatMessage) {
    this.data.push({ ...m });
  }
  async listForThread(threadId: string, limit: number, before?: Date) {
    return this.data
      .filter((m) => m.threadId === threadId && (!before || m.createdAt < before))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((m) => ({ ...m }));
  }
  async countForThreadSince(threadId: string, since: Date) {
    return this.data.filter((m) => m.threadId === threadId && m.createdAt >= since).length;
  }
  async deleteForGroup(groupId: string) {
    this.data = this.data.filter((m) => m.groupId !== groupId);
  }
}

export class MemoryWishlists implements WishlistRepository {
  data = new Map<string, Wishlist>();
  private key(g: string, u: string) {
    return `${g}|${u}`;
  }
  async get(groupId: string, userId: string) {
    const w = this.data.get(this.key(groupId, userId));
    return w ? { ...w, items: w.items.map((i) => ({ ...i })) } : null;
  }
  async put(w: Wishlist) {
    this.data.set(this.key(w.groupId, w.userId), { ...w, items: w.items.map((i) => ({ ...i })) });
  }
  async deleteForGroup(groupId: string) {
    for (const [k, w] of this.data) if (w.groupId === groupId) this.data.delete(k);
  }
  async deleteForUser(groupId: string, userId: string) {
    this.data.delete(this.key(groupId, userId));
  }
}

export class MemoryReports implements ReportRepository {
  data: Report[] = [];
  async add(r: Report) {
    this.data.push({ ...r });
  }
}

export class RecordingNotifications implements NotificationService {
  sent: { userIds: string[]; event: NotificationEvent }[] = [];
  async notify(userIds: readonly string[], event: NotificationEvent) {
    this.sent.push({ userIds: [...userIds], event });
  }
}

export interface MemoryDeps extends Deps {
  clock: FixedClock;
  users: MemoryUsers;
  groups: MemoryGroups;
  assignments: MemoryAssignments;
  messages: MemoryMessages;
  wishlists: MemoryWishlists;
  reports: MemoryReports;
  notifications: RecordingNotifications;
}

export function memoryDeps(
  opts: { seed?: number; now?: Date; policy?: Partial<Policy> } = {},
): MemoryDeps {
  const random = seededRandom(opts.seed ?? 42);
  return {
    clock: new FixedClock(opts.now ?? new Date('2026-12-01T15:00:00Z')),
    random,
    ids: new SeqIds(random),
    users: new MemoryUsers(),
    groups: new MemoryGroups(),
    assignments: new MemoryAssignments(),
    messages: new MemoryMessages(),
    wishlists: new MemoryWishlists(),
    reports: new MemoryReports(),
    notifications: new RecordingNotifications(),
    policy: { ...defaultPolicy, ...opts.policy },
  };
}
