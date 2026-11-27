/**
 * Framework-free helpers used by the components (unit tested with Vitest).
 */
import type { ColorScheme } from './tokens';

// ---------- contrast (WCAG 2.1) ----------

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)].sort((m, n) => n - m) as [
    number,
    number,
  ];
  return (x + 0.05) / (y + 0.05);
}

// ---------- avatar ----------

/**
 * Initials backgrounds from the style guide (§8.5). All of them were verified
 * at ≥ 9.5:1 against the theme's textPrimary.
 */
export const AVATAR_BACKGROUNDS: Record<ColorScheme, readonly string[]> = {
  light: ['#FCE3DE', '#DDEFE9', '#F7E7C4', '#E6E0F5', '#DCEAF7', '#F1E4DC'],
  dark: ['#4A2420', '#1D3A32', '#4A3A16', '#332B4A', '#1E3247', '#3A2E29'],
};

/** Deterministic, stable string hash (djb2). */
export function hashString(value: string): number {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarBackground(seed: string, scheme: ColorScheme): string {
  const list = AVATAR_BACKGROUNDS[scheme];
  return list[hashString(seed) % list.length] as string;
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

// ---------- countdown ----------

export type CountdownKind = 'far' | 'soon' | 'tomorrow' | 'today' | 'past';

export interface CountdownInfo {
  kind: CountdownKind;
  /** Short visible text. */
  label: string;
  /** Screen-reader text. */
  accessibilityLabel: string;
}

export function countdownInfo(daysLeft: number): CountdownInfo {
  if (daysLeft < 0) {
    return { kind: 'past', label: 'Entregado', accessibilityLabel: 'La entrega ya pasó' };
  }
  if (daysLeft === 0) {
    return { kind: 'today', label: '¡Hoy!', accessibilityLabel: 'Hoy es la entrega' };
  }
  if (daysLeft === 1) {
    return { kind: 'tomorrow', label: '¡Mañana!', accessibilityLabel: 'Mañana es la entrega' };
  }
  const label = `Faltan ${daysLeft} días`;
  return {
    kind: daysLeft <= 7 ? 'soon' : 'far',
    label,
    accessibilityLabel: `${label} para la entrega`,
  };
}
