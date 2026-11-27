import { DurableObject } from 'cloudflare:workers';
import { MongoClient } from 'mongodb';

interface Env {
  MONGODB_URI: string;
  SPIKE_KEY: string;
  GATEWAY: DurableObjectNamespace<MongoGateway>;
}

type Timings = Record<string, number>;

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

/** insert + find + delete on a throwaway document, timed. */
async function roundTrip(c: MongoClient, ms: Timings): Promise<boolean> {
  const col = c.db('entrenos_spike').collection<{ _id: string; n: number; at: Date }>('spike');
  const id = crypto.randomUUID();
  let t = Date.now();
  await col.insertOne({ _id: id, n: Math.random(), at: new Date() });
  ms.insert = Date.now() - t;
  t = Date.now();
  const doc = await col.findOne({ _id: id });
  ms.find = Date.now() - t;
  t = Date.now();
  await col.deleteOne({ _id: id });
  ms.delete = Date.now() - t;
  return doc?._id === id;
}

/** Where the Atlas node lives (Atlas tags every node with provider and region). */
async function atlasRegion(c: MongoClient): Promise<unknown> {
  const hello = (await c.db('admin').command({ hello: 1 })) as { tags?: unknown; me?: string };
  return hello.tags ?? null;
}

const errorJson = (e: unknown) =>
  Response.json(
    { ok: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
    { status: 500 },
  );

/**
 * Strategy B: a Durable Object keeps one MongoClient alive between requests.
 * Unlike plain Workers, a Durable Object may reuse I/O across the requests it
 * serves, so only the first request after an eviction pays the handshake.
 */
export class MongoGateway extends DurableObject<Env> {
  private client: MongoClient | null = null;

  async measure(): Promise<{ ok: boolean; reused: boolean; ms: Timings }> {
    const ms: Timings = {};
    const reused = this.client !== null;
    const t = Date.now();
    if (!this.client) {
      const c = newClient(this.env.MONGODB_URI);
      await c.connect();
      this.client = c;
    }
    ms.connect = Date.now() - t;
    try {
      const ok = await roundTrip(this.client, ms);
      return { ok, reused, ms };
    } catch (e) {
      const c = this.client;
      this.client = null;
      await c.close().catch(() => undefined);
      throw e;
    }
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.headers.get('x-spike-key') !== env.SPIKE_KEY)
      return new Response('no', { status: 403 });
    const colo = (req as unknown as { cf?: { colo?: string } }).cf?.colo ?? null;
    const path = new URL(req.url).pathname;
    const t0 = Date.now();

    if (path === '/do') {
      try {
        const stub = env.GATEWAY.get(env.GATEWAY.idFromName('main'));
        const r = await stub.measure();
        return Response.json({
          ...r,
          strategy: 'durable-object',
          ms: { ...r.ms, total: Date.now() - t0 },
          colo,
        });
      } catch (e) {
        return errorJson(e);
      }
    }

    // Strategy A: one client per request (ADR-0013).
    const c = newClient(env.MONGODB_URI);
    try {
      const ms: Timings = {};
      await c.connect();
      ms.connect = Date.now() - t0;
      const region = path === '/region' ? await atlasRegion(c) : undefined;
      const ok = await roundTrip(c, ms);
      ms.total = Date.now() - t0;
      return Response.json({ ok, strategy: 'client-per-request', ms, colo, region });
    } catch (e) {
      return errorJson(e);
    } finally {
      ctx.waitUntil(c.close());
    }
  },
};
