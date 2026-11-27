import { formatInviteCode, INVITE_LENGTH, normalizeInviteCode } from '@entre-nos/domain';

/**
 * Live formatting for the code field: uppercase, letters/digits only, at most
 * 10 characters, and the dash after the fifth ("ABCDE-FGHJK").
 */
export function formatCodeInput(text: string): string {
  const clean = text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, INVITE_LENGTH);
  return clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
}

const LINK_CODE = /\/i\/([A-Za-z0-9-]{10,14})(?:[/?#]|$)/;

/**
 * Accepts what people paste: the bare code (with or without dash/spaces) or
 * a full invitation link (https://…/i/CODE or entrenos://i/CODE).
 * Returns the normalized 10-char code or null.
 */
export function extractInviteCode(text: string): string | null {
  const trimmed = text.trim();
  const fromLink = LINK_CODE.exec(trimmed);
  if (fromLink?.[1]) return normalizeInviteCode(fromLink[1]);
  const words = trimmed.match(/[A-Za-z0-9][A-Za-z0-9 -]{8,14}[A-Za-z0-9]/g) ?? [];
  for (const w of words) {
    const code = normalizeInviteCode(w);
    if (code) return code;
  }
  return normalizeInviteCode(trimmed);
}

/** Deep-link param validation: only a well-formed code is accepted. */
export function validDeepLinkCode(param: unknown): string | null {
  if (typeof param !== 'string' || param.length > 14) return null;
  return normalizeInviteCode(param);
}

export function inviteLink(apiUrl: string, code: string): string {
  return `${apiUrl.replace(/\/+$/, '')}/i/${code}`;
}

export { formatInviteCode };
