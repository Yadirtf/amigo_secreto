import { Avatar, Banner, Button, EmptyState, Icon, Screen, Text, useTheme } from '@entre-nos/ui';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LoadError, LoadingScreen } from '../../src/components/states';
import { useInvitePreview } from '../../src/features/groups/hooks';
import { previewBlocker, useJoinFlow } from '../../src/features/groups/join';
import { formatDayLong } from '../../src/lib/format';
import { validDeepLinkCode } from '../../src/lib/invite';
import { usePendingInvite } from '../../src/state/prefs';
import { useSession } from '../../src/state/session';

function close(): void {
  usePendingInvite.getState().set(null);
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** S4b — Invitación por enlace (1 toque). */
export default function InviteLinkScreen() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = validDeepLinkCode(params.code);
  const status = useSession((s) => s.status);
  const signedOut = status !== 'signedIn';

  useEffect(() => {
    // Keep the code in memory: after Google sign-in, (auth) brings the user back here.
    if (code && signedOut) usePendingInvite.getState().set(code);
  }, [code, signedOut]);

  if (!code) {
    return (
      <Screen topBar={{ onBack: close, backIcon: 'close' }} testID="invite-link-invalid">
        <EmptyState
          tone="error"
          icon="code"
          title="Ese enlace no funciona"
          body="Ese código no existe. Revisa que esté bien escrito o pide el enlace de nuevo."
          primary={{ label: 'Escribir el código', onPress: () => router.replace('/unirse') }}
        />
      </Screen>
    );
  }
  if (signedOut) return <Redirect href="/bienvenida" />;
  return <InvitePreviewScreen code={code} />;
}

function InvitePreviewScreen({ code }: { code: string }) {
  const theme = useTheme();
  const preview = useInvitePreview(code);
  const flow = useJoinFlow();
  const [joinError, setJoinError] = useState<string | null>(null);
  const p = preview.data;

  if (!p) {
    return preview.error ? (
      <Screen topBar={{ onBack: close, backIcon: 'close' }}>
        <LoadError
          error={preview.error}
          title="No pudimos abrir la invitación"
          onRetry={() => void preview.refetch()}
        />
      </Screen>
    ) : (
      <LoadingScreen onBack={close} />
    );
  }

  const blocker = previewBlocker(p);
  const people = p.memberCount === 1 ? '1 persona ya está' : `${p.memberCount} personas ya están`;

  return (
    <Screen
      testID="invite-link-screen"
      topBar={{ onBack: close, backIcon: 'close' }}
      footer={
        <>
          {joinError ? <Banner kind="error" message={joinError} testID="join-error" /> : null}
          {blocker ? <Banner kind="warning" message={blocker} testID="join-blocked" /> : null}
          <Button
            label={p.alreadyMember ? 'Ir al grupo' : 'Unirte a este grupo'}
            loadingLabel="Uniéndote…"
            loading={flow.isPending}
            disabled={!!blocker}
            onPress={() => {
              setJoinError(null);
              flow.run(code, p, setJoinError);
            }}
            fullWidth
            testID="invite-join"
          />
          <Button variant="ghost" label="Ahora no" onPress={close} fullWidth testID="invite-later" />
        </>
      }
    >
      <View style={[styles.center, { gap: theme.space.sm }]}>
        <Avatar name={p.name} seed={p.groupId ?? p.name} photo={p.photo} size="xl" rounded />
        <Text variant="body" color="textSecondary" align="center">
          {`${p.organizerName} te invitó a`}
        </Text>
        <Text variant="title1" align="center" accessibilityRole="header">
          {p.name}
        </Text>
      </View>
      <View style={{ gap: theme.space.sm }}>
        <View style={styles.row} accessible>
          <Icon name="calendar" color="textSecondary" />
          <Text variant="body">{`Entrega: ${formatDayLong(p.deliveryDate)}`}</Text>
        </View>
        <View style={styles.row} accessible>
          <Icon name="users" color="textSecondary" />
          <Text variant="body">{people}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
});
