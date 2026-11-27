import type { IdGenerator, RandomSource } from '@entre-nos/domain';
import { generateInviteCode } from '@entre-nos/domain';

/** Cryptographically secure uniform integers (rejection sampling, no modulo bias). */
export const cryptoRandom: RandomSource = {
  int(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 2 ** 32) {
      throw new RangeError('maxExclusive out of range');
    }
    const limit = Math.floor(2 ** 32 / maxExclusive) * maxExclusive;
    const buf = new Uint32Array(1);
    for (;;) {
      crypto.getRandomValues(buf);
      const v = buf[0] as number;
      if (v < limit) return v % maxExclusive;
    }
  },
};

/** Random UUID v4 ids (never Mongo ObjectIds: they leak time and a counter). */
export const cryptoIds: IdGenerator = {
  id: () => crypto.randomUUID(),
  inviteCode: () => generateInviteCode(cryptoRandom),
};

const enc = new TextEncoder();

export function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64(b64: string): Uint8Array {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '='.repeat((4 - (norm.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return base64url(b);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return base64url(new Uint8Array(digest));
}

/**
 * Field-level protection for assignments (threat model C-02): the receiver id
 * is stored encrypted (AES-GCM) plus a keyed HMAC for lookups, so a database
 * dump alone does not reveal who gives to whom.
 */
export class AssignmentCipher {
  private constructor(
    private readonly aes: CryptoKey,
    private readonly hmac: CryptoKey,
  ) {}

  static async fromSecret(secretB64: string): Promise<AssignmentCipher> {
    const raw = fromBase64(secretB64);
    if (raw.length < 32) throw new Error('ASSIGNMENT_KEY must be at least 32 bytes');
    const base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
    const derive = (
      info: string,
      alg: Parameters<SubtleCrypto['deriveKey']>[2],
      usages: Parameters<SubtleCrypto['deriveKey']>[4],
    ) =>
      crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) },
        base,
        alg,
        false,
        usages,
      );
    const aes = await derive('entre-nos/assignment/aes', { name: 'AES-GCM', length: 256 }, [
      'encrypt',
      'decrypt',
    ]);
    const hmac = await derive(
      'entre-nos/assignment/hmac',
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      ['sign'],
    );
    return new AssignmentCipher(aes, hmac);
  }

  async lookup(groupId: string, userId: string): Promise<string> {
    const sig = await crypto.subtle.sign('HMAC', this.hmac, enc.encode(`${groupId}|${userId}`));
    return base64url(new Uint8Array(sig));
  }

  async encrypt(groupId: string, value: string): Promise<string> {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: enc.encode(groupId) },
      this.aes,
      enc.encode(value),
    );
    return `${base64url(iv)}.${base64url(new Uint8Array(ct))}`;
  }

  async decrypt(groupId: string, payload: string): Promise<string> {
    const [iv, ct] = payload.split('.');
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv ?? ''), additionalData: enc.encode(groupId) },
      this.aes,
      fromBase64(ct ?? ''),
    );
    return new TextDecoder().decode(pt);
  }
}
