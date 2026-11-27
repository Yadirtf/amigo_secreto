import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Composite label: a pressable card is read as a single element. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
  /** Decorative accent border (SecretCard). */
  accentBorder?: boolean;
  disabled?: boolean;
  padded?: boolean;
}

/** Style guide §8.4: surface, radius lg, shadow sm (light) / border (dark). */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
  accentBorder,
  disabled,
  padded = true,
}: CardProps) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.lg,
    padding: padded ? theme.space.lg : 0,
    ...(theme.scheme === 'light' ? theme.shadow.sm : {}),
    borderWidth: accentBorder
      ? theme.size.borderWidthStrong
      : theme.scheme === 'dark'
        ? theme.size.borderWidth
        : 0,
    borderColor: accentBorder ? theme.color.accent : theme.color.border,
  };
  const content = disabled ? <View style={styles.disabled}>{children}</View> : children;
  if (!onPress) {
    return (
      <View testID={testID} style={[base, style]}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: 'rgba(43,30,26,0.08)' }}
      style={({ pressed }) => [
        base,
        pressed ? { backgroundColor: theme.color.surfaceAlt, transform: [{ scale: 0.98 }] } : null,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export interface CardErrorProps {
  message?: string;
  onRetry: () => void;
}

/** Card content replacement when it failed to load (§8.4 error). */
export function CardError({ message = 'No pudimos cargar esto.', onRetry }: CardErrorProps) {
  const theme = useTheme();
  return (
    <View style={[styles.errorRow, { gap: theme.space.sm }]}>
      <Icon name="offline" size={20} color="textSecondary" />
      <Text variant="body" color="textSecondary" style={styles.flex}>
        {message}
      </Text>
      <Button variant="ghost" size="small" label="Reintentar" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.6 },
  errorRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
