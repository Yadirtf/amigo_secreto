import { describe, expect, it } from 'vitest';
import {
  cleanMultiline,
  cleanText,
  DomainError,
  formatInviteCode,
  generateInviteCode,
  INVITE_ALPHABET,
  isDomainError,
  normalizeInviteCode,
  validateBudget,
  validateDeliveryDate,
  validateLink,
  validatePhoto,
} from '../src/index.js';
import { seededRandom } from '../src/testing/memory.js';

describe('invite codes', () => {
  it('generates 10 chars from the safe alphabet', () => {
    const rnd = seededRandom(1);
    for (let i = 0; i < 500; i++) {
      const code = generateInviteCode(rnd);
      expect(code).toHaveLength(10);
      for (const ch of code) expect(INVITE_ALPHABET).toContain(ch);
      expect(normalizeInviteCode(formatInviteCode(code).toLowerCase())).toBe(code);
    }
  });
  it('rejects bad input', () => {
    expect(normalizeInviteCode('abc')).toBeNull();
    expect(normalizeInviteCode('ABCDE-FGHI0')).toBeNull();
    expect(normalizeInviteCode('{"$ne":null}')).toBeNull();
  });
  it('formats as XXXXX-XXXXX', () => {
    expect(formatInviteCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK');
  });
});

describe('text validation', () => {
  it('collapses whitespace and enforces length', () => {
    expect(cleanText('  Hola   parce  ', 'name', 1, 20)).toBe('Hola parce');
    expect(() => cleanText('   ', 'name', 1, 20)).toThrow(DomainError);
    expect(() => cleanText('x'.repeat(21), 'name', 1, 20)).toThrow(/1-20/);
  });
  it('keeps newlines in multiline text, limits blank lines', () => {
    expect(cleanMultiline(' hola\r\n\n\n\n¿qué   talla? ', 't', 1, 50)).toBe('hola\n\n¿qué talla?');
    expect(() => cleanMultiline('', 't', 1, 50)).toThrow(DomainError);
  });
  it('rejects control and bidi characters but keeps emoji joiners (PT-06)', () => {
    expect(() => cleanText('Tu amigo secreto\u202e', 'name', 1, 40)).toThrow(DomainError);
    expect(() => cleanText('a\u0000b', 'name', 1, 40)).toThrow(DomainError);
    expect(() => cleanMultiline('hola\u2066', 't', 1, 40)).toThrow(DomainError);
    expect(cleanText('Familia 👨\u200d👩\u200d👧', 'name', 1, 40)).toContain('\u200d');
    expect(cleanMultiline('línea 1\nlínea 2\tok', 't', 1, 40)).toContain('\n');
  });
  it('isDomainError', () => {
    expect(isDomainError(new DomainError('NOT_FOUND', 'x'))).toBe(true);
    expect(isDomainError(new Error('x'))).toBe(false);
  });
});

describe('budget', () => {
  it('accepts null and whole pesos in range', () => {
    expect(validateBudget(null)).toBeNull();
    expect(validateBudget(50_000)).toBe(50_000);
  });
  it.each([0, 999, 50_000_001, 1500.5, Number.NaN])('rejects %s', (v) => {
    expect(() => validateBudget(v)).toThrow(DomainError);
  });
});

describe('links', () => {
  it('accepts https and normalizes', () => {
    expect(validateLink(null)).toBeNull();
    expect(validateLink('   ')).toBeNull();
    expect(validateLink('https://www.falabella.com.co/x?y=1')).toBe(
      'https://www.falabella.com.co/x?y=1',
    );
  });
  it.each([
    'javascript:alert(1)',
    'http://insecure.com',
    'intent://x#Intent;end',
    'data:text/html,hi',
    'not a url',
    'https://user:pass@evil.com',
    `https://a.co/${'x'.repeat(600)}`,
  ])('rejects %s', (v) => {
    expect(() => validateLink(v)).toThrow(DomainError);
  });
});

describe('photo', () => {
  it('accepts small data URIs', () => {
    expect(validatePhoto(null)).toBeNull();
    expect(validatePhoto('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
  });
  it('rejects other content and big payloads', () => {
    expect(() => validatePhoto('https://x.com/a.jpg')).toThrow(DomainError);
    expect(() => validatePhoto('data:image/svg+xml;base64,AAAA')).toThrow(DomainError);
    expect(() => validatePhoto(`data:image/jpeg;base64,${'A'.repeat(70_000)}`)).toThrow(
      /too large/,
    );
  });
});

describe('delivery date', () => {
  const now = new Date('2026-12-01T03:00:00Z'); // Nov 30 at 10 pm in Bogotá
  it('normalizes to UTC midnight', () => {
    expect(validateDeliveryDate(new Date('2026-12-24T18:00:00Z'), now).toISOString()).toBe(
      '2026-12-24T00:00:00.000Z',
    );
  });
  it('tolerates "today" in Colombia when UTC is already tomorrow', () => {
    expect(validateDeliveryDate(new Date('2026-11-30T00:00:00Z'), now).toISOString()).toBe(
      '2026-11-30T00:00:00.000Z',
    );
  });
  it('rejects past, far future and invalid dates', () => {
    expect(() => validateDeliveryDate(new Date('2026-11-20'), now)).toThrow(DomainError);
    expect(() => validateDeliveryDate(new Date('2028-12-24'), now)).toThrow(DomainError);
    expect(() => validateDeliveryDate(new Date('nope'), now)).toThrow(DomainError);
  });
});
