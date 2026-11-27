/**
 * Build-time configuration. EXPO_PUBLIC_* variables are inlined by the Expo
 * bundler, so they must be read with the full `process.env.EXPO_PUBLIC_X`
 * expression (no destructuring).
 */
const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://entre-nos-api-staging.workers.dev'
).replace(/\/+$/, '');

/** The API serves the privacy policy itself (docs/tienda/politica-privacidad.md). */
const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL ?? `${apiUrl}/privacidad`;

export const config = {
  apiUrl,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  privacyUrl,
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? privacyUrl,
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
