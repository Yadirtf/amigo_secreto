/* eslint-disable @typescript-eslint/no-explicit-any */
import { memoryDeps, type MemoryDeps } from '@entre-nos/domain/testing';
import { createApp, type Container } from '../src/http/app.js';
import { TokenService, type GoogleVerifier } from '../src/infra/auth.js';
import { MemoryPushTokens, MemoryRateLimiter, MemorySessions } from '../src/infra/platform.js';

/** Fake Google: idToken "google-test-token:<sub>:<name>". */
export const fakeGoogle: GoogleVerifier = {
  async verify(idToken) {
    const [prefix, sub, name] = idToken.split(':');
    if (prefix !== 'google-test-token' || !sub) return null;
    return { sub, email: `${sub}@example.com`, name: name ?? null };
  },
};

export function harness(
  opts: { appEnv?: Container['config']['appEnv']; devLoginKey?: string | null } = {},
) {
  const deps: MemoryDeps = memoryDeps({ now: new Date('2026-12-01T15:00:00Z') });
  const sessions = new MemorySessions();
  const rateLimiter = new MemoryRateLimiter();
  const pushTokens = new MemoryPushTokens();
  const container: Container = {
    deps,
    tokens: new TokenService('test-secret-test-secret-test-secret-123', sessions),
    google: fakeGoogle,
    pushTokens,
    rateLimiter,
    config: {
      appEnv: opts.appEnv ?? 'test',
      devLoginKey: opts.devLoginKey === undefined ? 'dev-login-key-for-tests' : opts.devLoginKey,
      androidPackage: 'com.entrenos.amigosecreto',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.entrenos.amigosecreto',
      certFingerprints: ['AA:BB'],
      contactEmail: 'contacto@example.com',
    },
  };
  const app = createApp(() => container);
  // jose checks expiry against the real clock unless told otherwise; keep the
  // test clock close to now for access tokens by using the real time there.
  deps.clock.current = new Date();

  async function call(
    method: string,
    path: string,
    init: { token?: string; body?: unknown; headers?: Record<string, string> } = {},
  ) {
    const headers: Record<string, string> = { ...(init.headers ?? {}) };
    if (init.token) headers.authorization = `Bearer ${init.token}`;
    if (init.body !== undefined) headers['content-type'] = 'application/json';
    const res = await app.request(path, {
      method,
      headers,
      body:
        init.body === undefined
          ? undefined
          : typeof init.body === 'string'
            ? init.body
            : JSON.stringify(init.body),
    });
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json, headers: res.headers, text };
  }

  async function login(sub: string, name = sub) {
    const r = await call('POST', '/v1/auth/google', {
      body: { idToken: `google-test-token:${sub}:${name}` },
    });
    if (r.status !== 200) throw new Error(`login failed ${r.status} ${r.text}`);
    return r.json as { accessToken: string; refreshToken: string; user: { id: string } };
  }

  return { app, deps, container, sessions, rateLimiter, pushTokens, call, login };
}
