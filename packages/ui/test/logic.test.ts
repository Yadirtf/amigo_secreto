import { describe, expect, it } from 'vitest';
import {
  AVATAR_BACKGROUNDS,
  avatarBackground,
  contrastRatio,
  countdownInfo,
  initials,
} from '../src/logic';
import { tokens, type ColorName } from '../src/tokens';

// Pairs used by the app (guía de estilo §1.3 + annex A). [fg, bg, min]
const PAIRS: [ColorName, ColorName, number][] = [
  ['textPrimary', 'background', 4.5],
  ['textPrimary', 'surface', 4.5],
  ['textPrimary', 'surfaceAlt', 4.5],
  ['textSecondary', 'background', 4.5],
  ['textSecondary', 'surface', 4.5],
  ['textSecondary', 'surfaceAlt', 4.5],
  ['textOnPrimary', 'primary', 4.5],
  ['textOnPrimary', 'primaryPressed', 4.5],
  ['textOnPrimarySoft', 'primarySoft', 4.5],
  ['textOnSecondary', 'secondary', 4.5],
  ['textOnSecondary', 'secondaryPressed', 4.5],
  ['textOnSecondarySoft', 'secondarySoft', 4.5],
  ['textOnAccent', 'accent', 4.5],
  ['textOnAccent', 'accentPressed', 4.5],
  ['accentText', 'background', 4.5],
  ['accentText', 'surface', 4.5],
  ['primaryText', 'background', 4.5],
  ['primaryText', 'surface', 4.5],
  ['secondaryText', 'background', 4.5],
  ['secondaryText', 'surface', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'background', 4.5],
  ['danger', 'dangerSoft', 4.5],
  ['textOnDanger', 'danger', 4.5],
  ['textOnDanger', 'dangerPressed', 4.5],
  ['textDisabled', 'disabledBg', 3],
  ['borderStrong', 'surface', 3],
  ['borderStrong', 'background', 3],
  ['focus', 'background', 3],
  ['focus', 'surface', 3],
  ['warning', 'surfaceAlt', 3],
];

describe('contrast (WCAG AA)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const [fg, bg, min] of PAIRS) {
      it(`${scheme}: ${fg} on ${bg} ≥ ${min}`, () => {
        const c = tokens.color[scheme];
        expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(min);
      });
    }
    it(`${scheme}: avatar initials ≥ 7:1`, () => {
      for (const bg of AVATAR_BACKGROUNDS[scheme]) {
        expect(contrastRatio(tokens.color[scheme].textPrimary, bg)).toBeGreaterThanOrEqual(7);
      }
    });
  }
  it('light toast text and action pass', () => {
    const l = tokens.color.light;
    expect(contrastRatio(l.surface, l.textPrimary)).toBeGreaterThan(4.5);
    expect(contrastRatio(tokens.color.dark.textOnPrimarySoft, l.textPrimary)).toBeGreaterThan(4.5);
  });
});

describe('avatar', () => {
  it('initials use first and last word', () => {
    expect(initials('Ana María Rodríguez')).toBe('AR');
    expect(initials('laura')).toBe('L');
    expect(initials('  ')).toBe('?');
  });
  it('background is deterministic per seed', () => {
    expect(avatarBackground('user-1', 'light')).toBe(avatarBackground('user-1', 'light'));
    expect(AVATAR_BACKGROUNDS.dark).toContain(avatarBackground('abc', 'dark'));
  });
});

describe('countdownInfo', () => {
  it('follows the badge table', () => {
    expect(countdownInfo(21)).toMatchObject({ kind: 'far', label: 'Faltan 21 días' });
    expect(countdownInfo(3)).toMatchObject({ kind: 'soon', label: 'Faltan 3 días' });
    expect(countdownInfo(1)).toMatchObject({ kind: 'tomorrow', label: '¡Mañana!' });
    expect(countdownInfo(0)).toMatchObject({ kind: 'today', label: '¡Hoy!' });
    expect(countdownInfo(-2)).toMatchObject({ kind: 'past', label: 'Entregado' });
    expect(countdownInfo(3).accessibilityLabel).toBe('Faltan 3 días para la entrega');
  });
});
