/**
 * Client-side "is the draw possible?" hint for the exclusions editor, using
 * the same domain rules as the server (realOptions: everybody needs at least
 * 2 REAL options as giver and as receiver). Only a hint: the server decides.
 */
import {
  LIMITS,
  MIN_OPTIONS,
  MIN_PARTICIPANTS,
  realOptions,
  type Exclusion,
} from '@entre-nos/domain';

export type Feasibility =
  | { ok: true }
  | { ok: false; reason: 'not_enough'; missing: number }
  | { ok: false; reason: 'blocked'; blocking: string[] };

export const MAX_EXCLUSIONS_PER_PERSON = LIMITS.exclusionsPerPerson;

export function drawFeasibility(
  participants: readonly string[],
  exclusions: readonly Exclusion[],
): Feasibility {
  const people = [...new Set(participants)];
  if (people.length < MIN_PARTICIPANTS) {
    return { ok: false, reason: 'not_enough', missing: MIN_PARTICIPANTS - people.length };
  }
  const r = realOptions(people, exclusions);
  const blocking = people.filter(
    (p) =>
      !r.feasible ||
      (r.asGiver.get(p) ?? 0) < MIN_OPTIONS ||
      (r.asReceiver.get(p) ?? 0) < MIN_OPTIONS,
  );
  if (blocking.length === 0) return { ok: true };
  return { ok: false, reason: 'blocked', blocking: r.feasible ? blocking : [] };
}

/** How many exclusions involve this person. */
export function exclusionCount(personId: string, exclusions: readonly Exclusion[]): number {
  return exclusions.filter(([a, b]) => a === personId || b === personId).length;
}
