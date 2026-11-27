/**
 * App-wide API instance wired to the session store.
 */
import { config } from '../config';
import { currentAccessToken, useSession } from '../state/session';
import { createApiClient, isApiError } from './client';
import { createEndpoints } from './endpoints';

let onSessionEnded: (() => void) | null = null;

/** Registered by the root layout: clears caches when the session ends. */
export function setSessionEndedHandler(fn: () => void): void {
  onSessionEnded = fn;
}

const client = createApiClient({
  baseUrl: config.apiUrl,
  validation: __DEV__ ? 'strict' : 'lenient',
  onInvalidResponse: (path, issues) => {
    if (__DEV__) console.warn(`[api] invalid response for ${path}`, issues);
  },
  tokens: {
    getAccessToken: currentAccessToken,
    refresh: async () => {
      const refreshToken = useSession.getState().refreshToken;
      if (!refreshToken) return null;
      try {
        const session = await api.auth.refresh(refreshToken);
        await useSession.getState().setSession(session);
        return session.accessToken;
      } catch (e) {
        if (isApiError(e) && (e.isNetwork || e.code === 'INTERNAL' || e.code === 'RATE_LIMITED')) {
          throw e; // keep the session: it's the network, not the token
        }
        await useSession.getState().clear({ expired: true });
        onSessionEnded?.();
        return null;
      }
    },
  },
});

export const api = createEndpoints(client);
export { ApiRequestError, isApiError } from './client';
