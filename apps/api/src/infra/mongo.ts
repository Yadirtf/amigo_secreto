import type {
  Assignment,
  AssignmentRepository,
  ChatMessage,
  Group,
  GroupRepository,
  MessageRepository,
  Report,
  ReportRepository,
  User,
  UserRepository,
  Wishlist,
  WishlistRepository,
} from '@entre-nos/domain';
import { MongoClient, type Collection, type Db } from 'mongodb';
import type { AssignmentCipher } from './crypto.js';

/**
 * MongoDB adapters. Every query uses typed, primitive values coming from the
 * domain (never raw request objects), and projections are explicit.
 */

// ---------- connection (one client per request, ADR-0013) ----------

/**
 * Workers can't reuse a socket across requests (I/O belongs to the request
 * that opened it), so each request gets its own client and closes it once the
 * response and background work finish. The client connects lazily on the
 * first operation: routes that never touch the database open no socket.
 */
export function newMongoClient(uri: string): MongoClient {
  return new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    connectTimeoutMS: 5_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 10_000,
    // Polling avoids the extra streaming/RTT socket per server.
    serverMonitoringMode: 'poll',
    retryWrites: true,
    appName: 'entre-nos-api',
  });
}

// ---------- documents ----------

type UserDoc = Omit<User, 'id'> & { _id: string };
type GroupDoc = Omit<Group, 'id' | 'exclusions'> & { _id: string; exclusions: string[][] };
interface AssignmentDoc {
  _id: string;
  groupId: string;
  giverId: string;
  receiverLookup: string;
  receiverEnc: string;
  drawNumber: number;
  chatBlocked: boolean;
  createdAt: Date;
}
type MessageDoc = Omit<ChatMessage, 'id'> & { _id: string };
type WishlistDoc = Wishlist & { _id: string };
type ReportDoc = Omit<Report, 'id'> & { _id: string };
export interface SessionDoc {
  _id: string;
  userId: string;
  currentHash: string;
  previousHash: string | null;
  /** Every refresh hash already used in this family (reuse detection, PT-04). */
  usedHashes: string[];
  /** Absolute end of the family, regardless of rotations (PT-13). */
  absoluteExpiresAt: Date;
  rotatedAt: Date;
  expiresAt: Date;
  revoked: boolean;
}
export interface PushTokenDoc {
  _id: string;
  userId: string;
  updatedAt: Date;
}
interface CounterDoc {
  _id: string;
  n: number;
  expiresAt: Date;
}

export interface Collections {
  users: Collection<UserDoc>;
  groups: Collection<GroupDoc>;
  assignments: Collection<AssignmentDoc>;
  messages: Collection<MessageDoc>;
  wishlists: Collection<WishlistDoc>;
  reports: Collection<ReportDoc>;
  sessions: Collection<SessionDoc>;
  pushTokens: Collection<PushTokenDoc>;
  counters: Collection<CounterDoc>;
}

export function collections(db: Db): Collections {
  return {
    users: db.collection('users'),
    groups: db.collection('groups'),
    assignments: db.collection('assignments'),
    messages: db.collection('messages'),
    wishlists: db.collection('wishlists'),
    reports: db.collection('reports'),
    sessions: db.collection('sessions'),
    pushTokens: db.collection('push_tokens'),
    counters: db.collection('counters'),
  };
}

/** Idempotent; run on deploy (scripts/ensure-indexes) and in tests. */
export async function ensureIndexes(c: Collections): Promise<void> {
  await Promise.all([
    c.users.createIndex(
      { googleSub: 1 },
      { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
    ),
    c.users.createIndex(
      { appleSub: 1 },
      { unique: true, partialFilterExpression: { appleSub: { $type: 'string' } } },
    ),
    c.groups.createIndex({ inviteCode: 1 }, { unique: true }),
    c.groups.createIndex({ 'members.userId': 1 }),
    c.groups.createIndex({ status: 1, deliveryDate: 1 }),
    c.groups.createIndex({ deliveryDate: 1 }),
    c.assignments.createIndex({ groupId: 1, giverId: 1 }, { unique: true }),
    c.assignments.createIndex({ groupId: 1, receiverLookup: 1 }, { unique: true }),
    c.messages.createIndex({ threadId: 1, createdAt: -1 }),
    c.messages.createIndex({ groupId: 1 }),
    c.wishlists.createIndex({ groupId: 1 }),
    c.sessions.createIndex({ currentHash: 1 }, { unique: true }),
    c.sessions.createIndex({ usedHashes: 1 }),
    c.sessions.createIndex({ userId: 1 }),
    c.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.pushTokens.createIndex({ userId: 1 }),
    c.counters.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

// ---------- mappers ----------

const toUser = ({ _id, ...d }: UserDoc): User => ({ id: _id, ...d });
const toGroup = ({ _id, exclusions, ...d }: GroupDoc): Group => ({
  id: _id,
  ...d,
  exclusions: exclusions.map((p): [string, string] => [p[0] as string, p[1] as string]),
});
const fromGroup = ({ id, exclusions, ...g }: Group): GroupDoc => ({
  _id: id,
  ...g,
  exclusions: exclusions.map(([a, b]) => [a, b]),
});

// ---------- repositories ----------

export class MongoUsers implements UserRepository {
  constructor(private readonly c: Collections) {}
  async findById(id: string) {
    const d = await this.c.users.findOne({ _id: id });
    return d ? toUser(d) : null;
  }
  async findManyByIds(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return (await this.c.users.find({ _id: { $in: [...ids] } }).toArray()).map(toUser);
  }
  async findByProvider(provider: 'google' | 'apple', sub: string) {
    const d = await this.c.users.findOne(
      provider === 'google' ? { googleSub: sub } : { appleSub: sub },
    );
    return d ? toUser(d) : null;
  }
  async create({ id, ...u }: User) {
    await this.c.users.insertOne({ _id: id, ...u });
  }
  async update(id: string, patch: Partial<Pick<User, 'name' | 'photo'>>) {
    const set: Partial<Pick<UserDoc, 'name' | 'photo'>> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.photo !== undefined) set.photo = patch.photo;
    const d = await this.c.users.findOneAndUpdate(
      { _id: id },
      { $set: set },
      { returnDocument: 'after' },
    );
    return d ? toUser(d) : null;
  }
  async delete(id: string) {
    await this.c.users.deleteOne({ _id: id });
    await this.c.sessions.deleteMany({ userId: id });
    await this.c.pushTokens.deleteMany({ userId: id });
  }
}

export class MongoGroups implements GroupRepository {
  constructor(private readonly c: Collections) {}
  async create(group: Group) {
    await this.c.groups.insertOne(fromGroup(group));
  }
  async findById(id: string) {
    const d = await this.c.groups.findOne({ _id: id });
    return d ? toGroup(d) : null;
  }
  async findByInviteCode(code: string) {
    const d = await this.c.groups.findOne({ inviteCode: code });
    return d ? toGroup(d) : null;
  }
  async listForUser(userId: string) {
    return (await this.c.groups.find({ 'members.userId': userId }).limit(100).toArray()).map(
      toGroup,
    );
  }
  async save(group: Group) {
    const doc = fromGroup(group);
    const r = await this.c.groups.replaceOne({ _id: doc._id, version: group.version - 1 }, doc);
    return r.modifiedCount === 1;
  }
  async delete(id: string) {
    await this.c.groups.deleteOne({ _id: id });
  }
  async listDeliveredBefore(date: Date) {
    const docs = await this.c.groups
      .find({ deliveryDate: { $lt: date } }, { projection: { _id: 1 } })
      .limit(500)
      .toArray();
    return docs.map((d) => d._id);
  }
  async listPendingAutoReveal(date: Date) {
    return (
      await this.c.groups
        .find({ status: 'drawn', deliveryDate: { $lt: date } })
        .limit(500)
        .toArray()
    ).map(toGroup);
  }
  async listDrawnDeliveringBetween(from: Date, to: Date) {
    return (
      await this.c.groups
        .find({ status: 'drawn', deliveryDate: { $gte: from, $lte: to } })
        .limit(1000)
        .toArray()
    ).map(toGroup);
  }
}

export class MongoAssignments implements AssignmentRepository {
  constructor(
    private readonly c: Collections,
    private readonly cipher: AssignmentCipher,
  ) {}

  private async toAssignment(d: AssignmentDoc): Promise<Assignment> {
    return {
      id: d._id,
      groupId: d.groupId,
      giverId: d.giverId,
      receiverId: await this.cipher.decrypt(d.groupId, d.receiverEnc),
      drawNumber: d.drawNumber,
      chatBlocked: d.chatBlocked,
      createdAt: d.createdAt,
    };
  }

  async replaceForGroup(groupId: string, assignments: Assignment[]) {
    const docs: AssignmentDoc[] = await Promise.all(
      assignments.map(async (a) => ({
        _id: a.id,
        groupId,
        giverId: a.giverId,
        receiverLookup: await this.cipher.lookup(groupId, a.receiverId),
        receiverEnc: await this.cipher.encrypt(groupId, a.receiverId),
        drawNumber: a.drawNumber,
        chatBlocked: a.chatBlocked,
        createdAt: a.createdAt,
      })),
    );
    await this.c.assignments.deleteMany({ groupId });
    if (docs.length > 0) await this.c.assignments.insertMany(docs, { ordered: true });
  }
  async findByGiver(groupId: string, giverId: string) {
    const d = await this.c.assignments.findOne({ groupId, giverId });
    return d ? this.toAssignment(d) : null;
  }
  async findByReceiver(groupId: string, receiverId: string) {
    const receiverLookup = await this.cipher.lookup(groupId, receiverId);
    const d = await this.c.assignments.findOne({ groupId, receiverLookup });
    return d ? this.toAssignment(d) : null;
  }
  async findById(id: string) {
    const d = await this.c.assignments.findOne({ _id: id });
    return d ? this.toAssignment(d) : null;
  }
  async listForGroup(groupId: string) {
    const docs = await this.c.assignments.find({ groupId }).toArray();
    return Promise.all(docs.map((d) => this.toAssignment(d)));
  }
  async setChatBlocked(id: string, blocked: boolean) {
    await this.c.assignments.updateOne({ _id: id }, { $set: { chatBlocked: blocked } });
  }
  async deleteForGroup(groupId: string) {
    await this.c.assignments.deleteMany({ groupId });
  }
}

export class MongoMessages implements MessageRepository {
  constructor(private readonly c: Collections) {}
  async add({ id, ...m }: ChatMessage) {
    await this.c.messages.insertOne({ _id: id, ...m });
  }
  async listForThread(threadId: string, limit: number, before?: Date) {
    const filter = before ? { threadId, createdAt: { $lt: before } } : { threadId };
    const docs = await this.c.messages.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    return docs.map(({ _id, ...m }) => ({ id: _id, ...m }));
  }
  async countForThreadSince(threadId: string, since: Date) {
    return this.c.messages.countDocuments({ threadId, createdAt: { $gte: since } });
  }
  async deleteForGroup(groupId: string) {
    await this.c.messages.deleteMany({ groupId });
  }
}

export class MongoWishlists implements WishlistRepository {
  constructor(private readonly c: Collections) {}
  private key(groupId: string, userId: string) {
    return `${groupId}|${userId}`;
  }
  async get(groupId: string, userId: string) {
    const d = await this.c.wishlists.findOne({ _id: this.key(groupId, userId) });
    if (!d) return null;
    return { groupId: d.groupId, userId: d.userId, items: d.items, updatedAt: d.updatedAt };
  }
  async put(w: Wishlist) {
    const _id = this.key(w.groupId, w.userId);
    await this.c.wishlists.replaceOne({ _id }, { ...w }, { upsert: true });
  }
  async deleteForGroup(groupId: string) {
    await this.c.wishlists.deleteMany({ groupId });
  }
  async deleteForUser(groupId: string, userId: string) {
    await this.c.wishlists.deleteOne({ _id: this.key(groupId, userId) });
  }
}

export class MongoReports implements ReportRepository {
  constructor(private readonly c: Collections) {}
  async add({ id, ...r }: Report) {
    await this.c.reports.insertOne({ _id: id, ...r });
  }
}
