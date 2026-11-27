import {
  Banner,
  Button,
  Card,
  Icon,
  Screen,
  Text,
  TextField,
  useTheme,
  useToast,
} from '@entre-nos/ui';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { BrandMark } from '../../src/components/BrandMark';
import { useOnline } from '../../src/components/states';
import { config, DEV_LOGIN_ENABLED, DEV_LOGIN_KEY } from '../../src/config';
import { googleSignIn } from '../../src/features/auth/google';
import { completeSignIn } from '../../src/features/auth/session';
import { errorMessage } from '../../src/lib/errors';
import { haptics } from '../../src/lib/haptics';
import { formatInviteCode } from '../../src/lib/invite';
import { usePendingInvite } from '../../src/state/prefs';

const BULLETS = [
  'Sorteo justo: nadie se saca a sí mismo',
  'Lista de deseos para atinarle al regalo',
  'Pregúntale cosas en secreto',
];

/** S1 — Bienvenida + Google. One tap, no onboarding carousel. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const toast = useToast();
  const online = useOnline();
  const pendingCode = usePendingInvite((s) => s.code);
  const [loading, setLoading] = useState(false);
  const [playServices, setPlayServices] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setPlayServices(false);
    try {
      const g = await googleSignIn();
      if (g.kind === 'cancelled') return; // no error: back to the screen
      if (g.kind === 'playServices') {
        setPlayServices(true);
        return;
      }
      if (g.kind === 'failed') {
        toast.show({
          message: 'No pudimos entrar con Google. Intenta otra vez en un momento.',
          kind: 'error',
        });
        haptics.error();
        return;
      }
      const session = await api.auth.google(g.idToken);
      await completeSignIn(session, 'google');
    } catch (e) {
      haptics.error();
      toast.show({
        message: online
          ? 'No pudimos entrar con Google. Intenta otra vez en un momento.'
          : errorMessage(e, 'login'),
        kind: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      testID="welcome-screen"
      footer={
        <>
          {!online ? (
            <Banner
              kind="error"
              icon="offline"
              message="No hay conexión. Revisa tus datos o el wifi y vuelve a intentar."
            />
          ) : null}
          {playServices ? (
            <Banner
              kind="warning"
              message="Para entrar necesitas actualizar Servicios de Google Play."
              action={{
                label: 'Abrir Play Store',
                onPress: () =>
                  void Linking.openURL('market://details?id=com.google.android.gms').catch(
                    () => undefined,
                  ),
              }}
            />
          ) : null}
          <GoogleButton loading={loading} onPress={() => void signIn()} />
          <Legal />
          {DEV_LOGIN_ENABLED ? <DevLogin /> : null}
        </>
      }
    >
      <View style={[styles.hero, { marginTop: theme.space.huge, gap: theme.space.xl }]}>
        <BrandMark size={96} dark={theme.scheme === 'dark'} />
        <Text variant="title1">
          {pendingCode
            ? 'Entra para unirte al grupo'
            : 'El amigo secreto, sin papelitos ni enredos'}
        </Text>
        <View style={{ gap: theme.space.md }}>
          {BULLETS.map((b) => (
            <View key={b} style={styles.bullet}>
              <Icon name="success" color="secondary" />
              <Text variant="body" style={styles.flex}>
                {b}
              </Text>
            </View>
          ))}
        </View>
        {pendingCode ? (
          <Card testID="welcome-invite-card">
            <View style={styles.bullet}>
              <Icon name="gift" color="primary" />
              <View style={styles.flex}>
                <Text variant="bodyStrong">Te invitaron a un amigo secreto</Text>
                <Text variant="caption" color="textSecondary">
                  {`Código ${formatInviteCode(pendingCode)}. Entra y te mostramos el grupo.`}
                </Text>
              </View>
            </View>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

/** Official-style Google button: white, strong border, "G" mark. */
function GoogleButton({ loading, onPress }: { loading: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      testID="google-sign-in"
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => [
        styles.google,
        {
          minHeight: theme.size.buttonHeight,
          borderRadius: theme.radius.md,
          borderWidth: theme.size.borderWidthStrong,
          borderColor: theme.color.borderStrong,
          backgroundColor: pressed ? theme.color.surfaceAlt : theme.color.surface,
        },
      ]}
    >
      <Text variant="title3" style={styles.g} color="primary">
        G
      </Text>
      <Text variant="button">{loading ? 'Entrando…' : 'Continuar con Google'}</Text>
    </Pressable>
  );
}

function Legal() {
  const open = (url: string) => {
    if (url) void Linking.openURL(url).catch(() => undefined);
  };
  return (
    <View style={styles.legal}>
      <Text variant="caption" color="textSecondary" align="center">
        Al continuar aceptas los{' '}
      </Text>
      <Pressable
        onPress={() => open(config.termsUrl)}
        accessibilityRole="link"
        accessibilityLabel="Términos"
        hitSlop={14}
      >
        <Text variant="caption" color="primary" style={styles.underline}>
          Términos
        </Text>
      </Pressable>
      <Text variant="caption" color="textSecondary">
        {' y la '}
      </Text>
      <Pressable
        onPress={() => open(config.privacyUrl)}
        accessibilityRole="link"
        accessibilityLabel="Política de privacidad"
        hitSlop={14}
      >
        <Text variant="caption" color="primary" style={styles.underline}>
          Política de privacidad
        </Text>
      </Pressable>
      <Text variant="caption" color="textSecondary">
        .
      </Text>
    </View>
  );
}

/** Staging / e2e only (EXPO_PUBLIC_DEV_LOGIN=1). Compiled out in production. */
function DevLogin() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const session = await api.auth.dev(DEV_LOGIN_KEY, name.trim());
      await completeSignIn(session, 'dev');
    } catch (e) {
      toast.show({ message: errorMessage(e, 'login'), kind: 'error' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <TextField
        label="Nombre de prueba"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={40}
        testID="dev-login-name"
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />
      <Button
        variant="outline"
        label="Entrar de prueba"
        loading={loading}
        loadingLabel="Entrando…"
        onPress={() => void submit()}
        fullWidth
        testID="dev-login-submit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'flex-start' },
  bullet: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1 },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  g: { fontSize: 20 },
  legal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  underline: { textDecorationLine: 'underline' },
});
