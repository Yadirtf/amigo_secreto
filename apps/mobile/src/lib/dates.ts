/**
 * Calendar-day helpers in America/Bogota (UTC-5, no daylight saving).
 */
import { parseIsoDay, toIsoDay, type DayParts } from './format';

const DAY_MS = 86_400_000;
const BOGOTA_OFFSET_MS = -5 * 3_600_000;

export function bogotaToday(now: Date = new Date()): string {
  const d = new Date(now.getTime() + BOGOTA_OFFSET_MS);
  return toIsoDay({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

function toUtcMs(p: DayParts): number {
  return Date.UTC(p.year, p.month - 1, p.day);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcMs(parseIsoDay(toIso)) - toUtcMs(parseIsoDay(fromIso))) / DAY_MS);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(toUtcMs(parseIsoDay(iso)) + days * DAY_MS);
  return toIsoDay({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
}

export interface DeliveryDefaults {
  /** Pre-selected date. */
  selected: string;
  /** Quick-pick chips, in order (selected first). */
  options: string[];
}

/**
 * Smart default (flujos S3): Dec 24 of this year, or today + 7 if that's
 * less than 3 days away. Extra chip: the last Friday before Dec 24, only if
 * it is at least 3 days away.
 */
export function deliveryDefaults(todayIso: string): DeliveryDefaults {
  const today = parseIsoDay(todayIso);
  const christmasEve = toIsoDay({ year: today.year, month: 12, day: 24 });
  const useEve = daysBetween(todayIso, christmasEve) >= 3;
  const selected = useEve ? christmasEve : addDays(todayIso, 7);
  const options = [selected];
  if (useEve) {
    // Dec 24 weekday → step back to the previous Friday (strictly before).
    const dow = new Date(toUtcMs(parseIsoDay(christmasEve))).getUTCDay();
    const back = dow > 5 ? dow - 5 : dow + 2; // Fri=5
    const friday = addDays(christmasEve, -(back === 0 ? 7 : back));
    if (daysBetween(todayIso, friday) >= 3) options.push(friday);
  }
  return { selected, options };
}
