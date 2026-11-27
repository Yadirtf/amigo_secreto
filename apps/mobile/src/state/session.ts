/**
 * Session store (Zustand). Tokens live ONLY in SecureStore (Android Keystore),
 * never in AsyncStorage; this store keeps them in memory after hydration.
 */
import type { Me, Session } from '@entre-nos/contracts';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY = 'entrenos.session.v1';
const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface StoredSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  user: Me;
  method?: LoginMethod;
}

export type LoginMethod = 'google' | 'dev';

export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  user: Me | null;
  accessToken: string | null;
  accessTokenExpiresAt: number;
  refreshToken: string | null;
  method: LoginMethod;
  /** Set when the session ended on its own (refresh failed) to show a toast. */
  expiredNotice: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: Session, method?: LoginMethod) => Promise<void>;
  setUser: (user: Me) => Promise<void>;
  clear: (opts?: { expired?: boolean }) => Promise<void>;
  ackExpiredNotice: () => void;
}

async function persist(s: StoredSession | null): Promise<void> {
  if (s === null) await SecureStore.deleteItemAsync(KEY, SECURE_OPTS);
  else await SecureStore.setItemAsync(KEY, JSON.stringify(s), SECURE_OPTS);
}

function isStored(v: unknown): v is StoredSession {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.accessToken === 'string' &&
    typeof o.refreshToken === 'string' &&
    typeof o.accessTokenExpiresAt === 'string' &&
    typeof o.user === 'object' &&
    o.user !== null
  );
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  accessTokenExpiresAt: 0,
  refreshToken: null,
  method: 'google',
  expiredNotice: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY, SECURE_OPTS);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (isStored(parsed)) {
        set({
          status: 'signedIn',
          user: parsed.user,
          accessToken: parsed.accessToken,
          accessTokenExpiresAt: Date.parse(parsed.accessTokenExpiresAt),
          refreshToken: parsed.refreshToken,
          method: parsed.method ?? 'google',
        });
        return;
      }
    } catch {
      // Corrupt or unreadable (e.g. restored on another device): start clean.
    }
    set({ status: 'signedOut' });
  },

  setSession: async (session, method) => {
    const m = method ?? get().method;
    await persist({
      accessToken: session.accessToken,
      accessTokenExpiresAt: session.accessTokenExpiresAt,
      refreshToken: session.refreshToken,
      user: session.user,
      method: m,
    });
    set({
      status: 'signedIn',
      user: session.user,
      accessToken: session.accessToken,
      accessTokenExpiresAt: Date.parse(session.accessTokenExpiresAt),
      refreshToken: session.refreshToken,
      method: m,
      expiredNotice: false,
    });
  },

  setUser: async (user) => {
    const s = get();
    set({ user });
    if (s.accessToken && s.refreshToken) {
      await persist({
        accessToken: s.accessToken,
        accessTokenExpiresAt: new Date(s.accessTokenExpiresAt).toISOString(),
        refreshToken: s.refreshToken,
        user,
        method: s.method,
      });
    }
  },

  clear: async (opts) => {
    await persist(null).catch(() => undefined);
    set({
      status: 'signedOut',
      user: null,
      accessToken: null,
      accessTokenExpiresAt: 0,
      refreshToken: null,
      expiredNotice: !!opts?.expired,
    });
  },

  ackExpiredNotice: () => set({ expiredNotice: false }),
}));

/** Access token if still valid for at least 30 s; null forces a refresh. */
export function currentAccessToken(): string | null {
  const s = useSession.getState();
  if (!s.accessToken) return null;
  return s.accessTokenExpiresAt - Date.now() > 30_000 ? s.accessToken : null;
}
