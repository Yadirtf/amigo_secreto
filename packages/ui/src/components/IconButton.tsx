import { Pressable, StyleSheet } from 'react-native';
import type { IconName } from '../icons';
import { useTheme } from '../theme';
import type { ColorName } from '../tokens';
import { Icon } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls must be named for TalkBack. */
  accessibilityLabel: string;
  onPress: () => void;
  color?: ColorName;
  rawColor?: string;
  disabled?: boolean;
  testID?: string;
  size?: number;
}

/** Universal top-bar actions (back, close, more). Always a 48 dp target. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'textPrimary',
  rawColor,
  disabled,
  testID,
  size = 24,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: 'rgba(43,30,26,0.08)', borderless: true }}
      style={({ pressed }) => [
        styles.base,
        {
          width: theme.size.minTouchTarget,
          height: theme.size.minTouchTarget,
          borderRadius: theme.radius.full,
          backgroundColor: pressed ? theme.color.surfaceAlt : 'transparent',
          opacity: disabled ? theme.opacity.disabled : 1,
        },
      ]}
    >
      <Icon name={icon} size={size} color={disabled ? 'textDisabled' : color} rawColor={rawColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
