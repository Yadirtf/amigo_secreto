import { useTheme } from '@entre-nos/ui';
import { Redirect, Stack } from 'expo-router';
import { usePendingInvite } from '../../src/state/prefs';
import { useSession } from '../../src/state/session';

/** Signed-in users never see the welcome screen; a pending invite resumes. */
export default function AuthLayout() {
  const theme = useTheme();
  const status = useSession((s) => s.status);
  const pending = usePendingInvite((s) => s.code);
  if (status === 'signedIn') {
    return pending ? (
      <Redirect href={{ pathname: '/i/[code]', params: { code: pending } }} />
    ) : (
      <Redirect href="/" />
    );
  }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.background },
      }}
    />
  );
}
