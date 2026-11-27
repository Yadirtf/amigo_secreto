import { Pressable, StyleSheet, View } from 'react-native';
import type { IconName } from '../icons';
import { useTheme } from '../theme';
import type { ColorName } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  /** "radio" for single choice (dates, sizes), "checkbox" for multiple. */
  role?: 'radio' | 'checkbox' | 'button';
  accessibilityLabel?: string;
  testID?: string;
}

/** Selectable chip (§8.6): selection shown with a check icon, not only color. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled,
  role = 'radio',
  accessibilityLabel,
  testID,
}: ChipProps) {
  const theme = useTheme();
  const fg: ColorName = disabled ? 'textDisabled' : selected ? 'textOnPrimarySoft' : 'textPrimary';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={
        role === 'button' ? { disabled: !!disabled } : { checked: selected, disabled: !!disabled }
      }
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: theme.size.chipHeight,
          borderRadius: theme.radius.full,
          borderWidth: theme.size.borderWidthStrong,
          borderColor: disabled
            ? theme.color.border
            : selected
              ? theme.color.primary
              : theme.color.borderStrong,
          backgroundColor: selected
            ? theme.color.primarySoft
            : pressed
              ? theme.color.surfaceAlt
              : 'transparent',
        },
      ]}
    >
      {selected ? (
        <Icon name="check" size={16} color={fg} />
      ) : icon ? (
        <Icon name={icon} size={16} color={fg} />
      ) : null}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}

export type StatusChipKind = 'waiting' | 'drawn' | 'revealed' | 'finished' | 'organizer' | 'info';

const STATUS: Record<StatusChipKind, { bg: ColorName; fg: ColorName; icon?: IconName }> = {
  waiting: { bg: 'surfaceAlt', fg: 'textSecondary', icon: 'users' },
  drawn: { bg: 'secondarySoft', fg: 'textOnSecondarySoft', icon: 'lock' },
  revealed: { bg: 'accent', fg: 'textOnAccent', icon: 'gift' },
  finished: { bg: 'surfaceAlt', fg: 'textSecondary', icon: 'check' },
  organizer: { bg: 'primarySoft', fg: 'textOnPrimarySoft' },
  info: { bg: 'surfaceAlt', fg: 'textSecondary' },
};

/** Non-interactive status chip: always icon (where defined) + text. */
export function StatusChip({
  kind,
  label,
  icon,
  testID,
}: {
  kind: StatusChipKind;
  label: string;
  icon?: IconName;
  testID?: string;
}) {
  const theme = useTheme();
  const s = STATUS[kind];
  const iconName = icon ?? s.icon;
  return (
    <View
      testID={testID}
      style={[
        styles.status,
        {
          backgroundColor: theme.color[s.bg],
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.space.md,
        },
      ]}
    >
      {iconName ? <Icon name={iconName} size={14} color={s.fg} /> : null}
      <Text variant="caption" color={s.fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
  },
});
