/**
 * Client-side "is the draw possible?" hint for the exclusions editor, using
 * the same domain rules as the server. Only a hint: the server decides.
 */
import { allowedRecipients, draw, MIN_OPTIONS, MIN_PARTICIPANTS } from '@entre-nos/domain';

export type Feasibility =
  | { ok: true }
  | { ok: false; reason: 'not_enough'; missing: number }
  | { ok: false; reason: 'blocked'; blocking: string[] };

// Non-crypto randomness is fine: nothing is assigned on the phone.
const hintRandom = { int: (max: number) => Math.floor(Math.random() * max) };

export function drawFeasibility(
  participants: readonly string[],
  exclusions: readonly (readonly [string, string])[],
): Feasibility {
  if (participants.length < MIN_PARTICIPANTS) {
    return { ok: false, reason: 'not_enough', missing: MIN_PARTICIPANTS - participants.length };
  }
  const allowed = allowedRecipients(participants, exclusions);
  const tooFew = participants.filter((p) => (allowed.get(p)?.size ?? 0) < MIN_OPTIONS);
  if (tooFew.length > 0) return { ok: false, reason: 'blocked', blocking: tooFew };
  const result = draw(participants, exclusions, hintRandom);
  if (result.ok) return { ok: true };
  return {
    ok: false,
    reason: 'blocked',
    blocking: result.reason === 'impossible' ? result.blocking : [],
  };
}
