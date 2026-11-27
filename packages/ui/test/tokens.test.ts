import { describe, expect, it } from 'vitest';
import json from '../../../docs/ux/tokens.json';
import { tokens } from '../src/tokens';

describe('tokens', () => {
  it('match docs/ux/tokens.json exactly (no drift)', () => {
    expect(JSON.parse(JSON.stringify(tokens))).toEqual(JSON.parse(JSON.stringify(json)));
  });

  it('light and dark palettes define the same color names', () => {
    expect(Object.keys(tokens.color.dark).sort()).toEqual(Object.keys(tokens.color.light).sort());
  });
});
