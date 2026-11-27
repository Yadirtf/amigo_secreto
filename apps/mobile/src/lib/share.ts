import * as Clipboard from 'expo-clipboard';
import { Linking, Share } from 'react-native';
import { config } from '../config';
import { formatCop, formatDayLong } from './format';
import { formatInviteCode, inviteLink } from './invite';
import { isSafeHttpsUrl } from './links';

export interface InviteInfo {
  name: string;
  deliveryDate: string;
  budgetCop: number | null;
  inviteCode: string;
}

/** Exact WhatsApp copy from flujos.md (S5 Invitar). */
export function inviteMessage(g: InviteInfo): string {
  const link = inviteLink(config.apiUrl, g.inviteCode);
  const budget = g.budgetCop !== null ? ` · Presupuesto: ${formatCop(g.budgetCop)}` : '';
  return [
    `¡Hola! Te invito al amigo secreto *${g.name}* 🎁`,
    `Entrega: ${formatDayLong(g.deliveryDate)}${budget}`,
    `Únete aquí: ${link}`,
    `Si te pide el código: *${formatInviteCode(g.inviteCode)}*`,
  ].join('\n');
}

/** Opens WhatsApp with the text; falls back to the system share sheet. */
export async function shareToWhatsApp(text: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
  try {
    await Linking.openURL(url);
  } catch {
    await shareText(text);
  }
}

export async function shareText(text: string): Promise<void> {
  try {
    await Share.share({ message: text });
  } catch {
    // dismissed
  }
}

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

export async function readClipboard(): Promise<string> {
  try {
    return await Clipboard.getStringAsync();
  } catch {
    return '';
  }
}

/** Only https links leave the app (wishlist links can't be intent:// or javascript:). */
export async function openExternal(url: string | null | undefined): Promise<boolean> {
  if (!isSafeHttpsUrl(url)) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
