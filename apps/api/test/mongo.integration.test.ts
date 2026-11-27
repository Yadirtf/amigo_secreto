/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests against a real MongoDB (CI service container).
 * Skipped locally unless MONGODB_TEST_URI is set.
 */
import { memoryDeps } from '@entre-nos/domain/testing';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, type Container } from '../src/http/app.js';
import { TokenService } from '../src/infra/auth.js';
import { AssignmentCipher, cryptoIds, cryptoRandom } from '../src/infra/crypto.js';
import {
  collections,
  ensureIndexes,
  MongoAssignments,
  MongoGroups,
  MongoMessages,
  MongoReports,
  MongoUsers,
  MongoWishlists,
  type Collections,
} from '../src/infra/mongo.js';
import { MongoPushTokens, MongoRateLimiter, MongoSessions } from '../src/infra/platform.js';
import { fakeGoogle } from './harness.js';

const uri = process.env.MONGODB_TEST_URI;
const d = uri ? describe : describe.skip;

d('MongoDB adapters (integration)', () => {
  let client: MongoClient;
  let c: Collections;
  let call: (
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ) => Promise<{ status: number; json: any; text: string }>;

  beforeAll(async () => {
    client = new MongoClient(uri as string);
    await client.connect();
    const db = client.db(`entrenos_test_${Date.now()}`);
    c = collections(db);
    await ensureIndexes(c);
    const cipher = await AssignmentCipher.fromSecret(btoa('k'.repeat(32)));
    const pushTokens = new MongoPushTokens(c);
    const base = memoryDeps();
    const container: Container = {
      deps: {
        ...base,
        clock: { now: () => new Date() },
        random: cryptoRandom,
        ids: cryptoIds,
        users: new MongoUsers(c),
        groups: new MongoGroups(c),
        assignments: new MongoAssignments(c, cipher),
        messages: new MongoMessages(c),
        wishlists: new MongoWishlists(c),
        reports: new MongoReports(c),
      },
      tokens: new TokenService('integration-secret-integration-secret', new MongoSessions(c)),
      google: fakeGoogle,
      pushTokens,
      rateLimiter: new MongoRateLimiter(c),
      config: {
        appEnv: 'test',
        devLoginKey: null,
        androidPackage: 'com.entrenos.amigosecreto',
        playStoreUrl: 'https://play.google.com',
        certFingerprints: [],
      },
    };
    const app = createApp(() => container);
    call = async (method, path, token, body) => {
      const res = await app.request(path, {
        method,
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, json: text ? JSON.parse(text) : null, text };
    };
  });

  afterAll(async () => {
    await client?.db(c.users.dbName).dropDatabase();
    await client?.close();
  });

  const login = async (sub: string) =>
    (
      await call('POST', '/v1/auth/google', undefined, {
        idToken: `google-test-token:${sub}:${sub}`,
      })
    ).json;

  it('full flow on real MongoDB; assignments are encrypted at rest', async () => {
    const org = await login('org');
    const g = await call('POST', '/v1/groups', org.accessToken, {
      name: 'Integración',
      deliveryDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10),
      budgetCop: 30_000,
    });
    expect(g.status).toBe(201);
    const people = [org];
    for (const s of ['a', 'b', 'c']) {
      const p = await login(s);
      expect(
        (await call('POST', '/v1/groups/join', p.accessToken, { code: g.json.inviteCode })).status,
      ).toBe(200);
      people.push(p);
    }
    expect((await call('POST', `/v1/groups/${g.json.id}/draw`, org.accessToken)).status).toBe(200);

    const raw = await c.assignments.find({ groupId: g.json.id }).toArray();
    expect(raw).toHaveLength(4);
    const ids = people.map((p) => p.user.id);
    for (const doc of raw) {
      const json = JSON.stringify({ ...doc, giverId: undefined });
      for (const id of ids) expect(json).not.toContain(id);
    }

    const receivers = new Set<string>();
    for (const p of people) {
      const a = await call('GET', `/v1/groups/${g.json.id}/assignment`, p.accessToken);
      expect(a.status).toBe(200);
      expect(a.json.recipient.id).not.toBe(p.user.id);
      receivers.add(a.json.recipient.id);
    }
    expect(receivers.size).toBe(4);

    const a0 = await call('GET', `/v1/groups/${g.json.id}/assignment`, org.accessToken);
    const recipient = people.find((p) => p.user.id === a0.json.recipient.id);
    await call('POST', `/v1/groups/${g.json.id}/chat/giver/messages`, org.accessToken, {
      text: 'Hola 👋',
    });
    const inbox = await call('GET', `/v1/groups/${g.json.id}/chat/receiver`, recipient.accessToken);
    expect(inbox.json.messages[0].text).toBe('Hola 👋');
    expect(inbox.text).not.toContain(org.user.id);
  });

  it('optimistic concurrency rejects stale saves', async () => {
    const groups = new MongoGroups(c);
    const users = new MongoUsers(c);
    expect(await users.findManyByIds([])).toEqual([]);
    const all = await c.groups.find().toArray();
    const g = await groups.findById(all[0]!._id);
    expect(await groups.save({ ...g!, version: g!.version + 1 })).toBe(true);
    expect(await groups.save({ ...g!, version: g!.version + 1 })).toBe(false);
  });

  it('rate limiter counts exactly within a window', async () => {
    const rl = new MongoRateLimiter(c);
    const now = new Date();
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rl.hit('test-key', 3, 60, now));
    expect(results).toEqual([true, true, true, false]);
  });

  it('refresh token rotation works on Mongo', async () => {
    const s = await login('rot');
    const r = await call('POST', '/v1/auth/refresh', undefined, { refreshToken: s.refreshToken });
    expect(r.status).toBe(200);
    expect(
      (await call('POST', '/v1/auth/refresh', undefined, { refreshToken: r.json.refreshToken }))
        .status,
    ).toBe(200);
  });
});
