/**
 * es-CO formatting, implemented by hand so the output is identical on Hermes
 * and in tests: "$ 50.000", "18 dic", "viernes 18 de diciembre".
 */

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;
const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sept',
  'oct',
  'nov',
  'dic',
] as const;
const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

/** 50000 → "50.000" */
export function thousands(value: number): string {
  const n = Math.trunc(Math.abs(value));
  const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return value < 0 ? `-${s}` : s;
}

/** 50000 → "$ 50.000" */
export function formatCop(value: number): string {
  return `$ ${thousands(value)}`;
}

/** Live money input: keeps digits only and adds the thousands dots. */
export function formatMoneyInput(text: string): string {
  const digits = text
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 9);
  return digits === '' ? '' : thousands(Number(digits));
}

export function parseMoneyInput(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? null : Number(digits);
}

export interface DayParts {
  year: number;
  month: number; // 1-12
  day: number;
}

/** "2026-12-18" → parts (a calendar day, never shifted by time zones). */
export function parseIsoDay(iso: string): DayParts {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1, day: d ?? 1 };
}

export function toIsoDay(p: DayParts): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function weekday(p: DayParts): number {
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/** "18 dic" */
export function formatDayShort(iso: string): string {
  const p = parseIsoDay(iso);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** "Vie 18 dic" */
export function formatDayChip(iso: string): string {
  const p = parseIsoDay(iso);
  return `${WEEKDAYS_SHORT[weekday(p)]} ${p.day} ${MONTHS_SHORT[p.month - 1]}`;
}

/** "viernes 18 de diciembre" */
export function formatDayLong(iso: string): string {
  const p = parseIsoDay(iso);
  return `${WEEKDAYS[weekday(p)]} ${p.day} de ${MONTHS[p.month - 1]}`;
}

/** "16 feb 2027" */
export function formatDayWithYear(iso: string): string {
  const p = parseIsoDay(iso);
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`;
}

/** Chat time "3:05 p. m." in Bogotá time (UTC-5, no DST). */
export function formatTime(isoDateTime: string): string {
  const d = new Date(Date.parse(isoDateTime) - 5 * 3_600_000);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}
