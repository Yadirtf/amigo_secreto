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
import { useSession, type LoginMethod } from '../../state/session';
import { currentPushToken } from '../notifications/push';
import { googleFreshIdToken, googleSignOut } from './google';
import { DEV_LOGIN_ENABLED } from '../../config';

export async function completeSignIn(session: Session, method: LoginMethod): Promise<void> {
  await useSession.getState().setSession(session, method);
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
    // Best effort: revoke the refresh token and unregister this phone's push token.
    const pushToken = await Promise.race([
      currentPushToken(),
      new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500)),
    ]);
    await api.auth.logout(refreshToken, pushToken).catch(() => undefined);
  }
  await wipeLocalData();
  await useSession.getState().clear();
}

/** Called when the refresh token was rejected (session expired elsewhere). */
export function handleSessionEnded(): void {
  void wipeLocalData();
}

export type DeleteAccountResult = 'deleted' | 'cancelled';

/**
 * Deletes the account. The API requires a fresh Google ID token, so the
 * account chooser appears once more; dev-login users (staging) send none.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  let idToken: string | null = null;
  if (!(DEV_LOGIN_ENABLED && useSession.getState().method === 'dev')) {
    const fresh = await googleFreshIdToken();
    if (fresh.kind === 'cancelled') return 'cancelled';
    if (fresh.kind !== 'ok') throw new Error('google');
    idToken = fresh.idToken;
  }
  await api.me.delete(idToken);
  await wipeLocalData();
  await useSession.getState().clear();
  return 'deleted';
}
