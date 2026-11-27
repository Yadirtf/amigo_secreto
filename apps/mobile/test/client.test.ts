import { GroupList, Ok } from '@entre-nos/contracts';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient, type TokenSource } from '../src/api/client';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function tokens(
  initial: string | null,
  next: string | null = 'fresh',
): TokenSource & {
  refresh: ReturnType<typeof vi.fn>;
} {
  let current = initial;
  const refresh = vi.fn(async () => {
    await new Promise((r) => setTimeout(r, 10));
    current = next;
    return next;
  });
  return { getAccessToken: () => current, refresh };
}

const groups = { groups: [] };

describe('api client', () => {
  it('attaches the bearer token and validates the response', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc');
      return json(200, groups);
    });
    const api = createApiClient({
      baseUrl: 'https://api.test/',
      tokens: tokens('abc'),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(api.request('GET', '/v1/groups', { schema: GroupList })).resolves.toEqual(groups);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.test/v1/groups');
  });

  it('refreshes once (single flight) on concurrent 401s and retries', async () => {
    const t = tokens('old');
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === 'Bearer fresh'
        ? json(200, groups)
        : json(401, { error: { code: 'UNAUTHORIZED', message: 'Sesión vencida' } });
    });
    const api = createApiClient({
      baseUrl: 'https://api.test',
      tokens: t,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const results = await Promise.all([
      api.request('GET', '/v1/groups', { schema: GroupList }),
      api.request('GET', '/v1/groups', { schema: GroupList }),
      api.request('GET', '/v1/groups', { schema: GroupList }),
    ]);
    expect(results).toHaveLength(3);
    expect(t.refresh).toHaveBeenCalledTimes(1);
  });

  it('gives up with UNAUTHORIZED when the refresh fails', async () => {
    const t = tokens('old', null);
    const fetchImpl = vi.fn(async () =>
      json(401, { error: { code: 'UNAUTHORIZED', message: 'No' } }),
    );
    const api = createApiClient({
      baseUrl: 'https://api.test',
      tokens: t,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(api.request('GET', '/v1/groups', { schema: GroupList })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('parses the ApiError envelope with details and Retry-After', async () => {
    const fetchImpl = vi.fn(async () =>
      json(
        429,
        { error: { code: 'RATE_LIMITED', message: 'Vas muy rápido', details: { a: 1 } } },
        { 'Retry-After': '30' },
      ),
    );
    const api = createApiClient({
      baseUrl: 'https://api.test',
      tokens: tokens('abc'),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const err = await api
      .request('POST', '/v1/groups/join', { schema: Ok, body: { code: 'x' } })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      serverMessage: 'Vas muy rápido',
      retryAfterSec: 30,
      details: { a: 1 },
    });
  });

  it('maps network failures and timeouts', async () => {
    const failing = vi.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const api = createApiClient({
      baseUrl: 'https://api.test',
      tokens: tokens('abc'),
      fetchImpl: failing as unknown as typeof fetch,
    });
    await expect(api.request('GET', '/v1/groups', { schema: GroupList })).rejects.toMatchObject({
      code: 'NETWORK',
    });

    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const slow = createApiClient({
      baseUrl: 'https://api.test',
      tokens: tokens('abc'),
      fetchImpl: hanging as unknown as typeof fetch,
      timeoutMs: 20,
    });
    await expect(slow.request('GET', '/v1/groups', { schema: GroupList })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('rejects invalid responses in strict mode and passes them in lenient mode', async () => {
    const fetchImpl = vi.fn(async () => json(200, { nope: true }));
    const strict = createApiClient({
      baseUrl: 'https://api.test',
      tokens: tokens('abc'),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(strict.request('GET', '/v1/groups', { schema: GroupList })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    const onInvalid = vi.fn();
    const lenient = createApiClient({
      baseUrl: 'https://api.test',
      tokens: tokens('abc'),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      validation: 'lenient',
      onInvalidResponse: onInvalid,
    });
    await expect(lenient.request('GET', '/v1/groups', { schema: GroupList })).resolves.toEqual({
      nope: true,
    });
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it('does not send a token on unauthenticated calls and refreshes first when missing', async () => {
    const t = tokens(null);
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth ? json(200, groups) : json(200, { ok: true });
    });
    const api = createApiClient({
      baseUrl: 'https://api.test',
      tokens: t,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(api.request('POST', '/x', { schema: Ok, auth: false })).resolves.toEqual({
      ok: true,
    });
    expect(t.refresh).not.toHaveBeenCalled();
    await api.request('GET', '/v1/groups', { schema: GroupList });
    expect(t.refresh).toHaveBeenCalledTimes(1);
  });
});
