import * as C from '@entre-nos/contracts';
import {
  createGroup,
  deleteAccount,
  deleteGroup,
  getGroup,
  getMe,
  getMyAssignment,
  getMyWishlist,
  getReveal,
  joinGroup,
  listMessages,
  listMyGroups,
  previewInvite,
  putMyWishlist,
  redraw,
  removeMember,
  reopenGroup,
  reportThread,
  reveal,
  rotateInvite,
  runDraw,
  sendMessage,
  setExclusions,
  setGiverBlocked,
  setOrganizerParticipation,
  signInWithProvider,
  toMeView,
  updateGroup,
  updateProfile,
  type Deps,
} from '@entre-nos/domain';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { z } from 'zod';
import type { GoogleVerifier, TokenService } from '../infra/auth.js';
import type { PushTokenStore, RateLimiter } from '../infra/platform.js';
import { HttpError, toErrorResponse } from './errors.js';
import { landingPage, assetLinks } from './landing.js';
import { openApiDocument } from './openapi.js';
import { drainBackground } from '../infra/background.js';

export interface AppConfig {
  appEnv: 'staging' | 'production' | 'test';
  devLoginKey: string | null;
  androidPackage: string;
  playStoreUrl: string;
  certFingerprints: string[];
}

export interface Container {
  deps: Deps;
  tokens: TokenService;
  google: GoogleVerifier;
  pushTokens: PushTokenStore;
  rateLimiter: RateLimiter;
  config: AppConfig;
}

type Env = { Variables: { container: Container; userId: string } };
type Ctx = Context<Env>;

// ---------- helpers ----------

function firstIssue(error: z.ZodError): string {
  const path = error.issues[0]?.path.join('.') ?? '';
  return path || 'body';
}

async function body<S extends z.ZodType>(c: Ctx, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HttpError('INVALID_INPUT', { field: 'body' });
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError('INVALID_INPUT', { field: firstIssue(r.error) });
  return r.data;
}

function param(c: Ctx, name: string): string {
  const r = C.Id.safeParse(c.req.param(name));
  if (!r.success) throw new HttpError('NOT_FOUND');
  return r.data;
}

/** Validates every response against its contract (strict schemas strip nothing: they fail). */
function send<S extends z.ZodType>(
  c: Ctx,
  schema: S,
  data: z.input<S>,
  status: ContentfulStatusCode = 200,
) {
  const r = schema.safeParse(data);
  if (!r.success) throw new Error('response contract violation');
  return c.json(r.data as object, status);
}

const ok = (c: Ctx) => c.json({ ok: true as const });

async function limit(c: Ctx, key: string, max: number, windowSeconds: number) {
  const { rateLimiter, deps } = c.get('container');
  if (!(await rateLimiter.hit(key, max, windowSeconds, deps.clock.now()))) {
    c.header('Retry-After', String(windowSeconds));
    throw new HttpError('RATE_LIMITED');
  }
}

const clientIp = (c: Ctx) => c.req.header('cf-connecting-ip') ?? 'unknown';
const dayFromIso = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function sessionResponse(c: Ctx, user: Parameters<typeof toMeView>[0], isNew: boolean) {
  const { tokens, deps } = c.get('container');
  const s = await tokens.start(user.id, deps.clock.now());
  return send(c, C.Session, { ...s, user: toMeView(user), isNew });
}

// ---------- app ----------

export function createApp(getContainer: (c: Context) => Promise<Container> | Container) {
  const app = new Hono<Env>();

  app.onError((e, c) => {
    const { status, body: payload } = toErrorResponse(e);
    if (status >= 500) {
      // Never log bodies, tokens, ids or message content (threat model C-08).
      console.error(
        `error ${c.req.method} ${c.req.routePath} ${e instanceof Error ? e.name : 'unknown'}`,
      );
    }
    return c.json(payload, status);
  });
  app.notFound((c) => c.json(toErrorResponse(new HttpError('NOT_FOUND')).body, 404));

  // Security headers for everything.
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Frame-Options', 'DENY');
    c.header('Strict-Transport-Security', 'max-age=31536000');
  });

  app.use('*', async (c, next) => {
    c.set('container', await getContainer(c));
    await next();
    // Push notifications run after the response (PT-10).
    const pending = drainBackground();
    if (pending) {
      try {
        c.executionCtx.waitUntil(pending);
      } catch {
        await pending; // tests / runtimes without an execution context
      }
    }
  });

  app.get('/health', (c) => c.json({ ok: true }));
  app.get('/.well-known/assetlinks.json', (c) => {
    const { config } = c.get('container');
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(assetLinks(config.androidPackage, config.certFingerprints));
  });
  // Landing for invite links: never touches the database (no code oracle).
  app.get('/i/:code', (c) => {
    const { config } = c.get('container');
    c.header('Cache-Control', 'public, max-age=300');
    c.header(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'",
    );
    return c.html(landingPage(c.req.param('code'), config.playStoreUrl, config.androidPackage));
  });

  const v1 = new Hono<Env>();

  // The mobile app sends no Origin; browsers do. No CORS for the API (threat model).
  v1.use('*', async (c, next) => {
    if (c.req.header('origin')) throw new HttpError('FORBIDDEN');
    await next();
    c.header('Cache-Control', 'no-store');
  });
  v1.use(
    '*',
    bodyLimit({
      maxSize: 100 * 1024,
      onError: () => {
        throw new HttpError('INVALID_INPUT', { field: 'body' });
      },
    }),
  );

  v1.get('/openapi.json', (c) => c.json(openApiDocument()));

  // ----- auth (public) -----
  v1.post('/auth/google', async (c) => {
    await limit(c, `auth:ip:${clientIp(c)}`, 20, 60);
    const { idToken } = await body(c, C.GoogleSignInRequest);
    const { google, deps } = c.get('container');
    const identity = await google.verify(idToken);
    if (!identity) throw new HttpError('UNAUTHORIZED');
    const { user, isNew } = await signInWithProvider(deps, { provider: 'google', ...identity });
    return sessionResponse(c, user, isNew);
  });

  v1.post('/auth/dev', async (c) => {
    const { config, deps } = c.get('container');
    // Staging/e2e only. Disabled unless a key is configured, never in production.
    if (config.appEnv === 'production' || !config.devLoginKey) throw new HttpError('NOT_FOUND');
    await limit(c, `auth:ip:${clientIp(c)}`, 20, 60);
    const { key, name } = await body(c, C.DevSignInRequest);
    if (key !== config.devLoginKey) throw new HttpError('UNAUTHORIZED');
    const { user, isNew } = await signInWithProvider(deps, {
      provider: 'google',
      sub: `dev:${name.toLowerCase()}`,
      email: null,
      name,
    });
    return sessionResponse(c, user, isNew);
  });

  v1.post('/auth/refresh', async (c) => {
    await limit(c, `refresh:ip:${clientIp(c)}`, 60, 60);
    const { refreshToken } = await body(c, C.RefreshRequest);
    const { tokens, deps } = c.get('container');
    const s = await tokens.refresh(refreshToken, deps.clock.now());
    if (!s) throw new HttpError('UNAUTHORIZED');
    const user = await deps.users.findById(s.userId);
    if (!user) throw new HttpError('UNAUTHORIZED');
    return send(c, C.Session, {
      accessToken: s.accessToken,
      accessTokenExpiresAt: s.accessTokenExpiresAt,
      refreshToken: s.refreshToken,
      user: toMeView(user),
      isNew: false,
    });
  });

  // ----- authenticated -----
  v1.use('*', async (c, next) => {
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const { tokens, deps } = c.get('container');
    const auth = token ? await tokens.verifyAccess(token, deps.clock.now()) : null;
    if (!auth) throw new HttpError('UNAUTHORIZED');
    c.set('userId', auth.userId);
    await limit(c, `user:${auth.userId}`, 120, 60);
    await next();
  });

  const me = (c: Ctx) => c.get('userId');
  const deps = (c: Ctx) => c.get('container').deps;

  v1.post('/auth/logout', async (c) => {
    const { refreshToken, pushToken } = await body(c, C.LogoutRequest);
    const { tokens, pushTokens } = c.get('container');
    await tokens.revoke(refreshToken, me(c));
    if (pushToken) await pushTokens.removeOwned(pushToken, me(c));
    return ok(c);
  });

  v1.get('/me', async (c) => send(c, C.Me, await getMe(deps(c), me(c))));
  v1.patch('/me', async (c) => {
    const input = await body(c, C.UpdateMeRequest);
    return send(c, C.Me, await updateProfile(deps(c), me(c), input));
  });
  v1.delete('/me', async (c) => {
    // Re-authentication: a stolen access token alone can't delete the account.
    const { idToken } = await body(c, C.DeleteMeRequest);
    const { google, config, tokens, pushTokens } = c.get('container');
    const user = await deps(c).users.findById(me(c));
    if (!user) throw new HttpError('NOT_FOUND');
    const isDevUser = (user.googleSub ?? '').startsWith('dev:') && config.appEnv !== 'production';
    if (!isDevUser) {
      const identity = idToken ? await google.verify(idToken) : null;
      if (!identity || identity.sub !== user.googleSub) throw new HttpError('UNAUTHORIZED');
    }
    await deleteAccount(deps(c), me(c));
    await pushTokens.removeForUser(me(c));
    await tokens.revokeAll(me(c));
    return ok(c);
  });
  v1.put('/me/push-token', async (c) => {
    const { token } = await body(c, C.PushTokenRequest);
    await c.get('container').pushTokens.put(token, me(c), deps(c).clock.now());
    return ok(c);
  });

  // ----- groups -----
  v1.get('/groups', async (c) =>
    send(c, C.GroupList, { groups: await listMyGroups(deps(c), me(c)) }),
  );
  v1.post('/groups', async (c) => {
    await limit(c, `create:${me(c)}`, 20, 86_400);
    const input = await body(c, C.CreateGroupRequest);
    const g = await createGroup(deps(c), me(c), {
      ...input,
      deliveryDate: dayFromIso(input.deliveryDate),
    });
    return send(c, C.GroupDetail, g, 201);
  });
  v1.post('/groups/join', async (c) => {
    await limit(c, `join:${me(c)}`, 10, 60);
    await limit(c, `join:ip:${clientIp(c)}`, 30, 60);
    const { code } = await body(c, C.JoinRequest);
    return send(c, C.GroupDetail, await joinGroup(deps(c), me(c), code));
  });
  v1.get('/invites/:code', async (c) => {
    await limit(c, `join:${me(c)}`, 10, 60);
    const r = C.InviteCodeInput.safeParse(c.req.param('code'));
    if (!r.success) throw new HttpError('INVITE_INVALID');
    return send(c, C.InvitePreview, await previewInvite(deps(c), me(c), r.data));
  });
  v1.get('/groups/:id', async (c) =>
    send(c, C.GroupDetail, await getGroup(deps(c), me(c), param(c, 'id'))),
  );
  v1.patch('/groups/:id', async (c) => {
    const input = await body(c, C.UpdateGroupRequest);
    const g = await updateGroup(deps(c), me(c), param(c, 'id'), {
      ...input,
      deliveryDate: input.deliveryDate ? dayFromIso(input.deliveryDate) : undefined,
    });
    return send(c, C.GroupDetail, g);
  });
  v1.delete('/groups/:id', async (c) => {
    await deleteGroup(deps(c), me(c), param(c, 'id'));
    return ok(c);
  });
  v1.post('/groups/:id/invite/rotate', async (c) =>
    send(c, C.GroupDetail, await rotateInvite(deps(c), me(c), param(c, 'id'))),
  );
  v1.delete('/groups/:id/members/:userId', async (c) => {
    await removeMember(deps(c), me(c), param(c, 'id'), param(c, 'userId'));
    return ok(c);
  });
  v1.put('/groups/:id/participation', async (c) => {
    const { participates } = await body(c, C.ParticipationRequest);
    return send(
      c,
      C.GroupDetail,
      await setOrganizerParticipation(deps(c), me(c), param(c, 'id'), participates),
    );
  });
  v1.put('/groups/:id/exclusions', async (c) => {
    const { exclusions } = await body(c, C.ExclusionsRequest);
    return send(c, C.GroupDetail, await setExclusions(deps(c), me(c), param(c, 'id'), exclusions));
  });
  v1.post('/groups/:id/draw', async (c) => {
    await limit(c, `draw:${me(c)}`, 10, 3600);
    return send(c, C.GroupDetail, await runDraw(deps(c), me(c), param(c, 'id')));
  });
  v1.post('/groups/:id/redraw', async (c) => {
    await body(c, C.ConfirmRequest);
    await limit(c, `draw:${me(c)}`, 10, 3600);
    return send(c, C.GroupDetail, await redraw(deps(c), me(c), param(c, 'id')));
  });
  v1.post('/groups/:id/reopen', async (c) => {
    await body(c, C.ConfirmRequest);
    return send(c, C.GroupDetail, await reopenGroup(deps(c), me(c), param(c, 'id')));
  });
  v1.post('/groups/:id/reveal', async (c) => {
    await body(c, C.ConfirmRequest);
    return send(c, C.GroupDetail, await reveal(deps(c), me(c), param(c, 'id')));
  });
  v1.get('/groups/:id/reveal', async (c) =>
    send(c, C.Reveal, await getReveal(deps(c), me(c), param(c, 'id'))),
  );
  v1.get('/groups/:id/assignment', async (c) =>
    send(c, C.MyAssignment, await getMyAssignment(deps(c), me(c), param(c, 'id'))),
  );
  v1.get('/groups/:id/wishlist', async (c) =>
    send(c, C.WishlistResponse, { items: await getMyWishlist(deps(c), me(c), param(c, 'id')) }),
  );
  v1.put('/groups/:id/wishlist', async (c) => {
    const { items } = await body(c, C.PutWishlistRequest);
    return send(c, C.WishlistResponse, {
      items: await putMyWishlist(deps(c), me(c), param(c, 'id'), items),
    });
  });

  // ----- anonymous chat -----
  const side = (c: Ctx) => {
    const r = C.ChatSide.safeParse(c.req.param('side'));
    if (!r.success) throw new HttpError('NOT_FOUND');
    return r.data;
  };
  v1.get('/groups/:id/chat/:side', async (c) => {
    const q = C.ChatQuery.safeParse(c.req.query());
    if (!q.success) throw new HttpError('INVALID_INPUT', { field: firstIssue(q.error) });
    const thread = await listMessages(deps(c), me(c), param(c, 'id'), side(c), {
      limit: q.data.limit,
      before: q.data.before ? new Date(q.data.before) : undefined,
    });
    return send(c, C.ChatThread, thread);
  });
  v1.post('/groups/:id/chat/:side/messages', async (c) => {
    await limit(c, `msg:${me(c)}`, 20, 60);
    const { text } = await body(c, C.SendMessageRequest);
    return send(
      c,
      C.ChatMessage,
      await sendMessage(deps(c), me(c), param(c, 'id'), side(c), text),
      201,
    );
  });
  v1.put('/groups/:id/chat/receiver/block', async (c) => {
    const { blocked } = await body(c, C.BlockRequest);
    await setGiverBlocked(deps(c), me(c), param(c, 'id'), blocked);
    return ok(c);
  });
  v1.post('/groups/:id/chat/:side/report', async (c) => {
    await limit(c, `report:${me(c)}`, 10, 86_400);
    const input = await body(c, C.ReportRequest);
    await reportThread(deps(c), me(c), param(c, 'id'), side(c), input);
    return ok(c);
  });

  app.route('/v1', v1);
  return app;
}
