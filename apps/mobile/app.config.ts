import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Entre Nos – amigo secreto. Values that change per environment come from
 * EXPO_PUBLIC_* / EAS env vars (see .env.example and eas.json).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://entre-nos-api-staging.workers.dev';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

function hostOf(url: string): string {
  const m = /^https?:\/\/([^/:?#]+)/i.exec(url);
  return m?.[1] ?? 'entre-nos-api-staging.workers.dev';
}

const BRAND = {
  cream: '#FFF7F2',
  lavender: '#F3EDFF',
  plum: '#18141F',
  coral: '#FF7F6B',
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === 'production' ? 'Entre Nos – amigo secreto' : 'Entre Nos (staging)',
  slug: 'entre-nos',
  scheme: 'entrenos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    bundleIdentifier: 'com.entrenos.amigosecreto',
    supportsTablet: true,
    associatedDomains: [`applinks:${hostOf(API_URL)}`],
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'com.entrenos.amigosecreto',
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-monochrome.png',
      backgroundColor: BRAND.lavender,
    },
    allowBackup: false,
    predictiveBackGestureEnabled: false,
    softwareKeyboardLayoutMode: 'resize',
    permissions: ['android.permission.POST_NOTIFICATIONS', 'android.permission.CAMERA'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: hostOf(API_URL), pathPrefix: '/i/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    './plugins/withReleaseSigning',
    'expo-router',
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-font',
    'expo-system-ui',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
        backgroundColor: BRAND.cream,
        dark: { image: './assets/splash-icon.png', backgroundColor: BRAND.plum },
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: BRAND.coral,
        defaultChannel: 'sorteo',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Para elegir la foto de tu perfil o de tu grupo.',
        cameraPermission: 'Para tomar la foto de tu perfil o de tu grupo.',
        microphonePermission: false,
      },
    ],
    '@react-native-community/datetimepicker',
    [
      '@react-native-google-signin/google-signin',
      {
        // iOS only (not published yet). Android uses the web client id at runtime.
        iosUrlScheme:
          process.env.GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.entrenos-placeholder',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Uncompressed bundle: Hermes can mmap it, faster cold start on low-end phones
          // (Play compresses the download anyway).
          enableBundleCompression: false,
          // Only the CI e2e build talks to a local http API (10.0.2.2).
          usesCleartextTraffic: process.env.E2E_CLEARTEXT === '1',
          manifestQueries: {
            package: ['com.whatsapp', 'com.whatsapp.w4b'],
            intent: [{ action: 'VIEW', data: { scheme: 'whatsapp' } }],
          },
        },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    appEnv: APP_ENV,
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
