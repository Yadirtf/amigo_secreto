import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../src/api/client';
import { addDays, bogotaToday, daysBetween, deliveryDefaults } from '../src/lib/dates';
import { errorMessage, isRetryable, OFFLINE_MESSAGE } from '../src/lib/errors';
import { drawFeasibility } from '../src/lib/feasibility';
import {
  formatCop,
  formatDayChip,
  formatDayLong,
  formatDayShort,
  formatMoneyInput,
  formatTime,
  parseMoneyInput,
} from '../src/lib/format';
import { extractInviteCode, formatCodeInput, validDeepLinkCode } from '../src/lib/invite';
import { domainOf, isSafeHttpsUrl, normalizeWishLink } from '../src/lib/links';

describe('format', () => {
  it('formats COP with thousands dots', () => {
    expect(formatCop(50000)).toBe('$ 50.000');
    expect(formatCop(1500000)).toBe('$ 1.500.000');
    expect(formatCop(999)).toBe('$ 999');
  });
  it('formats money while typing', () => {
    expect(formatMoneyInput('50000')).toBe('50.000');
    expect(formatMoneyInput('$ 1.2a3')).toBe('123');
    expect(formatMoneyInput('')).toBe('');
    expect(formatMoneyInput('007')).toBe('7');
    expect(parseMoneyInput('50.000')).toBe(50000);
    expect(parseMoneyInput('')).toBeNull();
  });
  it('formats days in es-CO', () => {
    expect(formatDayShort('2026-12-18')).toBe('18 dic');
    expect(formatDayChip('2026-12-24')).toBe('Jue 24 dic');
    expect(formatDayLong('2026-12-18')).toBe('viernes 18 de diciembre');
  });
  it('formats chat time in Bogotá', () => {
    expect(formatTime('2026-12-01T20:05:00.000Z')).toBe('3:05 p. m.');
    expect(formatTime('2026-12-01T05:00:00.000Z')).toBe('12:00 a. m.');
  });
});

describe('dates', () => {
  it('computes today in Bogotá', () => {
    expect(bogotaToday(new Date('2026-11-28T03:00:00Z'))).toBe('2026-11-27');
    expect(bogotaToday(new Date('2026-11-28T06:00:00Z'))).toBe('2026-11-28');
  });
  it('adds and diffs days', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(daysBetween('2026-11-27', '2026-12-24')).toBe(27);
  });
  it('smart default: Dec 24 plus the last Friday before it', () => {
    expect(deliveryDefaults('2026-11-27')).toEqual({
      selected: '2026-12-24',
      options: ['2026-12-24', '2026-12-18'],
    });
  });
  it('falls back to today + 7 when Dec 24 is too close', () => {
    expect(deliveryDefaults('2026-12-22')).toEqual({
      selected: '2026-12-29',
      options: ['2026-12-29'],
    });
  });
  it('skips the Friday chip when it is too close', () => {
    expect(deliveryDefaults('2026-12-17').options).toEqual(['2026-12-24']);
  });
});

describe('invite codes', () => {
  it('formats while typing', () => {
    expect(formatCodeInput('abcde')).toBe('ABCDE');
    expect(formatCodeInput('abcdefg')).toBe('ABCDE-FG');
    expect(formatCodeInput('ab cd-ef ghjkmnp')).toBe('ABCDE-FGHJK');
  });
  it('extracts codes from links and text', () => {
    expect(extractInviteCode('https://x.workers.dev/i/ABCDE23456')).toBe('ABCDE23456');
    expect(extractInviteCode('entrenos://i/abcde-23456')).toBe('ABCDE23456');
    expect(extractInviteCode('Si te pide el código: *ABCDE-23456*')).toBe('ABCDE23456');
    expect(extractInviteCode('hola')).toBeNull();
  });
  it('validates deep-link params', () => {
    expect(validDeepLinkCode('ABCDE23456')).toBe('ABCDE23456');
    expect(validDeepLinkCode('ABCDE2345O')).toBeNull();
    expect(validDeepLinkCode(['ABCDE23456'])).toBeNull();
    expect(validDeepLinkCode('x'.repeat(40))).toBeNull();
  });
});

describe('links', () => {
  it('normalizes wishlist links to https', () => {
    expect(normalizeWishLink('falabella.com.co/termo')).toBe('https://falabella.com.co/termo');
    expect(normalizeWishLink('  ')).toBeNull();
    expect(() => normalizeWishLink('javascript:alert(1)')).toThrow();
    expect(() => normalizeWishLink('http://x.com')).toThrow();
    expect(() => normalizeWishLink('hola')).toThrow();
  });
  it('only opens https', () => {
    expect(isSafeHttpsUrl('https://a.co')).toBe(true);
    expect(isSafeHttpsUrl('intent://a')).toBe(false);
    expect(isSafeHttpsUrl(null)).toBe(false);
  });
  it('shows the domain', () => {
    expect(domainOf('https://www.falabella.com.co/x?y=1')).toBe('falabella.com.co');
  });
});

describe('errors', () => {
  const err = (code: ConstructorParameters<typeof ApiRequestError>[0]['code'], message?: string) =>
    new ApiRequestError({ code, status: 400, message });
  it('uses flow copy per context', () => {
    expect(errorMessage(err('NETWORK'))).toBe(OFFLINE_MESSAGE);
    expect(errorMessage(err('INVITE_INVALID'), 'join')).toMatch(/^Ese código no existe/);
    expect(errorMessage(err('GROUP_LOCKED'), 'join', { organizer: 'Laura' })).toContain(
      'Pídele a Laura',
    );
    expect(errorMessage(err('DRAW_IMPOSSIBLE'), 'draw', { blockingName: 'Ana' })).toContain(
      'Ana no tiene a quién regalarle',
    );
    expect(errorMessage(err('NETWORK'), 'draw')).toMatch(/no quedó nada a medias/);
  });
  it('falls back to the server message for INVALID_INPUT', () => {
    expect(errorMessage(err('INVALID_INPUT', 'El nombre es muy corto'))).toBe(
      'El nombre es muy corto',
    );
  });
  it('knows what is retryable', () => {
    expect(isRetryable(err('NETWORK'))).toBe(true);
    expect(isRetryable(err('FORBIDDEN'))).toBe(false);
    expect(isRetryable(new Error('x'))).toBe(false);
  });
});

describe('draw feasibility hint', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('is possible without exclusions', () => {
    expect(drawFeasibility(ids, [])).toEqual({ ok: true });
  });
  it('needs 3 participants', () => {
    expect(drawFeasibility(['a', 'b'], [])).toEqual({
      ok: false,
      reason: 'not_enough',
      missing: 1,
    });
  });
  it('requires at least 2 options per participant', () => {
    const r = drawFeasibility(ids, [
      ['a', 'b'],
      ['a', 'c'],
    ]);
    expect(r).toEqual({ ok: false, reason: 'blocked', blocking: ['a'] });
  });
});
