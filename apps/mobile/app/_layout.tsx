// Per-weight imports: the package index would bundle every weight and italic.
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { ThemeProvider, ToastProvider, useTheme, useToast } from '@entre-nos/ui';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setSessionEndedHandler } from '../src/api';
import { NotificationPromptSheet } from '../src/components/sheets';
import { handleSessionEnded } from '../src/features/auth/session';
import {
  configureForegroundHandler,
  routeForNotification,
  setupNotificationChannels,
  syncPushTokenIfGranted,
} from '../src/features/notifications/push';
import { SESSION_CLOSED_MESSAGE } from '../src/lib/errors';
import { persistOptions, queryClient, wireQueryManagers } from '../src/query/client';
import { restoreSecureCache, watchSecureCache } from '../src/query/secureCache';
import { useAppearance, useAppearanceHydrated } from '../src/state/appearance';
import { useSession } from '../src/state/session';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

wireQueryManagers();
configureForegroundHandler();
setSessionEndedHandler(handleSessionEnded);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const status = useSession((s) => s.status);
  const appearance = useAppearance((s) => s.mode);
  const appearanceReady = useAppearanceHydrated();
  const [secureRestored, setSecureRestored] = useState(false);

  useEffect(() => {
    void useSession.getState().hydrate();
    void setupNotificationChannels();
    const unwatch = watchSecureCache(queryClient);
    restoreSecureCache(queryClient).finally(() => setSecureRestored(true));
    return unwatch;
  }, []);

  // Never block the start on fonts: fall back to system fonts on error.
  const ready =
    (fontsLoaded || !!fontError) && status !== 'loading' && secureRestored && appearanceReady;

  useEffect(() => {
    if (!ready) return;
    const hide = () => void SplashScreen.hideAsync().catch(() => undefined);
    hide();
    // On a slow cold start the first hide can land before the native splash
    // is attached and is lost, leaving the splash over a ready app (seen in
    // e2e). Hiding is idempotent, so try again once the first frames are up.
    const retries = [500, 2000].map((ms) => setTimeout(hide, ms));
    return () => retries.forEach(clearTimeout);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider preference={appearance}>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={persistOptions}
            onSuccess={() => {
              // Offline wishlist saves queued before a restart resume now.
              void queryClient.resumePausedMutations();
            }}
          >
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const theme = useTheme();
  const toast = useToast();
  const status = useSession((s) => s.status);
  const expiredNotice = useSession((s) => s.expiredNotice);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.background).catch(() => undefined);
  }, [theme.color.background]);

  useEffect(() => {
    if (expiredNotice) {
      toast.show({ message: SESSION_CLOSED_MESSAGE, icon: 'info' });
      useSession.getState().ackExpiredNotice();
    }
  }, [expiredNotice, toast]);

  useEffect(() => {
    if (status === 'signedIn') void syncPushTokenIfGranted();
  }, [status]);

  // Notification taps → screen (docs/API.md). Only when signed in.
  useEffect(() => {
    if (!lastResponse || status !== 'signedIn') return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const route = routeForNotification(lastResponse.notification.request.content.data);
    if (route) router.push(route);
  }, [lastResponse, status]);

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="i/[code]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <NotificationPromptSheet />
    </>
  );
}
