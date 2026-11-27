import type { RandomSource } from '../ports.js';

/**
 * Alphabet without confusable characters (no 0/O, 1/I/L, U).
 * 10 symbols from 30 => ~49 bits, shown as XXXXX-XXXXX. With the join
 * rate limit this is infeasible to enumerate.
 */
export const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_LENGTH = 10;

export function generateInviteCode(random: RandomSource): string {
  let out = '';
  for (let i = 0; i < INVITE_LENGTH; i++) {
    out += INVITE_ALPHABET[random.int(INVITE_ALPHABET.length)];
  }
  return out;
}

/** Accepts user typing: lowercase, spaces and dashes. */
export function normalizeInviteCode(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, '');
  if (cleaned.length !== INVITE_LENGTH) return null;
  for (const ch of cleaned) if (!INVITE_ALPHABET.includes(ch)) return null;
  return cleaned;
}

export function formatInviteCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}
