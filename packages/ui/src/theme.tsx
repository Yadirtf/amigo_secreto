import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import { tokens, type ColorScheme, type Palette, type TypographyVariant } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  color: Palette;
  space: typeof tokens.space;
  radius: typeof tokens.radius;
  size: typeof tokens.size;
  shadow: typeof tokens.shadow;
  duration: typeof tokens.duration;
  easing: typeof tokens.easing;
  spring: typeof tokens.spring;
  zIndex: typeof tokens.zIndex;
  opacity: typeof tokens.opacity;
  /** Ready-to-use text styles for every typography variant. */
  type: Record<TypographyVariant, TypographyStyle>;
}

export interface TypographyStyle {
  style: TextStyle;
  maxFontSizeMultiplier: number;
}

type FontKey = keyof typeof tokens.font;
type SizeKey = keyof typeof tokens.fontSize;

function buildTypography(): Record<TypographyVariant, TypographyStyle> {
  const out = {} as Record<TypographyVariant, TypographyStyle>;
  for (const key of Object.keys(tokens.typography) as TypographyVariant[]) {
    const def = tokens.typography[key] as {
      font: FontKey;
      size: SizeKey;
      lineHeight: SizeKey;
      maxFontSizeMultiplier: number;
      letterSpacing?: number;
      textTransform?: 'uppercase';
      fontVariant?: readonly string[];
    };
    const style: TextStyle = {
      fontFamily: tokens.font[def.font].family,
      fontSize: tokens.fontSize[def.size],
      lineHeight: tokens.lineHeight[def.lineHeight],
      ...(def.letterSpacing !== undefined ? { letterSpacing: def.letterSpacing } : {}),
      ...(def.textTransform !== undefined ? { textTransform: def.textTransform } : {}),
      ...(def.fontVariant !== undefined ? { fontVariant: ['tabular-nums'] as const } : {}),
    };
    out[key] = { style, maxFontSizeMultiplier: def.maxFontSizeMultiplier };
  }
  return out;
}

const typography = buildTypography();

export function createTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    color: tokens.color[scheme],
    space: tokens.space,
    radius: tokens.radius,
    size: tokens.size,
    shadow: tokens.shadow,
    duration: tokens.duration,
    easing: tokens.easing,
    spring: tokens.spring,
    zIndex: tokens.zIndex,
    opacity: tokens.opacity,
    type: typography,
  };
}

const lightTheme = createTheme('light');
const darkTheme = createTheme('dark');

const ThemeContext = createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Forces a scheme (the "¿A quién te tocó?" screen is always dark). */
  scheme?: ColorScheme;
}

/** Follows the system theme (no in-app selector in v1). */
export function ThemeProvider({ children, scheme }: ThemeProviderProps) {
  const system = useColorScheme();
  const resolved: ColorScheme = scheme ?? (system === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => (resolved === 'dark' ? darkTheme : lightTheme), [resolved]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
