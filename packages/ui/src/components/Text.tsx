import type { ComponentRef, Ref } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import type { ColorName, TypographyVariant } from '../tokens';

export type TextRef = ComponentRef<typeof RNText>;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorName;
  align?: TextStyle['textAlign'];
  italic?: boolean;
  ref?: Ref<TextRef>;
}

/**
 * Every text in the app goes through this component: Fredoka for titles,
 * Nunito for the rest. Font scaling stays on; each variant caps the multiplier
 * where the layout would break.
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  italic,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const t = theme.type[variant];
  const isHeader = variant === 'title1' || variant === 'title2' || variant === 'display';
  return (
    <RNText
      accessibilityRole={isHeader ? 'header' : undefined}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? t.maxFontSizeMultiplier}
      style={[
        t.style,
        { color: theme.color[color] },
        align ? { textAlign: align } : null,
        italic ? { fontStyle: 'italic' } : null,
        style,
      ]}
      {...rest}
    />
  );
}
