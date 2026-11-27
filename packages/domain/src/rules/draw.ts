import type { Exclusion, UserId } from '../entities.js';
import type { RandomSource } from '../ports.js';

export interface DrawPair {
  giverId: UserId;
  receiverId: UserId;
}

export type DrawResult =
  | { ok: true; pairs: DrawPair[] }
  | {
      ok: false;
      reason: 'not_enough_participants';
    }
  | {
      ok: false;
      reason: 'impossible';
      /** Participants with too few allowed recipients (a Hall's-theorem witness). */
      blocking: UserId[];
    };

export const MIN_PARTICIPANTS = 3;

/** Uniform Fisher–Yates shuffle using the given random source. */
export function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = random.int(i + 1);
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

/** Builds, for every participant, the set of people they may give to. */
export function allowedRecipients(
  participants: readonly UserId[],
  exclusions: readonly Exclusion[],
): Map<UserId, Set<UserId>> {
  const set = new Set(participants);
  const allowed = new Map<UserId, Set<UserId>>();
  for (const p of participants) {
    allowed.set(p, new Set(participants.filter((q) => q !== p)));
  }
  for (const [a, b] of exclusions) {
    if (!set.has(a) || !set.has(b)) continue;
    allowed.get(a)?.delete(b);
    allowed.get(b)?.delete(a);
  }
  return allowed;
}

/**
 * Maximum bipartite matching (Kuhn's augmenting paths) with randomized
 * exploration order. Returns giver -> receiver.
 */
function randomizedMatching(
  givers: readonly UserId[],
  allowed: Map<UserId, Set<UserId>>,
  random: RandomSource,
): Map<UserId, UserId> {
  const receiverOf = new Map<UserId, UserId>(); // receiver -> giver
  const adjacency = new Map<UserId, UserId[]>();
  for (const g of givers) adjacency.set(g, shuffle([...(allowed.get(g) ?? [])], random));

  const tryAssign = (giver: UserId, visited: Set<UserId>): boolean => {
    for (const r of adjacency.get(giver) ?? []) {
      if (visited.has(r)) continue;
      visited.add(r);
      const current = receiverOf.get(r);
      if (current === undefined || tryAssign(current, visited)) {
        receiverOf.set(r, giver);
        return true;
      }
    }
    return false;
  };

  for (const g of shuffle(givers, random)) tryAssign(g, new Set());

  const result = new Map<UserId, UserId>();
  for (const [r, g] of receiverOf) result.set(g, r);
  return result;
}

/**
 * When no perfect matching exists, find a set S of givers whose combined
 * allowed recipients N(S) is smaller than S (Hall's condition violated):
 * start from an unmatched giver and follow alternating paths.
 */
function hallWitness(
  givers: readonly UserId[],
  allowed: Map<UserId, Set<UserId>>,
  matching: Map<UserId, UserId>,
): UserId[] {
  const giverOfReceiver = new Map<UserId, UserId>();
  for (const [g, r] of matching) giverOfReceiver.set(r, g);
  const start = givers.find((g) => !matching.has(g));
  /* c8 ignore next */
  if (start === undefined) return [];
  const S = new Set<UserId>([start]);
  const seenR = new Set<UserId>();
  const queue: UserId[] = [start];
  while (queue.length > 0) {
    const g = queue.shift() as UserId;
    for (const r of allowed.get(g) ?? []) {
      if (seenR.has(r)) continue;
      seenR.add(r);
      const next = giverOfReceiver.get(r);
      if (next !== undefined && !S.has(next)) {
        S.add(next);
        queue.push(next);
      }
    }
  }
  return [...S];
}

const REJECTION_ATTEMPTS = 300;

/**
 * Runs the Secret Santa draw.
 *
 * - Nobody gives to themselves; exclusions are respected in both directions.
 * - First tries rejection sampling over uniform random permutations (gives a
 *   uniform distribution over valid draws in the common case). If that keeps
 *   failing (heavily constrained groups), falls back to a randomized perfect
 *   matching, which always finds a solution when one exists.
 * - When impossible, returns the participants that cause it.
 */
export function draw(
  participants: readonly UserId[],
  exclusions: readonly Exclusion[],
  random: RandomSource,
): DrawResult {
  const unique = [...new Set(participants)];
  if (unique.length < MIN_PARTICIPANTS) return { ok: false, reason: 'not_enough_participants' };

  const allowed = allowedRecipients(unique, exclusions);

  for (let attempt = 0; attempt < REJECTION_ATTEMPTS; attempt++) {
    const perm = shuffle(unique, random);
    let valid = true;
    for (let i = 0; i < unique.length; i++) {
      const giver = unique[i] as UserId;
      if (!allowed.get(giver)?.has(perm[i] as UserId)) {
        valid = false;
        break;
      }
    }
    if (valid) {
      return {
        ok: true,
        pairs: unique.map((giverId, i) => ({ giverId, receiverId: perm[i] as UserId })),
      };
    }
  }

  const matching = randomizedMatching(unique, allowed, random);
  if (matching.size === unique.length) {
    return {
      ok: true,
      pairs: unique.map((giverId) => ({ giverId, receiverId: matching.get(giverId) as UserId })),
    };
  }
  return { ok: false, reason: 'impossible', blocking: hallWitness(unique, allowed, matching) };
}

/** Verifies a draw against the rules. Used by tests and as a server-side guard. */
export function isValidDraw(
  participants: readonly UserId[],
  exclusions: readonly Exclusion[],
  pairs: readonly DrawPair[],
): boolean {
  const unique = new Set(participants);
  if (pairs.length !== unique.size) return false;
  const allowed = allowedRecipients([...unique], exclusions);
  const givers = new Set<UserId>();
  const receivers = new Set<UserId>();
  for (const { giverId, receiverId } of pairs) {
    if (!unique.has(giverId) || !unique.has(receiverId)) return false;
    if (givers.has(giverId) || receivers.has(receiverId)) return false;
    if (!allowed.get(giverId)?.has(receiverId)) return false;
    givers.add(giverId);
    receivers.add(receiverId);
  }
  return true;
}

/**
 * "Real" freedom of a draw (threat model PT-02). An allowed pair g→r is only
 * meaningful if it appears in at least one valid draw. Using a perfect
 * matching M, a non-matching edge g→r belongs to some perfect matching iff g
 * and r lie in the same strongly connected component of the graph with
 * matching edges oriented giver→receiver and the rest receiver→giver
 * (Dulmage–Mendelsohn). Returns, per giver and per receiver, how many
 * partners are really possible.
 */
export function realOptions(
  participants: readonly UserId[],
  exclusions: readonly Exclusion[],
): { feasible: boolean; asGiver: Map<UserId, number>; asReceiver: Map<UserId, number> } {
  const people = [...new Set(participants)];
  const allowed = allowedRecipients(people, exclusions);
  // Deterministic matching (randomness irrelevant for the structure).
  const firstIndex: RandomSource = { int: () => 0 };
  const matching = randomizedMatching(people, allowed, firstIndex);
  const asGiver = new Map<UserId, number>(people.map((p) => [p, 0]));
  const asReceiver = new Map<UserId, number>(people.map((p) => [p, 0]));
  if (matching.size !== people.length) return { feasible: false, asGiver, asReceiver };

  // Nodes: "g:<id>" and "r:<id>".
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => (adj.get(a) ?? adj.set(a, []).get(a))?.push(b);
  for (const g of people) {
    for (const r of allowed.get(g) ?? []) {
      if (matching.get(g) === r) add(`g:${g}`, `r:${r}`);
      else add(`r:${r}`, `g:${g}`);
    }
  }
  // Tarjan's SCC (iterative to avoid deep recursion).
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const comp = new Map<string, number>();
  let counter = 0;
  let compId = 0;
  const nodes = people.flatMap((p) => [`g:${p}`, `r:${p}`]);
  for (const start of nodes) {
    if (index.has(start)) continue;
    const work: [string, number][] = [[start, 0]];
    index.set(start, counter);
    low.set(start, counter++);
    stack.push(start);
    onStack.add(start);
    while (work.length > 0) {
      const top = work[work.length - 1] as [string, number];
      const [v, i] = top;
      const edges = adj.get(v) ?? [];
      if (i < edges.length) {
        top[1]++;
        const w = edges[i] as string;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter++);
          stack.push(w);
          onStack.add(w);
          work.push([w, 0]);
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v) as number, index.get(w) as number));
        }
      } else {
        work.pop();
        const parent = work[work.length - 1];
        if (parent)
          low.set(parent[0], Math.min(low.get(parent[0]) as number, low.get(v) as number));
        if (low.get(v) === index.get(v)) {
          let w: string;
          do {
            w = stack.pop() as string;
            onStack.delete(w);
            comp.set(w, compId);
          } while (w !== v);
          compId++;
        }
      }
    }
  }
  for (const g of people) {
    for (const r of allowed.get(g) ?? []) {
      const usable = matching.get(g) === r || comp.get(`g:${g}`) === comp.get(`r:${r}`);
      if (usable) {
        asGiver.set(g, (asGiver.get(g) as number) + 1);
        asReceiver.set(r, (asReceiver.get(r) as number) + 1);
      }
    }
  }
  return { feasible: true, asGiver, asReceiver };
}
