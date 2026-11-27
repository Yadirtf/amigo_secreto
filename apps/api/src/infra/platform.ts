/**
 * API-only ports (not business rules): sessions, push tokens, rate limits.
 * Each has a MongoDB implementation and an in-memory one for tests.
 */
import type { Collections, PushTokenDoc, SessionDoc } from './mongo.js';

export interface SessionStore {
  create(doc: SessionDoc): Promise<void>;
  findByCurrent(hash: string): Promise<SessionDoc | null>;
  findByPrevious(hash: string): Promise<SessionDoc | null>;
  /** Atomic rotation: only succeeds if `currentHash` is still `expected`. */
  rotate(id: string, expected: string, next: string, now: Date, expiresAt: Date): Promise<boolean>;
  revoke(id: string): Promise<void>;
  isActive(id: string, now: Date): Promise<boolean>;
}

export interface PushTokenStore {
  put(token: string, userId: string, now: Date): Promise<void>;
  listForUsers(userIds: readonly string[]): Promise<{ token: string; userId: string }[]>;
  remove(tokens: readonly string[]): Promise<void>;
  removeForUser(userId: string): Promise<void>;
}

export interface RateLimiter {
  /** Returns true when the action is allowed (and counts it). */
  hit(key: string, limit: number, windowSeconds: number, now: Date): Promise<boolean>;
}

// ---------- MongoDB ----------

export class MongoSessions implements SessionStore {
  constructor(private readonly c: Collections) {}
  async create(doc: SessionDoc) {
    await this.c.sessions.insertOne(doc);
  }
  findByCurrent(hash: string) {
    return this.c.sessions.findOne({ currentHash: hash });
  }
  findByPrevious(hash: string) {
    return this.c.sessions.findOne({ previousHash: hash });
  }
  async rotate(id: string, expected: string, next: string, now: Date, expiresAt: Date) {
    const r = await this.c.sessions.updateOne(
      { _id: id, currentHash: expected, revoked: false },
      { $set: { currentHash: next, previousHash: expected, rotatedAt: now, expiresAt } },
    );
    return r.modifiedCount === 1;
  }
  async revoke(id: string) {
    await this.c.sessions.updateOne({ _id: id }, { $set: { revoked: true } });
  }
  async isActive(id: string, now: Date) {
    const d = await this.c.sessions.findOne(
      { _id: id },
      { projection: { revoked: 1, expiresAt: 1 } },
    );
    return !!d && !d.revoked && d.expiresAt > now;
  }
}

export class MongoPushTokens implements PushTokenStore {
  constructor(private readonly c: Collections) {}
  async put(token: string, userId: string, now: Date) {
    await this.c.pushTokens.replaceOne(
      { _id: token },
      { userId, updatedAt: now },
      { upsert: true },
    );
  }
  async listForUsers(userIds: readonly string[]) {
    if (userIds.length === 0) return [];
    const docs = await this.c.pushTokens.find({ userId: { $in: [...userIds] } }).toArray();
    return docs.map((d: PushTokenDoc) => ({ token: d._id, userId: d.userId }));
  }
  async remove(tokens: readonly string[]) {
    if (tokens.length) await this.c.pushTokens.deleteMany({ _id: { $in: [...tokens] } });
  }
  async removeForUser(userId: string) {
    await this.c.pushTokens.deleteMany({ userId });
  }
}

/** Fixed-window counters with a TTL index. Exact and free (no paid features). */
export class MongoRateLimiter implements RateLimiter {
  constructor(private readonly c: Collections) {}
  async hit(key: string, limit: number, windowSeconds: number, now: Date) {
    const window = Math.floor(now.getTime() / (windowSeconds * 1000));
    const _id = `${key}:${window}`;
    const doc = await this.c.counters.findOneAndUpdate(
      { _id },
      {
        $inc: { n: 1 },
        $setOnInsert: { expiresAt: new Date((window + 1) * windowSeconds * 1000 + 60_000) },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return (doc?.n ?? 1) <= limit;
  }
}

// ---------- in memory (tests) ----------

export class MemorySessions implements SessionStore {
  data = new Map<string, SessionDoc>();
  async create(doc: SessionDoc) {
    this.data.set(doc._id, { ...doc });
  }
  async findByCurrent(hash: string) {
    for (const d of this.data.values()) if (d.currentHash === hash) return { ...d };
    return null;
  }
  async findByPrevious(hash: string) {
    for (const d of this.data.values()) if (d.previousHash === hash) return { ...d };
    return null;
  }
  async rotate(id: string, expected: string, next: string, now: Date, expiresAt: Date) {
    const d = this.data.get(id);
    if (!d || d.revoked || d.currentHash !== expected) return false;
    Object.assign(d, { currentHash: next, previousHash: expected, rotatedAt: now, expiresAt });
    return true;
  }
  async revoke(id: string) {
    const d = this.data.get(id);
    if (d) d.revoked = true;
  }
  async isActive(id: string, now: Date) {
    const d = this.data.get(id);
    return !!d && !d.revoked && d.expiresAt > now;
  }
}

export class MemoryPushTokens implements PushTokenStore {
  data = new Map<string, string>();
  async put(token: string, userId: string) {
    this.data.set(token, userId);
  }
  async listForUsers(userIds: readonly string[]) {
    return [...this.data]
      .filter(([, u]) => userIds.includes(u))
      .map(([token, userId]) => ({ token, userId }));
  }
  async remove(tokens: readonly string[]) {
    for (const t of tokens) this.data.delete(t);
  }
  async removeForUser(userId: string) {
    for (const [t, u] of this.data) if (u === userId) this.data.delete(t);
  }
}

export class MemoryRateLimiter implements RateLimiter {
  counts = new Map<string, number>();
  async hit(key: string, limit: number, windowSeconds: number, now: Date) {
    const k = `${key}:${Math.floor(now.getTime() / (windowSeconds * 1000))}`;
    const n = (this.counts.get(k) ?? 0) + 1;
    this.counts.set(k, n);
    return n <= limit;
  }
}
