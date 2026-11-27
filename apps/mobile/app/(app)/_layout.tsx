import { useTheme } from '@entre-nos/ui';
import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../src/state/session';

/** Auth gate: everything in (app) needs a session. */
export default function AppLayout() {
  const theme = useTheme();
  const status = useSession((s) => s.status);
  if (status !== 'signedIn') return <Redirect href="/bienvenida" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="grupo/[id]/revelar" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="grupo/[id]/sorteo" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
