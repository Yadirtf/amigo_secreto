import { describe, expect, it } from 'vitest';
import json from '../../../docs/ux/tokens.json';
import { contrastRatio } from '../src/logic';
import { tokens, type ColorName } from '../src/tokens';

describe('tokens', () => {
  it('match docs/ux/tokens.json exactly (no drift)', () => {
    expect(JSON.parse(JSON.stringify(tokens))).toEqual(JSON.parse(JSON.stringify(json)));
  });

  it('light and dark palettes define the same color names', () => {
    expect(Object.keys(tokens.color.dark).sort()).toEqual(Object.keys(tokens.color.light).sort());
  });
});

// WCAG pairs the pastel palette (1.1) must keep: 4.5:1 for text, 3:1 for
// borders and focus rings. Pastel fills carry dark text; *Text tokens are the
// strong versions used for links, icons and selected states.
const PAIRS: [ColorName, ColorName[], number][] = [
  ['textPrimary', ['background', 'surface', 'surfaceAlt'], 7],
  ['textSecondary', ['background', 'surface', 'surfaceAlt'], 4.5],
  ['textOnPrimary', ['primary', 'primaryPressed'], 4.5],
  ['textOnSecondary', ['secondary', 'secondaryPressed'], 4.5],
  ['textOnAccent', ['accent', 'accentPressed'], 4.5],
  ['primaryText', ['background', 'surface', 'surfaceAlt', 'primarySoft'], 4.5],
  ['secondaryText', ['background', 'surface', 'secondarySoft'], 4.5],
  ['textOnPrimarySoft', ['primarySoft'], 4.5],
  ['textOnSecondarySoft', ['secondarySoft'], 4.5],
  ['accentText', ['background', 'surface'], 4.5],
  ['danger', ['background', 'surface', 'dangerSoft'], 4.5],
  ['textOnDanger', ['danger', 'dangerPressed'], 4.5],
  ['borderStrong', ['background', 'surface'], 3],
  ['focus', ['background', 'surface'], 3],
];

describe.each(['light', 'dark'] as const)('%s palette contrast', (scheme) => {
  const c = tokens.color[scheme];
  it.each(PAIRS)('%s on %j ≥ %d:1', (fg, bgs, min) => {
    for (const bg of bgs) expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(min);
  });
});
