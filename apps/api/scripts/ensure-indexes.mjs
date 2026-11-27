// Creates MongoDB indexes (idempotent). Run in CI before deploying:
//   MONGODB_URI=... node apps/api/scripts/ensure-indexes.mjs
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
await client.connect();
const db = client.db();
const t0 = Date.now();
const idx = (name, spec, opts = {}) => db.collection(name).createIndex(spec, opts);
await Promise.all([
  idx(
    'users',
    { googleSub: 1 },
    { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
  ),
  idx(
    'users',
    { appleSub: 1 },
    { unique: true, partialFilterExpression: { appleSub: { $type: 'string' } } },
  ),
  idx('groups', { inviteCode: 1 }, { unique: true }),
  idx('groups', { 'members.userId': 1 }),
  idx('groups', { status: 1, deliveryDate: 1 }),
  idx('groups', { deliveryDate: 1 }),
  idx('assignments', { groupId: 1, giverId: 1 }, { unique: true }),
  idx('assignments', { groupId: 1, receiverLookup: 1 }, { unique: true }),
  idx('messages', { threadId: 1, createdAt: -1 }),
  idx('messages', { groupId: 1 }),
  idx('wishlists', { groupId: 1 }),
  idx('sessions', { currentHash: 1 }, { unique: true }),
  idx('sessions', { previousHash: 1 }),
  idx('sessions', { userId: 1 }),
  idx('sessions', { expiresAt: 1 }, { expireAfterSeconds: 0 }),
  idx('push_tokens', { userId: 1 }),
  idx('counters', { expiresAt: 1 }, { expireAfterSeconds: 0 }),
]);
console.log(`indexes ok in ${Date.now() - t0} ms (db: ${db.databaseName})`);
await client.close();
