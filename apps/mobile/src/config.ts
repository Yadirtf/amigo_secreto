/**
 * Build-time configuration. EXPO_PUBLIC_* variables are inlined by the Expo
 * bundler, so they must be read with the full `process.env.EXPO_PUBLIC_X`
 * expression (no destructuring).
 */
export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'https://entre-nos-api-staging.workers.dev').replace(
    /\/+$/,
    '',
  ),
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  helpUrl: process.env.EXPO_PUBLIC_HELP_URL ?? '',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.entrenos.amigosecreto',
} as const;

/**
 * Dev-only login for e2e/staging. In production builds EXPO_PUBLIC_APP_ENV is
 * "production" and EXPO_PUBLIC_DEV_LOGIN is unset, so the minifier removes the
 * branch entirely.
 */
export const DEV_LOGIN_ENABLED =
  process.env.EXPO_PUBLIC_APP_ENV !== 'production' && process.env.EXPO_PUBLIC_DEV_LOGIN === '1';

export const DEV_LOGIN_KEY = DEV_LOGIN_ENABLED ? (process.env.EXPO_PUBLIC_DEV_LOGIN_KEY ?? '') : '';
