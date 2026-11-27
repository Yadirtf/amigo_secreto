import { MongoClient } from 'mongodb';

interface Env {
  MONGODB_URI: string;
  SPIKE_KEY: string;
}

// One client per isolate, reused across requests (connection strategy under test).
let client: MongoClient | null = null;
let connectedAt = 0;

function getClient(uri: string): MongoClient {
  if (!client) {
    client = new MongoClient(uri, {
      maxPoolSize: 3,
      minPoolSize: 0,
      connectTimeoutMS: 5_000,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 10_000,
      maxIdleTimeMS: 30_000,
      retryWrites: true,
    });
  }
  return client;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.headers.get('x-spike-key') !== env.SPIKE_KEY)
      return new Response('no', { status: 403 });
    const t0 = Date.now();
    const reused = client !== null;
    try {
      const c = getClient(env.MONGODB_URI);
      await c.connect();
      if (!connectedAt) connectedAt = Date.now();
      const t1 = Date.now();
      const col = c.db().collection<{ _id: string; n: number; at: Date }>('spike');
      const id = crypto.randomUUID();
      await col.insertOne({ _id: id, n: Math.random(), at: new Date() });
      const t2 = Date.now();
      const doc = await col.findOne({ _id: id });
      const t3 = Date.now();
      await col.deleteOne({ _id: id });
      const t4 = Date.now();
      return Response.json({
        ok: doc?._id === id,
        reusedClient: reused,
        ms: { connect: t1 - t0, insert: t2 - t1, find: t3 - t2, delete: t4 - t3, total: t4 - t0 },
        colo: (req as unknown as { cf?: { colo?: string } }).cf?.colo ?? null,
      });
    } catch (e) {
      client = null;
      return Response.json(
        { ok: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
        { status: 500 },
      );
    }
  },
};
