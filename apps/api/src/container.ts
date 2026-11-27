import { defaultPolicy, type Clock } from '@entre-nos/domain';
import type { AppConfig, Container } from './http/app.js';
import { JoseGoogleVerifier, TokenService } from './infra/auth.js';
import { AssignmentCipher, cryptoIds, cryptoRandom } from './infra/crypto.js';
import {
  collections,
  getMongo,
  MongoAssignments,
  MongoGroups,
  MongoMessages,
  MongoReports,
  MongoUsers,
  MongoWishlists,
} from './infra/mongo.js';
import { MongoPushTokens, MongoRateLimiter, MongoSessions } from './infra/platform.js';
import { ExpoPushService } from './infra/push.js';

export interface WorkerEnv {
  APP_ENV: 'staging' | 'production';
  MONGODB_URI: string;
  JWT_SECRET: string;
  ASSIGNMENT_KEY: string;
  GOOGLE_CLIENT_IDS: string;
  EXPO_ACCESS_TOKEN?: string;
  DEV_LOGIN_KEY?: string;
  ANDROID_PACKAGE: string;
  PLAY_STORE_URL: string;
  ANDROID_CERT_FINGERPRINTS: string;
  /** Optional: free tier "max members" switch, empty = unlimited (ADR-0005). */
  MAX_MEMBERS_FREE?: string;
}

const systemClock: Clock = { now: () => new Date() };
const split = (s: string | undefined) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

let cache: { key: string; container: Promise<Container> } | null = null;

/** Builds (once per isolate) the dependency graph from Worker bindings. */
export function containerFromEnv(env: WorkerEnv): Promise<Container> {
  const key = `${env.APP_ENV}|${env.MONGODB_URI.length}|${env.JWT_SECRET.length}`;
  if (cache?.key === key) return cache.container;
  const container = (async () => {
    const client = await getMongo(env.MONGODB_URI);
    const c = collections(client.db());
    const cipher = await AssignmentCipher.fromSecret(env.ASSIGNMENT_KEY);
    const pushTokens = new MongoPushTokens(c);
    const maxFree = env.MAX_MEMBERS_FREE ? Number(env.MAX_MEMBERS_FREE) : null;
    const config: AppConfig = {
      appEnv: env.APP_ENV,
      devLoginKey: env.APP_ENV === 'production' ? null : (env.DEV_LOGIN_KEY ?? null),
      androidPackage: env.ANDROID_PACKAGE,
      playStoreUrl: env.PLAY_STORE_URL,
      certFingerprints: split(env.ANDROID_CERT_FINGERPRINTS),
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
        notifications: new ExpoPushService(pushTokens, env.EXPO_ACCESS_TOKEN),
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
    } satisfies Container;
  })();
  container.catch(() => {
    cache = null;
  });
  cache = { key, container };
  return container;
}
