import { BottomSheet, Button, ListRow, Text, useToast } from '@entre-nos/ui';
import { Linking } from 'react-native';
import { config } from '../config';
import {
  maybeOfferNotifications,
  requestPushPermission,
  useNotificationPrompt,
} from '../features/notifications/push';
import { haptics } from '../lib/haptics';
import { formatInviteCode, inviteLink } from '../lib/invite';
import { pickPhoto, type PhotoSource } from '../lib/photo';
import { copyText, inviteMessage, shareText, shareToWhatsApp, type InviteInfo } from '../lib/share';

// ---------- photo ----------

export interface PhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  hasPhoto: boolean;
  onPicked: (dataUri: string) => void;
  onRemove: () => void;
  title?: string;
}

/** "Tomar foto" / "Elegir de la galería" / "Quitar foto" (S3, S12). */
export function PhotoSheet({
  visible,
  onClose,
  hasPhoto,
  onPicked,
  onRemove,
  title = 'Foto',
}: PhotoSheetProps) {
  const toast = useToast();
  const pick = async (source: PhotoSource) => {
    onClose();
    const res = await pickPhoto(source);
    if (res.kind === 'ok') onPicked(res.dataUri);
    else if (res.kind === 'denied') {
      toast.show({
        message: 'Para elegir una foto, permite el acceso en los ajustes del teléfono.',
        action: { label: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
      });
    } else if (res.kind === 'failed') {
      toast.show({ message: 'No pudimos usar esa foto. Prueba con otra.', kind: 'error' });
    }
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} testID="photo-sheet">
      <ListRow
        icon="camera"
        title="Tomar foto"
        onPress={() => void pick('camera')}
        testID="photo-camera"
      />
      <ListRow
        icon="image"
        title="Elegir de la galería"
        onPress={() => void pick('library')}
        testID="photo-library"
      />
      {hasPhoto ? (
        <ListRow
          icon="trash"
          title="Quitar foto"
          onPress={() => {
            onClose();
            onRemove();
          }}
          testID="photo-remove"
        />
      ) : null}
    </BottomSheet>
  );
}

// ---------- invite ----------

export interface InviteSheetProps {
  visible: boolean;
  onClose: () => void;
  group: InviteInfo;
}

/** "Invita a tu gente" (S5). WhatsApp in ≤ 3 taps; falls back to Share. */
export function InviteSheet({ visible, onClose, group }: InviteSheetProps) {
  const toast = useToast();
  const message = inviteMessage(group);
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Invita a tu gente"
      testID="invite-sheet"
      footer={
        <>
          <Button
            label="Compartir por WhatsApp"
            icon="share"
            accessibilityLabel="Compartir invitación por WhatsApp"
            onPress={() => void shareToWhatsApp(message)}
            fullWidth
            testID="invite-whatsapp"
          />
          <Button
            variant="outline"
            label="Compartir de otra forma"
            onPress={() => void shareText(message)}
            fullWidth
          />
          <Button
            variant="ghost"
            label="Copiar enlace"
            icon="copy"
            onPress={() => {
              void copyText(inviteLink(config.apiUrl, group.inviteCode));
              haptics.tapLight();
              toast.show('Enlace copiado');
            }}
            fullWidth
            testID="invite-copy-link"
          />
        </>
      }
    >
      <Text variant="body" color="textSecondary">
        Mándales el enlace: con un toque entran al grupo.
      </Text>
      <Text variant="label" color="textSecondary">
        Código
      </Text>
      <Text variant="code" align="center" testID="invite-code" selectable>
        {formatInviteCode(group.inviteCode)}
      </Text>
    </BottomSheet>
  );
}

// ---------- notifications pre-prompt ----------

export function NotificationPromptSheet() {
  const { visible, hide } = useNotificationPrompt();
  return (
    <BottomSheet
      visible={visible}
      onClose={hide}
      title="¿Te avisamos cuando hagan el sorteo?"
      testID="notif-sheet"
      footer={
        <>
          <Button
            label="Sí, avísame"
            icon="bell"
            fullWidth
            testID="notif-yes"
            onPress={() => {
              hide();
              void requestPushPermission();
            }}
          />
          <Button variant="ghost" label="Ahora no" fullWidth onPress={hide} testID="notif-no" />
        </>
      }
    >
      <Text variant="body" color="textSecondary">
        También te recordamos la fecha de entrega y te avisamos si tu amigo secreto te escribe.
      </Text>
    </BottomSheet>
  );
}

export { maybeOfferNotifications };
