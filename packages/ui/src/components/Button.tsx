import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { IconName } from '../icons';
import { useTheme, type Theme } from '../theme';
import type { ColorName } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export type ButtonVariant =
  'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'destructive' | 'destructiveGhost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  /** Text shown while loading, in gerund ("Creando…"). */
  loadingLabel?: string;
  disabled?: boolean;
  size?: 'default' | 'small';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
}

interface VariantColors {
  bg: string;
  bgPressed: string;
  fg: ColorName;
  border?: string;
  ripple: string;
}

function variantColors(theme: Theme, variant: ButtonVariant): VariantColors {
  const c = theme.color;
  const lightRipple = 'rgba(255,255,255,0.2)';
  const darkRipple = 'rgba(43,30,26,0.08)';
  switch (variant) {
    case 'primary':
      return {
        bg: c.primary,
        bgPressed: c.primaryPressed,
        fg: 'textOnPrimary',
        ripple: lightRipple,
      };
    case 'secondary':
      return {
        bg: c.secondary,
        bgPressed: c.secondaryPressed,
        fg: 'textOnSecondary',
        ripple: lightRipple,
      };
    case 'accent':
      return { bg: c.accent, bgPressed: c.accentPressed, fg: 'textOnAccent', ripple: darkRipple };
    case 'destructive':
      return { bg: c.danger, bgPressed: c.dangerPressed, fg: 'textOnDanger', ripple: lightRipple };
    case 'ghost':
      return { bg: 'transparent', bgPressed: c.primarySoft, fg: 'primary', ripple: darkRipple };
    case 'destructiveGhost':
      return { bg: 'transparent', bgPressed: c.dangerSoft, fg: 'danger', ripple: darkRipple };
    case 'outline':
      return {
        bg: 'transparent',
        bgPressed: c.surfaceAlt,
        fg: 'textPrimary',
        border: c.borderStrong,
        ripple: darkRipple,
      };
  }
}

const FILLED: ButtonVariant[] = ['primary', 'secondary', 'accent', 'destructive'];

/** Style guide §8.1. Never shrinks text: grows in height with large fonts. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  loadingLabel,
  disabled = false,
  size = 'default',
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const v = variantColors(theme, variant);
  const filled = FILLED.includes(variant);
  const inactive = disabled || loading;
  const fg: ColorName = disabled ? 'textDisabled' : v.fg;
  const height = size === 'small' ? theme.size.buttonHeightSmall : theme.size.buttonHeight;
  const hitSlop = size === 'small' ? (theme.size.minTouchTarget - height) / 2 : 0;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      android_ripple={{ color: v.ripple, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          borderRadius: theme.radius.md,
          paddingHorizontal: size === 'small' ? theme.space.lg : theme.space.xl,
          backgroundColor:
            disabled && filled ? theme.color.disabledBg : pressed ? v.bgPressed : v.bg,
          borderWidth: v.border ? theme.size.borderWidthStrong : 0,
          borderColor: disabled ? theme.color.textDisabled : v.border,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        fullWidth ? styles.full : styles.auto,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.color[v.fg]} />
        ) : icon ? (
          <Icon name={icon} size={theme.size.iconSm} color={fg} />
        ) : null}
        <Text variant="button" color={fg} align="center" style={styles.label}>
          {loading && loadingLabel ? loadingLabel : label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', overflow: 'hidden' },
  full: { alignSelf: 'stretch' },
  auto: { minWidth: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  label: { flexShrink: 1 },
});
