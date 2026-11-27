/**
 * Google Sign-In (native, requires a dev build). Returns the ID token that
 * the API verifies (ADR-0007).
 */
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { config } from '../../config';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: config.googleWebClientId, scopes: ['profile', 'email'] });
  configured = true;
}

export type GoogleResult =
  | { kind: 'ok'; idToken: string }
  | { kind: 'cancelled' }
  | { kind: 'playServices' }
  | { kind: 'failed' };

export async function googleSignIn(): Promise<GoogleResult> {
  try {
    ensureConfigured();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return { kind: 'cancelled' };
    const idToken = res.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
    return idToken ? { kind: 'ok', idToken } : { kind: 'failed' };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) {
        return { kind: 'cancelled' };
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { kind: 'playServices' };
    }
    return { kind: 'failed' };
  }
}

export async function googleSignOut(): Promise<void> {
  try {
    ensureConfigured();
    await GoogleSignin.signOut();
  } catch {
    // not signed in with Google (dev login) or module unavailable
  }
}
