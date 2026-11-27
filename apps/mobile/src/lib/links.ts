import { validateLink } from '@entre-nos/domain';

/**
 * Normalizes a wishlist link typed or pasted by the user: prepends https://
 * when there is no scheme and accepts only https (no javascript:, intent:,
 * data:, credentials). Returns null for an empty input; throws on invalid.
 */
export function normalizeWishLink(input: string): string | null {
  const v = input.trim();
  if (v === '') return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  const result = validateLink(withScheme);
  if (result === null) return null;
  // Must look like a real host (has a dot, no spaces).
  const host = hostOf(result);
  if (!host || !host.includes('.') || /\s/.test(v)) throw new Error('invalid link');
  return result;
}

export function isSafeHttpsUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return validateLink(url) !== null;
  } catch {
    return false;
  }
}

function hostOf(url: string): string | null {
  const m = /^https:\/\/([^/?#:]+)/i.exec(url);
  return m?.[1]?.toLowerCase() ?? null;
}

/** "https://www.falabella.com.co/x" → "falabella.com.co" */
export function domainOf(url: string): string {
  const host = hostOf(url) ?? url;
  return host.replace(/^www\./, '');
}
