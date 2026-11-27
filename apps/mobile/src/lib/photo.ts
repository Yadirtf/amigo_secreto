/**
 * Photo picking for avatars and group covers (ADR-0009): square crop,
 * 256×256, compressed (WebP, falling back to JPEG) to ≤ 30 KB, sent as a
 * data URI.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

const TARGET_BYTES = 30_000;
const SIZE = 256;

export type PhotoSource = 'camera' | 'library';

export type PickResult =
  { kind: 'ok'; dataUri: string } | { kind: 'cancelled' } | { kind: 'denied' } | { kind: 'failed' };

/** Approximate decoded size of a base64 string. */
function base64Bytes(b64: string): number {
  return Math.floor((b64.length * 3) / 4);
}

async function compress(uri: string): Promise<string | null> {
  const ref = await ImageManipulator.manipulate(uri)
    .resize({ width: SIZE, height: SIZE })
    .renderAsync();
  const attempts: [SaveFormat, number][] = [
    [SaveFormat.WEBP, 0.7],
    [SaveFormat.WEBP, 0.5],
    [SaveFormat.JPEG, 0.6],
    [SaveFormat.JPEG, 0.4],
    [SaveFormat.JPEG, 0.25],
  ];
  for (const [format, quality] of attempts) {
    try {
      const out = await ref.saveAsync({ format, compress: quality, base64: true });
      if (out.base64 && base64Bytes(out.base64) <= TARGET_BYTES) {
        return `data:image/${format === SaveFormat.WEBP ? 'webp' : 'jpeg'};base64,${out.base64}`;
      }
    } catch {
      // try the next format (some devices can't encode WebP)
    }
  }
  return null;
}

/** Asks for permission only when the user taps the option (in context). */
export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  try {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { kind: 'denied' };
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled) return { kind: 'cancelled' };
    const asset = res.assets[0];
    if (!asset) return { kind: 'cancelled' };
    const dataUri = await compress(asset.uri);
    return dataUri ? { kind: 'ok', dataUri } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}
