import { DomainError } from '../errors.js';

/** Limits shared with the contracts package (kept here so the domain defends itself). */
export const LIMITS = {
  userName: { min: 1, max: 40 },
  groupName: { min: 2, max: 60 },
  budgetCop: { min: 1_000, max: 50_000_000 },
  photoBytes: 60_000,
  wishText: { min: 1, max: 140 },
  wishLink: 500,
  wishSize: 30,
  wishlistItems: 20,
  messageText: { min: 1, max: 500 },
  reportReason: 200,
  exclusions: 200,
} as const;

const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();

export function cleanText(value: string, field: string, min: number, max: number): string {
  const v = collapse(value);
  if (v.length < min || v.length > max) {
    throw new DomainError('INVALID_INPUT', `${field} must be ${min}-${max} characters`, { field });
  }
  return v;
}

/** Multi-line text (chat): keeps newlines, trims, limits consecutive blank lines. */
export function cleanMultiline(value: string, field: string, min: number, max: number): string {
  const v = value
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (v.length < min || v.length > max) {
    throw new DomainError('INVALID_INPUT', `${field} must be ${min}-${max} characters`, { field });
  }
  return v;
}

export function validateBudget(budget: number | null): number | null {
  if (budget === null) return null;
  if (!Number.isInteger(budget) || budget < LIMITS.budgetCop.min || budget > LIMITS.budgetCop.max) {
    throw new DomainError('INVALID_INPUT', 'budget out of range', { field: 'budgetCop' });
  }
  return budget;
}

/** Only https links are allowed in wishlists (no javascript:, data:, intent: …). */
export function validateLink(link: string | null): string | null {
  if (link === null) return null;
  const v = link.trim();
  if (v === '') return null;
  if (v.length > LIMITS.wishLink) {
    throw new DomainError('INVALID_INPUT', 'link too long', { field: 'link' });
  }
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new DomainError('INVALID_INPUT', 'invalid link', { field: 'link' });
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    throw new DomainError('INVALID_INPUT', 'only https links', { field: 'link' });
  }
  return url.toString();
}

/** Photos are small data URIs produced by the app (JPEG/WebP, compressed). */
export function validatePhoto(photo: string | null): string | null {
  if (photo === null) return null;
  if (!/^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) {
    throw new DomainError('INVALID_INPUT', 'invalid photo', { field: 'photo' });
  }
  if (photo.length > LIMITS.photoBytes) {
    throw new DomainError('INVALID_INPUT', 'photo too large', { field: 'photo' });
  }
  return photo;
}

/** Delivery dates must be a real day, not in the past, and within ~13 months. */
export function validateDeliveryDate(date: Date, now: Date): Date {
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('INVALID_INPUT', 'invalid date', { field: 'deliveryDate' });
  }
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const max = new Date(today.getTime() + 400 * 86_400_000);
  // Allow "yesterday" in UTC to tolerate Colombia (UTC-5) evenings.
  if (day.getTime() < today.getTime() - 86_400_000 || day.getTime() > max.getTime()) {
    throw new DomainError('INVALID_INPUT', 'delivery date out of range', {
      field: 'deliveryDate',
    });
  }
  return day;
}
