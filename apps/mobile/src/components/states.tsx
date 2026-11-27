import { onlineManager } from '@tanstack/react-query';
import { Banner, Button, EmptyState, Screen, SkeletonCard, SkeletonGroup } from '@entre-nos/ui';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { errorCode, errorMessage, isGoneError, OFFLINE_CACHED_MESSAGE } from '../lib/errors';

export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
}

/** "Sin conexión. Te mostramos lo último guardado." — disappears when back online. */
export function OfflineBanner({ hasData = true }: { hasData?: boolean }) {
  const online = useOnline();
  if (online) return null;
  return (
    <Banner
      kind="error"
      icon="offline"
      testID="offline-banner"
      message={
        hasData ? OFFLINE_CACHED_MESSAGE : 'No hay conexión. Revisa tus datos o el wifi.'
      }
    />
  );
}

export interface LoadErrorProps {
  error: unknown;
  onRetry: () => void;
  title?: string;
}

/** Error state for a screen without cached data (§8.7 error variant). */
export function LoadError({ error, onRetry, title }: LoadErrorProps) {
  const code = errorCode(error);
  if (isGoneError(error)) {
    return (
      <EmptyState
        tone="error"
        icon="error"
        title={code === 'NOT_FOUND' ? 'Este grupo ya no existe.' : 'No tienes acceso'}
        body={errorMessage(error)}
        primary={{ label: 'Ir a Mis grupos', onPress: () => router.replace('/') }}
        testID="gone-state"
      />
    );
  }
  const offline = code === 'NETWORK' || code === 'TIMEOUT';
  return (
    <EmptyState
      tone="error"
      icon={offline ? 'offline' : 'error'}
      title={title ?? (offline ? 'No hay conexión' : 'No pudimos cargar esto')}
      body={offline ? 'Revisa tus datos o el wifi y vuelve a intentar.' : errorMessage(error)}
      primary={{ label: 'Reintentar', onPress: onRetry, testID: 'retry-button' }}
      testID="error-state"
    />
  );
}

/** Full-screen skeleton while a screen loads for the first time (no cache). */
export function LoadingScreen({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <Screen topBar={{ title, onBack }}>
      <SkeletonGroup testID="loading">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </SkeletonGroup>
    </Screen>
  );
}

export function BackToGroups() {
  return <Button variant="ghost" label="Ir a Mis grupos" onPress={() => router.replace('/')} />;
}

export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
