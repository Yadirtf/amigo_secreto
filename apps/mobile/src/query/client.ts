/**
 * TanStack Query setup: offline-first, retries with exponential backoff,
 * NetInfo-driven online manager, AppState-driven focus manager and a 7-day
 * persisted cache (non-sensitive data only).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { AppState, Platform } from 'react-native';
import { api } from '../api';
import type { WishInput } from '@entre-nos/contracts';
import { isRetryable } from '../lib/errors';
import { mutationKeys, PLAIN_PERSISTED } from './keys';

export const CACHE_MAX_AGE = 7 * 86_400_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 60_000,
      gcTime: CACHE_MAX_AGE,
      retry: (count, error) => count < 3 && isRetryable(error),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: (count, error) => count < 2 && isRetryable(error),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  },
});

export interface PutWishlistVars {
  groupId: string;
  items: WishInput[];
}

// Defaults so paused (offline) wishlist saves survive an app restart and
// resume when the connection comes back. Saves for one group run in order.
queryClient.setMutationDefaults(mutationKeys.putWishlist, {
  mutationFn: (vars: PutWishlistVars) => api.wishlist.put(vars.groupId, vars.items),
  networkMode: 'offlineFirst',
  retry: (count, error) => count < 5 && isRetryable(error),
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'entrenos.query-cache.v1',
  throttleTime: 1000,
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && PLAIN_PERSISTED.has(String(query.queryKey[0])),
    shouldDehydrateMutation: (mutation) =>
      mutation.state.isPaused && String(mutation.options.mutationKey?.[0]) === 'wishlist',
  },
};

let wired = false;

/** Connects TanStack Query to NetInfo and AppState (call once). */
export function wireQueryManagers(): void {
  if (wired) return;
  wired = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }),
  );
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') handleFocus(status === 'active');
    });
    return () => sub.remove();
  });
}
