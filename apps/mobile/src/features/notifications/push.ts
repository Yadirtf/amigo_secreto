/**
 * Push notifications (Expo Push → FCM). Permission is requested in context
 * only (after the first group is created/joined), never at launch.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { Href } from 'expo-router';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { tokens } from '@entre-nos/ui';
import { api } from '../../api';
import { usePrefs } from '../../state/prefs';

/** Android channels (flujos §Notificaciones), names in Spanish. */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { AndroidImportance, AndroidNotificationVisibility } = Notifications;
  const channels: [string, string, Notifications.AndroidImportance][] = [
    ['sorteo', 'Sorteo y revelación', AndroidImportance.HIGH],
    ['mensajes', 'Mensajes secretos', AndroidImportance.HIGH],
    ['recordatorios', 'Recordatorios y fechas', AndroidImportance.DEFAULT],
    ['grupo', 'Cambios en tus grupos', AndroidImportance.LOW],
  ];
  await Promise.all(
    channels.map(([id, name, importance]) =>
      Notifications.setNotificationChannelAsync(id, {
        name,
        importance,
        // Content is generic anyway; keep it private on the lock screen.
        lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
        lightColor: tokens.color.light.primary,
      }).catch(() => null),
    ),
  );
}

export function configureForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

async function sendToken(): Promise<boolean> {
  if (!Device.isDevice) return false;
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await api.me.pushToken(token.data);
    return true;
  } catch {
    return false;
  }
}

/** On launch (signed in): refreshes the token only if permission was already granted. */
export async function syncPushTokenIfGranted(): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.granted) await sendToken();
  } catch {
    // ignore
  }
}

/** After the user said "Sí, avísame". */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;
    return await sendToken();
  } catch {
    return false;
  }
}

export async function pushPermissionGranted(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

// ---------- pre-prompt sheet ----------

interface PromptState {
  visible: boolean;
  show: () => void;
  hide: () => void;
}

export const useNotificationPrompt = create<PromptState>((set) => ({
  visible: false,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));

/**
 * Offers the pre-prompt at most twice in total (after the first group, and
 * once more after a draw), and never if permission is already granted.
 */
export async function maybeOfferNotifications(): Promise<void> {
  const prefs = usePrefs.getState();
  if (prefs.notificationPromptCount >= 2) return;
  if (await pushPermissionGranted()) return;
  prefs.bumpNotificationPrompt();
  useNotificationPrompt.getState().show();
}

// ---------- taps → routes (docs/API.md) ----------

type PushType =
  'draw_done' | 'group_reopened' | 'new_message' | 'revealed' | 'countdown' | 'member_joined';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Maps a notification payload to a route. Unknown payloads are ignored. */
export function routeForNotification(data: unknown): Href | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as { type?: unknown; groupId?: unknown; side?: unknown };
  if (typeof d.groupId !== 'string' || !ID_RE.test(d.groupId)) return null;
  const id = d.groupId;
  switch (d.type as PushType) {
    case 'new_message':
      return d.side === 'giver'
        ? { pathname: '/grupo/[id]/amigo', params: { id, tab: 'chat' } }
        : { pathname: '/grupo/[id]/chat', params: { id } };
    case 'draw_done':
      return { pathname: '/grupo/[id]/revelar', params: { id } };
    case 'revealed':
      return { pathname: '/grupo/[id]/revelacion', params: { id } };
    case 'countdown':
    case 'group_reopened':
    case 'member_joined':
      return { pathname: '/grupo/[id]', params: { id } };
    default:
      return null;
  }
}
