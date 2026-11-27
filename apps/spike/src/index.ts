import { MongoClient } from 'mongodb';

interface Env {
  MONGODB_URI: string;
  SPIKE_KEY: string;
}

// One client per request: Workers can't reuse a socket across requests
// (ADR-0013). The spike measures what that handshake costs against Atlas.
function newClient(uri: string): MongoClient {
  return new MongoClient(uri, {
    maxPoolSize: 1,
    minPoolSize: 0,
    connectTimeoutMS: 5_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 10_000,
    serverMonitoringMode: 'poll',
    retryWrites: true,
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.headers.get('x-spike-key') !== env.SPIKE_KEY)
      return new Response('no', { status: 403 });
    const t0 = Date.now();
    const c = newClient(env.MONGODB_URI);
    try {
      await c.connect();
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
        strategy: 'client-per-request',
        ms: { connect: t1 - t0, insert: t2 - t1, find: t3 - t2, delete: t4 - t3, total: t4 - t0 },
        colo: (req as unknown as { cf?: { colo?: string } }).cf?.colo ?? null,
      });
    } catch (e) {
      return Response.json(
        { ok: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
        { status: 500 },
      );
    } finally {
      ctx.waitUntil(c.close());
    }
  },
};
