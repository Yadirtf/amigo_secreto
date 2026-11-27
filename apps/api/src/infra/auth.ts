import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTVerifyGetKey } from 'jose';
import { randomToken, sha256 } from './crypto.js';
import type { SessionStore } from './platform.js';

/** Verified identity from Google (ADR-0007). */
export interface GoogleIdentity {
  sub: string;
  email: string | null;
  name: string | null;
}

export interface GoogleVerifier {
  verify(idToken: string): Promise<GoogleIdentity | null>;
}

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let googleJwks: JWTVerifyGetKey | null = null;

export class JoseGoogleVerifier implements GoogleVerifier {
  constructor(
    private readonly clientIds: string[],
    private readonly jwks: JWTVerifyGetKey = (googleJwks ??= createRemoteJWKSet(
      new URL('https://www.googleapis.com/oauth2/v3/certs'),
    )),
  ) {}

  async verify(idToken: string): Promise<GoogleIdentity | null> {
    if (this.clientIds.length === 0) return null;
    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: this.clientIds,
        algorithms: ['RS256'],
        clockTolerance: 30,
      });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
      const email = typeof payload.email === 'string' ? payload.email : null;
      if (email && payload.email_verified !== true) return null;
      return {
        sub: payload.sub,
        email,
        name: typeof payload.name === 'string' ? payload.name : null,
      };
    } catch {
      return null;
    }
  }
}

const ACCESS_TTL_S = 15 * 60;
const REFRESH_TTL_MS = 30 * 86_400_000;
/** A session family never lives longer than this, even if used daily. */
const ABSOLUTE_TTL_MS = 90 * 86_400_000;
/** A refresh replayed within this window (parallel requests) is refused without revoking. */
const REUSE_GRACE_MS = 15_000;
const ISSUER = 'entre-nos-api';
const AUDIENCE = 'entre-nos-app';

export interface IssuedSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly sessions: SessionStore,
  ) {
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
    this.key = new TextEncoder().encode(secret);
  }

  private async access(userId: string, sessionId: string, now: Date) {
    const exp = Math.floor(now.getTime() / 1000) + ACCESS_TTL_S;
    const token = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', kid: 'v1', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(exp)
      .sign(this.key);
    return { accessToken: token, accessTokenExpiresAt: new Date(exp * 1000).toISOString() };
  }

  async start(userId: string, now: Date): Promise<IssuedSession> {
    const refreshToken = randomToken(32);
    const id = crypto.randomUUID();
    await this.sessions.create({
      _id: id,
      userId,
      currentHash: await sha256(refreshToken),
      previousHash: null,
      usedHashes: [],
      rotatedAt: now,
      expiresAt: new Date(now.getTime() + REFRESH_TTL_MS),
      absoluteExpiresAt: new Date(now.getTime() + ABSOLUTE_TTL_MS),
      revoked: false,
    });
    return { ...(await this.access(userId, id, now)), refreshToken };
  }

  /** Rotates the refresh token. Reuse of an old token revokes the whole family. */
  async refresh(
    refreshToken: string,
    now: Date,
  ): Promise<(IssuedSession & { userId: string }) | null> {
    const hash = await sha256(refreshToken);
    const current = await this.sessions.findByCurrent(hash);
    if (current) {
      if (current.revoked || current.expiresAt <= now || current.absoluteExpiresAt <= now) {
        return null;
      }
      const next = randomToken(32);
      const expiresAt = new Date(
        Math.min(now.getTime() + REFRESH_TTL_MS, current.absoluteExpiresAt.getTime()),
      );
      const ok = await this.sessions.rotate(current._id, hash, await sha256(next), now, expiresAt);
      if (!ok) return null;
      return {
        ...(await this.access(current.userId, current._id, now)),
        refreshToken: next,
        userId: current.userId,
      };
    }
    // Reuse of any already-rotated token revokes the family (PT-04), except the
    // immediately previous one within a short grace window (parallel refresh).
    const old = await this.sessions.findByUsed(hash);
    if (old) {
      const graceful =
        old.previousHash === hash && now.getTime() - old.rotatedAt.getTime() <= REUSE_GRACE_MS;
      if (!graceful) await this.sessions.revoke(old._id);
    }
    return null;
  }

  async revoke(refreshToken: string, userId: string): Promise<void> {
    const s = await this.sessions.findByCurrent(await sha256(refreshToken));
    if (s && s.userId === userId) await this.sessions.revoke(s._id);
  }

  /** Revokes every session of a user (account deletion). */
  async revokeAll(userId: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId);
  }

  /** Verifies an access token and that its session is still active. */
  async verifyAccess(
    token: string,
    now: Date,
  ): Promise<{ userId: string; sessionId: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
        currentDate: now,
      });
      const sid = payload.sid;
      if (typeof payload.sub !== 'string' || typeof sid !== 'string') return null;
      if (!(await this.sessions.isActive(sid, now))) return null;
      return { userId: payload.sub, sessionId: sid };
    } catch {
      return null;
    }
  }
}
