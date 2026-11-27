import { defaultPolicy, type Clock } from '@entre-nos/domain';
import type { AppConfig, Container } from './http/app.js';
import { JoseGoogleVerifier, TokenService } from './infra/auth.js';
import { AssignmentCipher, cryptoIds, cryptoRandom } from './infra/crypto.js';
import {
  collections,
  newMongoClient,
  MongoAssignments,
  MongoGroups,
  MongoMessages,
  MongoReports,
  MongoUsers,
  MongoWishlists,
} from './infra/mongo.js';
import { MongoPushTokens, MongoRateLimiter, MongoSessions } from './infra/platform.js';
import { ExpoPushService } from './infra/push.js';
import { BackgroundQueue } from './infra/background.js';

export interface WorkerEnv {
  APP_ENV: 'staging' | 'production';
  MONGODB_URI: string;
  /** Database name; overrides the one in the URI so both envs can share a cluster. */
  MONGODB_DB?: string;
  JWT_SECRET: string;
  ASSIGNMENT_KEY: string;
  GOOGLE_CLIENT_IDS: string;
  EXPO_ACCESS_TOKEN?: string;
  DEV_LOGIN_KEY?: string;
  ANDROID_PACKAGE: string;
  PLAY_STORE_URL: string;
  ANDROID_CERT_FINGERPRINTS: string;
  /** Optional public contact for the privacy policy page. */
  CONTACT_EMAIL?: string;
  /** Optional: free tier "max members" switch, empty = unlimited (ADR-0005). */
  MAX_MEMBERS_FREE?: string;
}

const systemClock: Clock = { now: () => new Date() };
const split = (s: string | undefined) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

let cipherCache: { key: string; cipher: Promise<AssignmentCipher> } | null = null;

/** Keys are pure crypto objects and can be shared by requests in an isolate. */
function cipherFor(secret: string): Promise<AssignmentCipher> {
  if (cipherCache?.key === secret) return cipherCache.cipher;
  const cipher = AssignmentCipher.fromSecret(secret);
  cipher.catch(() => {
    cipherCache = null;
  });
  cipherCache = { key: secret, cipher };
  return cipher;
}

/**
 * Builds the dependency graph for ONE request (or cron run). Call `dispose`
 * when the work, including background push, is done.
 */
export async function containerFromEnv(env: WorkerEnv): Promise<Container> {
  const client = newMongoClient(env.MONGODB_URI);
  const background = new BackgroundQueue();
  const c = collections(client.db(env.MONGODB_DB?.trim() || undefined));
  const cipher = await cipherFor(env.ASSIGNMENT_KEY);
  const pushTokens = new MongoPushTokens(c);
  const maxFree = env.MAX_MEMBERS_FREE ? Number(env.MAX_MEMBERS_FREE) : null;
  const config: AppConfig = {
    appEnv: env.APP_ENV,
    devLoginKey: env.APP_ENV === 'production' ? null : (env.DEV_LOGIN_KEY ?? null),
    androidPackage: env.ANDROID_PACKAGE,
    playStoreUrl: env.PLAY_STORE_URL,
    certFingerprints: split(env.ANDROID_CERT_FINGERPRINTS),
    contactEmail: env.CONTACT_EMAIL?.trim() || null,
  };
  return {
    deps: {
      clock: systemClock,
      random: cryptoRandom,
      ids: cryptoIds,
      users: new MongoUsers(c),
      groups: new MongoGroups(c),
      assignments: new MongoAssignments(c, cipher),
      messages: new MongoMessages(c),
      wishlists: new MongoWishlists(c),
      reports: new MongoReports(c),
      notifications: new ExpoPushService(pushTokens, env.EXPO_ACCESS_TOKEN, background),
      policy: {
        ...defaultPolicy,
        maxMembersFree: maxFree && Number.isInteger(maxFree) && maxFree > 0 ? maxFree : null,
      },
    },
    tokens: new TokenService(env.JWT_SECRET, new MongoSessions(c)),
    google: new JoseGoogleVerifier(split(env.GOOGLE_CLIENT_IDS)),
    pushTokens,
    rateLimiter: new MongoRateLimiter(c),
    config,
    background,
    dispose: () => client.close(),
  } satisfies Container;
}
