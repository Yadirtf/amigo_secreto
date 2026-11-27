/**
 * Sign-in / sign-out orchestration: tokens to SecureStore, caches wiped on
 * sign-out (MASVS: logout leaves no cached data behind).
 */
import type { Session } from '@entre-nos/contracts';
import { api } from '../../api';
import { persister, queryClient } from '../../query/client';
import { qk } from '../../query/keys';
import { clearSecureCache } from '../../query/secureCache';
import { usePrefs } from '../../state/prefs';
import { useSession } from '../../state/session';
import { googleSignOut } from './google';

export async function completeSignIn(session: Session): Promise<void> {
  await useSession.getState().setSession(session);
  queryClient.setQueryData(qk.me, session.user);
}

/** Wipes every local trace of the account (cache, secure cache, prefs). */
export async function wipeLocalData(): Promise<void> {
  queryClient.cancelQueries().catch(() => undefined);
  queryClient.getMutationCache().clear();
  queryClient.clear();
  await Promise.all([persister.removeClient(), clearSecureCache(), googleSignOut()]).catch(
    () => undefined,
  );
  usePrefs.getState().reset();
}

export async function signOut(): Promise<void> {
  const refreshToken = useSession.getState().refreshToken;
  if (refreshToken) {
    // Best effort: revoke the refresh token on the server.
    api.auth.logout(refreshToken).catch(() => undefined);
  }
  await wipeLocalData();
  await useSession.getState().clear();
}

/** Called when the refresh token was rejected (session expired elsewhere). */
export function handleSessionEnded(): void {
  void wipeLocalData();
}
