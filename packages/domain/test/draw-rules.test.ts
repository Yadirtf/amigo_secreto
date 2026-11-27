import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  allowedRecipients,
  draw,
  isValidDraw,
  realOptions,
  shuffle,
  type Exclusion,
  type RandomSource,
} from '../src/index.js';
import { seededRandom } from '../src/testing/memory.js';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `u${i}`);

/** fast-check generator: participants + random exclusions between them. */
const groupArb = fc.integer({ min: 3, max: 40 }).chain((n) =>
  fc.record({
    people: fc.constant(ids(n)),
    exclusions: fc.array(
      fc
        .tuple(fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 0, max: n - 1 }))
        .map(([a, b]) => [`u${a}`, `u${b}`] as Exclusion),
      { maxLength: n * 2 },
    ),
    seed: fc.integer(),
  }),
);

/** Brute-force feasibility (small n) to cross-check the "impossible" answer. */
function feasibleBrute(people: string[], exclusions: Exclusion[]): boolean {
  const allowed = allowedRecipients(people, exclusions);
  const used = new Set<string>();
  const go = (i: number): boolean => {
    if (i === people.length) return true;
    for (const r of allowed.get(people[i] as string) ?? []) {
      if (used.has(r)) continue;
      used.add(r);
      if (go(i + 1)) return true;
      used.delete(r);
    }
    return false;
  };
  return go(0);
}

describe('draw (property-based)', () => {
  it('always returns a valid draw or a correct impossibility', () => {
    fc.assert(
      fc.property(groupArb, ({ people, exclusions, seed }) => {
        const result = draw(people, exclusions, seededRandom(seed));
        if (result.ok) {
          expect(isValidDraw(people, exclusions, result.pairs)).toBe(true);
          for (const p of result.pairs) expect(p.giverId).not.toBe(p.receiverId);
        } else {
          expect(result.reason).toBe('impossible');
          if (people.length <= 9) expect(feasibleBrute(people, exclusions)).toBe(false);
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('never says impossible when a solution exists (small groups, brute force)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }).chain((n) =>
          fc.record({
            people: fc.constant(ids(n)),
            exclusions: fc.array(
              fc
                .tuple(fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 0, max: n - 1 }))
                .map(([a, b]) => [`u${a}`, `u${b}`] as Exclusion),
              { maxLength: n * 3 },
            ),
            seed: fc.integer(),
          }),
        ),
        ({ people, exclusions, seed }) => {
          const result = draw(people, exclusions, seededRandom(seed));
          expect(result.ok).toBe(feasibleBrute(people, exclusions));
        },
      ),
      { numRuns: 3000 },
    );
  });

  it('impossible result names a Hall witness: |N(S)| < |S|', () => {
    fc.assert(
      fc.property(groupArb, ({ people, exclusions, seed }) => {
        const result = draw(people, exclusions, seededRandom(seed));
        if (result.ok || result.reason !== 'impossible') return;
        const allowed = allowedRecipients(people, exclusions);
        const neighbors = new Set(result.blocking.flatMap((g) => [...(allowed.get(g) ?? [])]));
        expect(result.blocking.length).toBeGreaterThan(0);
        expect(neighbors.size).toBeLessThan(result.blocking.length);
      }),
      { numRuns: 2000 },
    );
  });

  it('finds solutions in heavily constrained but feasible groups (matching fallback)', () => {
    // Couples who can't give to each other plus a ring that leaves one valid draw.
    const people = ids(6);
    const exclusions: Exclusion[] = [];
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        if (j !== (i + 1) % 6 && i !== (j + 1) % 6) exclusions.push([`u${i}`, `u${j}`]);
      }
    }
    for (let s = 0; s < 200; s++) {
      const r = draw(people, exclusions, seededRandom(s));
      expect(r.ok).toBe(true);
      if (r.ok) expect(isValidDraw(people, exclusions, r.pairs)).toBe(true);
    }
  });

  it('is roughly uniform for an unconstrained group of 4 (9 derangements)', () => {
    const counts = new Map<string, number>();
    const rnd = seededRandom(7);
    const runs = 18_000;
    for (let i = 0; i < runs; i++) {
      const r = draw(ids(4), [], rnd);
      if (!r.ok) throw new Error('unexpected');
      const key = r.pairs.map((p) => p.receiverId).join(',');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(9);
    for (const c of counts.values()) expect(Math.abs(c - runs / 9)).toBeLessThan((runs / 9) * 0.1);
  });

  it('rejects groups under 3 people and ignores duplicates', () => {
    expect(draw(['a', 'b'], [], seededRandom(1))).toEqual({
      ok: false,
      reason: 'not_enough_participants',
    });
    expect(draw(['a', 'a', 'b'], [], seededRandom(1)).ok).toBe(false);
  });

  it('reports impossibility with the blocking people', () => {
    // a cannot give to b or c => impossible.
    const r = draw(
      ['a', 'b', 'c'],
      [
        ['a', 'b'],
        ['a', 'c'],
      ],
      seededRandom(3),
    );
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'impossible') expect(r.blocking).toContain('a');
  });

  it('ignores exclusions about people outside the draw', () => {
    const r = draw(['a', 'b', 'c'], [['a', 'zz']], seededRandom(3));
    expect(r.ok).toBe(true);
  });
});

describe('realOptions', () => {
  it('counts only pairs that occur in some valid draw', () => {
    const people = ids(6);
    const [o, t, a, b] = people as [string, string, string, string];
    const r = realOptions(people, [
      [o, a],
      [o, b],
      [t, a],
      [t, b],
      [a, b],
    ]);
    expect(r.feasible).toBe(true);
    expect(r.asGiver.get(o)).toBe(1); // O can only ever give to T
    expect(r.asReceiver.get(o)).toBe(1); // and only T can give to O
    expect(r.asGiver.get('u4')).toBeGreaterThanOrEqual(2);
  });
  it('matches brute force on random small groups', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 7 }).chain((n) =>
          fc.record({
            people: fc.constant(ids(n)),
            exclusions: fc.array(
              fc
                .tuple(fc.integer({ min: 0, max: n - 1 }), fc.integer({ min: 0, max: n - 1 }))
                .map(([x, y]) => [`u${x}`, `u${y}`] as Exclusion),
              { maxLength: n * 2 },
            ),
          }),
        ),
        ({ people, exclusions }) => {
          const r = realOptions(people, exclusions);
          // Brute force: enumerate all valid draws.
          const allowed = allowedRecipients(people, exclusions);
          const seen = new Set<string>();
          const used = new Set<string>();
          const cur: string[] = [];
          const go = (i: number) => {
            if (i === people.length) {
              cur.forEach((rcv, j) => seen.add(`${people[j]}>${rcv}`));
              return;
            }
            for (const rcv of allowed.get(people[i] as string) ?? []) {
              if (used.has(rcv)) continue;
              used.add(rcv);
              cur.push(rcv);
              go(i + 1);
              cur.pop();
              used.delete(rcv);
            }
          };
          go(0);
          expect(r.feasible).toBe(seen.size > 0);
          if (!r.feasible) return;
          for (const p of people) {
            const giverCount = [...seen].filter((k) => k.startsWith(`${p}>`)).length;
            const receiverCount = [...seen].filter((k) => k.endsWith(`>${p}`)).length;
            expect(r.asGiver.get(p)).toBe(giverCount);
            expect(r.asReceiver.get(p)).toBe(receiverCount);
          }
        },
      ),
      { numRuns: 1500 },
    );
  });
});

describe('isValidDraw', () => {
  const people = ['a', 'b', 'c'];
  it('detects wrong size, unknown people, duplicates, self and exclusions', () => {
    expect(isValidDraw(people, [], [{ giverId: 'a', receiverId: 'b' }])).toBe(false);
    expect(
      isValidDraw(
        people,
        [],
        [
          { giverId: 'a', receiverId: 'b' },
          { giverId: 'b', receiverId: 'c' },
          { giverId: 'x', receiverId: 'a' },
        ],
      ),
    ).toBe(false);
    expect(
      isValidDraw(
        people,
        [],
        [
          { giverId: 'a', receiverId: 'b' },
          { giverId: 'a', receiverId: 'c' },
          { giverId: 'c', receiverId: 'a' },
        ],
      ),
    ).toBe(false);
    expect(
      isValidDraw(
        people,
        [],
        [
          { giverId: 'a', receiverId: 'a' },
          { giverId: 'b', receiverId: 'c' },
          { giverId: 'c', receiverId: 'b' },
        ],
      ),
    ).toBe(false);
    const ring = [
      { giverId: 'a', receiverId: 'b' },
      { giverId: 'b', receiverId: 'c' },
      { giverId: 'c', receiverId: 'a' },
    ];
    expect(isValidDraw(people, [], ring)).toBe(true);
    expect(isValidDraw(people, [['b', 'a']], ring)).toBe(false);
  });
});

describe('shuffle', () => {
  it('is a permutation and does not mutate input', () => {
    const rnd: RandomSource = seededRandom(9);
    const input = ids(20);
    const out = shuffle(input, rnd);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([...input].sort());
  });
});
