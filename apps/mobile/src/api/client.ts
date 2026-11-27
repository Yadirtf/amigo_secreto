/**
 * Single typed HTTP client for the Entre Nos API. Screens never call fetch:
 * they use the endpoint functions built on top of this.
 *
 * - Attaches the access token.
 * - On 401, performs ONE refresh (single-flight across concurrent requests)
 *   and retries the original request once.
 * - Parses the uniform `ApiError` envelope.
 * - 15 s timeout per request (AbortController).
 * - Validates responses with the contract schemas (strict in dev).
 *
 * Framework-free so it can be unit tested with Vitest.
 */
import { ApiError as ApiErrorSchema, type ErrorCode } from '@entre-nos/contracts';
import type { z } from 'zod';

export type ClientErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT' | 'INVALID_RESPONSE';

export class ApiRequestError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;
  /** Message from the server, already in Colombian Spanish. */
  readonly serverMessage: string | undefined;
  readonly retryAfterSec: number | undefined;

  constructor(init: {
    code: ClientErrorCode;
    status: number;
    message?: string;
    details?: Record<string, unknown>;
    retryAfterSec?: number;
  }) {
    super(init.message ?? init.code);
    this.name = 'ApiRequestError';
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.serverMessage = init.message;
    this.retryAfterSec = init.retryAfterSec;
  }

  /** Network-level failure: worth retrying and showing the "no signal" copy. */
  get isNetwork(): boolean {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT';
  }
}

export const isApiError = (e: unknown): e is ApiRequestError => e instanceof ApiRequestError;

export interface TokenSource {
  /** Current access token, or null when signed out. */
  getAccessToken: () => string | null;
  /**
   * Refreshes the session. Resolves with the new access token, or null when
   * the refresh token is no longer valid (the app then signs out).
   */
  refresh: () => Promise<string | null>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens: TokenSource;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** strict: an invalid response throws INVALID_RESPONSE. lenient: warn and pass through. */
  validation?: 'strict' | 'lenient';
  onInvalidResponse?: (path: string, issues: unknown) => void;
}

export interface RequestOptions<S extends z.ZodType> {
  schema: S;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  auth?: boolean;
  signal?: AbortSignal;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiClient {
  request<S extends z.ZodType>(
    method: HttpMethod,
    path: string,
    options: RequestOptions<S>,
  ): Promise<z.infer<S>>;
}

function buildUrl(base: string, path: string, query?: RequestOptions<z.ZodType>['query']): string {
  let url = `${base.replace(/\/+$/, '')}${path}`;
  if (query) {
    const parts = Object.entries(query)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (parts.length > 0) url += `?${parts.join('&')}`;
  }
  return url;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const validation = options.validation ?? 'strict';
  let refreshing: Promise<string | null> | null = null;

  /** Single-flight refresh: concurrent 401s share one refresh call. */
  function refreshOnce(): Promise<string | null> {
    if (!refreshing) {
      // A network failure during refresh propagates (the session is kept);
      // only a definitive "no" (null) ends the session.
      refreshing = options.tokens.refresh().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  }

  async function send(
    method: HttpMethod,
    url: string,
    body: unknown,
    token: string | null,
    external?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (external) {
      if (external.aborted) controller.abort();
      else external.addEventListener('abort', onExternalAbort);
    }
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      return await fetchImpl(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (timedOut) throw new ApiRequestError({ code: 'TIMEOUT', status: 0 });
      if (external?.aborted) throw e; // cancellation (e.g. TanStack Query): let it propagate
      throw new ApiRequestError({ code: 'NETWORK', status: 0 });
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    }
  }

  async function toError(res: Response): Promise<ApiRequestError> {
    const retryAfterSec = parseRetryAfter(res.headers.get('Retry-After'));
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const parsed = ApiErrorSchema.safeParse(json);
    if (parsed.success) {
      return new ApiRequestError({
        code: parsed.data.error.code,
        status: res.status,
        message: parsed.data.error.message,
        details: parsed.data.error.details,
        retryAfterSec,
      });
    }
    const code: ClientErrorCode =
      res.status === 401
        ? 'UNAUTHORIZED'
        : res.status === 403
          ? 'FORBIDDEN'
          : res.status === 404
            ? 'NOT_FOUND'
            : res.status === 429
              ? 'RATE_LIMITED'
              : res.status >= 500
                ? 'INTERNAL'
                : 'INVALID_INPUT';
    return new ApiRequestError({ code, status: res.status, retryAfterSec });
  }

  return {
    async request(method, path, { schema, body, query, auth = true, signal }) {
      const url = buildUrl(options.baseUrl, path, query);
      let token = auth ? options.tokens.getAccessToken() : null;
      if (auth && !token) {
        // No access token in memory (expired or first launch): try a refresh first.
        token = await refreshOnce();
        if (!token) throw new ApiRequestError({ code: 'UNAUTHORIZED', status: 401 });
      }
      let res = await send(method, url, body, token, signal);
      if (res.status === 401 && auth) {
        const fresh = await refreshOnce();
        if (!fresh) throw await toError(res);
        res = await send(method, url, body, fresh, signal);
      }
      if (!res.ok) throw await toError(res);

      let json: unknown;
      try {
        json = res.status === 204 ? { ok: true } : await res.json();
      } catch {
        throw new ApiRequestError({ code: 'INVALID_RESPONSE', status: res.status });
      }
      const parsed = schema.safeParse(json);
      if (parsed.success) return parsed.data;
      options.onInvalidResponse?.(path, parsed.error.issues);
      if (validation === 'strict') {
        throw new ApiRequestError({ code: 'INVALID_RESPONSE', status: res.status });
      }
      // Lenient (production): a new optional server field must not break the app.
      return json as z.infer<typeof schema>;
    },
  };
}
