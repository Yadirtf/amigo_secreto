import type { GroupSummary } from '@entre-nos/contracts';
import {
  Avatar,
  Banner,
  Button,
  ConfirmDialog,
  ListRow,
  Screen,
  Text,
  TextField,
  useTheme,
  useToast,
} from '@entre-nos/ui';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { PhotoSheet, ThemeSheet } from '../../src/components/sheets';
import { goBack } from '../../src/components/states';
import { config } from '../../src/config';
import { deleteAccount, signOut } from '../../src/features/auth/session';
import { useGroups } from '../../src/features/groups/hooks';
import { useUpdateMe } from '../../src/features/profile/hooks';
import { errorCode, errorMessage } from '../../src/lib/errors';
import { haptics } from '../../src/lib/haptics';
import { openExternal } from '../../src/lib/share';
import { APPEARANCE_LABEL, useAppearance } from '../../src/state/appearance';
import { useSession } from '../../src/state/session';

const NAME_MAX = 40;

/** S12 — Perfil y ajustes. */
export default function ProfileScreen() {
  const theme = useTheme();
  const toast = useToast();
  const user = useSession((s) => s.user);
  const method = useSession((s) => s.method);
  const update = useUpdateMe();
  const groups = useGroups();
  const [name, setName] = useState(user?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const appearance = useAppearance((s) => s.mode);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const saveName = () => {
    const v = name.trim().replace(/\s+/g, ' ');
    if (v === '') {
      setNameError('Escribe tu nombre para que tu grupo sepa quién eres.');
      return;
    }
    if (v === user.name) return;
    update.mutate(
      { name: v },
      {
        onSuccess: () => toast.show('Nombre guardado'),
        onError: (e) => {
          haptics.error();
          setNameError(
            errorCode(e) === 'INVALID_INPUT'
              ? 'Usa solo letras, números, espacios, puntos o guiones.'
              : errorMessage(e),
          );
        },
      },
    );
  };

  const savePhoto = (photo: string | null) =>
    update.mutate(
      { photo },
      {
        onSuccess: () => toast.show(photo ? 'Foto guardada' : 'Foto quitada'),
        onError: (e) =>
          toast.show({
            message:
              errorCode(e) === 'INVALID_INPUT'
                ? 'No pudimos usar esa foto. Prueba con otra.'
                : errorMessage(e),
            kind: 'error',
          }),
      },
    );

  const doDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await deleteAccount();
      if (res === 'cancelled') {
        setDeleting(false);
        return;
      }
      setDeleteOpen(false);
      toast.show('Tu cuenta se eliminó. ¡Gracias por usar Entre Nos!');
      router.replace('/bienvenida');
    } catch (e) {
      haptics.error();
      setDeleting(false);
      setDeleteOpen(false);
      setError(
        e instanceof Error && e.message === 'google'
          ? 'No pudimos confirmar tu cuenta de Google. Vuelve a intentar.'
          : errorMessage(e),
      );
    }
  };

  const version = `${Application.nativeApplicationVersion ?? '1.0.0'} (${
    Application.nativeBuildVersion ?? '1'
  })`;
  const account =
    method === 'dev' ? 'Cuenta de prueba (staging)' : `Cuenta: ${user.email ?? 'Google'} (Google)`;

  return (
    <Screen testID="profile-screen" topBar={{ title: 'Tu perfil', onBack: goBack }}>
      {error ? <Banner kind="error" message={error} testID="profile-error" /> : null}
      <View style={styles.center}>
        <Avatar
          name={user.name}
          seed={user.id}
          photo={user.photo}
          size="xl"
          loading={update.isPending && update.variables?.photo !== undefined}
          onPress={() => setPhotoOpen(true)}
          accessibilityLabel="Tu foto. Toca para cambiarla"
          testID="profile-photo"
        />
        <Button
          variant="ghost"
          size="small"
          icon="camera"
          label="Cambiar foto"
          onPress={() => setPhotoOpen(true)}
        />
      </View>
      <TextField
        label="Tu nombre"
        value={name}
        onChangeText={(t) => {
          setName(t);
          setNameError(null);
        }}
        onBlur={saveName}
        onSubmitEditing={saveName}
        error={nameError}
        helper="Así te ven en tus grupos."
        autoCapitalize="words"
        maxLength={NAME_MAX}
        textContentType="name"
        autoComplete="name"
        returnKeyType="done"
        testID="profile-name"
      />
      <Text variant="caption" color="textSecondary">
        {account}
      </Text>

      <View>
        <ListRow
          icon="settings"
          title="Tema"
          detail={APPEARANCE_LABEL[appearance]}
          chevron
          onPress={() => setThemeOpen(true)}
          testID="profile-theme"
        />
        <ListRow
          icon="bell"
          title="Notificaciones"
          chevron
          onPress={() => void Linking.openSettings()}
          testID="profile-notifications"
        />
        {config.privacyUrl ? (
          <ListRow
            icon="lock"
            title="Política de privacidad"
            chevron
            onPress={() => void openExternal(config.privacyUrl)}
          />
        ) : null}
        {config.termsUrl && config.termsUrl !== config.privacyUrl ? (
          <ListRow
            icon="info"
            title="Términos"
            chevron
            onPress={() => void openExternal(config.termsUrl)}
          />
        ) : null}
        {config.helpUrl ? (
          <ListRow
            icon="chat"
            title="Ayuda y contacto"
            chevron
            onPress={() => void openExternal(config.helpUrl)}
          />
        ) : null}
      </View>

      <View style={{ gap: theme.space.sm }}>
        <Button
          variant="outline"
          icon="logout"
          label="Cerrar sesión"
          loading={signingOut}
          loadingLabel="Cerrando sesión…"
          onPress={() => {
            setSigningOut(true);
            void signOut().finally(() => router.replace('/bienvenida'));
          }}
          fullWidth
          testID="profile-logout"
        />
        <Button
          variant="destructiveGhost"
          label="Eliminar mi cuenta"
          onPress={() => setDeleteOpen(true)}
          fullWidth
          testID="profile-delete"
        />
      </View>
      <Text variant="caption" color="textSecondary" align="center">
        {`Versión ${version}`}
      </Text>

      <ThemeSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <PhotoSheet
        visible={photoOpen}
        onClose={() => setPhotoOpen(false)}
        hasPhoto={!!user.photo}
        onPicked={savePhoto}
        onRemove={() => savePhoto(null)}
        title="Tu foto"
      />
      <ConfirmDialog
        visible={deleteOpen}
        title="¿Eliminar tu cuenta?"
        message={deleteMessage(groups.data?.groups ?? [])}
        confirmLabel="Eliminar mi cuenta"
        confirmLoadingLabel="Eliminando…"
        confirmVariant="destructive"
        loading={deleting}
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleteOpen(false)}
        testID="dialog-delete-account"
      />
    </Screen>
  );
}

/** Copy from flujos S12, depending on drawn groups and groups I organize. */
function deleteMessage(groups: readonly GroupSummary[]): string {
  const base = 'Se borran tu perfil, tus listas y tus mensajes. No se puede deshacer.';
  const drawn = groups.filter((g) => g.status === 'drawn').length;
  const organized = groups.filter((g) => g.isOrganizer && g.daysLeft >= 0);
  const parts: string[] = [];
  if (drawn > 0) {
    parts.push(
      `Estás en ${drawn} ${drawn === 1 ? 'grupo ya sorteado' : 'grupos ya sorteados'}. Si eliminas tu cuenta, a tu amigo secreto le faltará un regalo y el organizador tendrá que sortear de nuevo.`,
    );
  }
  parts.push(base);
  if (organized.length > 0) {
    const names = organized.map((g) => g.name).join(', ');
    parts.push(
      `Eres organizador de ${names}. Si eliminas tu cuenta, ${
        organized.length === 1 ? 'el grupo también se elimina' : 'esos grupos también se eliminan'
      } para todos.`,
    );
  }
  return parts.join(' ');
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 4 },
});
