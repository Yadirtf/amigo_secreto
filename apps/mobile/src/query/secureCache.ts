/**
 * Offline cache for sensitive queries (my assignment, the reveal). They are
 * never written to AsyncStorage (MASVS-STORAGE): each one goes to SecureStore
 * (Android Keystore-backed), without photos to keep values small.
 * Chat messages are not persisted at all.
 */
import type { QueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { SECURE_PERSISTED } from './keys';

const INDEX_KEY = 'entrenos.secure.index';
const PREFIX = 'entrenos.secure.';
const MAX_AGE_MS = 7 * 86_400_000;
const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface Entry {
  key: [string, string];
  updatedAt: number;
  data: unknown;
}

function storageKey(key: readonly unknown[]): string {
  return `${PREFIX}${String(key[0])}.${String(key[1])}`.replace(/[^A-Za-z0-9._-]/g, '_');
}

/** Drops photo data URIs (they can be up to 60 KB) from a cached value. */
function stripPhotos(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPhotos);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === 'photo' ? null : stripPhotos(v);
    return out;
  }
  return value;
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(INDEX_KEY, OPTS);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function restoreSecureCache(client: QueryClient): Promise<void> {
  const index = await readIndex();
  await Promise.all(
    index.map(async (k) => {
      try {
        const raw = await SecureStore.getItemAsync(k, OPTS);
        if (!raw) return;
        const entry = JSON.parse(raw) as Entry;
        if (Date.now() - entry.updatedAt > MAX_AGE_MS) return;
        if (client.getQueryData(entry.key) === undefined) {
          client.setQueryData(entry.key, entry.data, { updatedAt: entry.updatedAt });
        }
      } catch {
        // ignore a broken entry
      }
    }),
  );
}

/** Mirrors successful sensitive queries into SecureStore. */
export function watchSecureCache(client: QueryClient): () => void {
  let index: string[] | null = null;
  return client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    const key = event.query.queryKey;
    if (!SECURE_PERSISTED.has(String(key[0])) || key.length < 2) return;
    const k = storageKey(key);
    const entry: Entry = {
      key: [String(key[0]), String(key[1])],
      updatedAt: event.query.state.dataUpdatedAt,
      data: stripPhotos(event.query.state.data),
    };
    void (async () => {
      try {
        await SecureStore.setItemAsync(k, JSON.stringify(entry), OPTS);
        index ??= await readIndex();
        if (!index.includes(k)) {
          index.push(k);
          await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(index), OPTS);
        }
      } catch {
        // Too large or unavailable: just don't cache offline.
      }
    })();
  });
}

export async function clearSecureCache(): Promise<void> {
  const index = await readIndex();
  await Promise.all(index.map((k) => SecureStore.deleteItemAsync(k, OPTS).catch(() => undefined)));
  await SecureStore.deleteItemAsync(INDEX_KEY, OPTS).catch(() => undefined);
}
