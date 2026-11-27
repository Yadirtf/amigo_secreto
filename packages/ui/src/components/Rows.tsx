import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import type { IconName } from '../icons';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  detail?: string;
  left?: ReactNode;
  right?: ReactNode;
  icon?: IconName;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  highlighted?: boolean;
  /** Bold title (own row in the reveal list). */
  strong?: boolean;
}

/** Style guide §8.12 ListRow: minHeight 56 (64 with avatar). */
export function ListRow({
  title,
  detail,
  left,
  right,
  icon,
  onPress,
  onLongPress,
  chevron,
  accessibilityLabel,
  accessibilityHint,
  testID,
  highlighted,
  strong = true,
}: ListRowProps) {
  const theme = useTheme();
  const content = (
    <>
      {icon ? <Icon name={icon} color="textSecondary" /> : null}
      {left}
      <View style={styles.flex}>
        <Text variant={strong ? 'bodyStrong' : 'body'}>{title}</Text>
        {detail ? (
          <Text variant="caption" color="textSecondary">
            {detail}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon name="chevronRight" color="textSecondary" /> : null}
    </>
  );
  const base = [
    styles.row,
    {
      minHeight: left ? 64 : 56,
      gap: theme.space.md,
      paddingHorizontal: theme.space.md,
      borderRadius: theme.radius.md,
      backgroundColor: highlighted ? theme.color.surfaceAlt : 'transparent',
    },
  ];
  if (!onPress && !onLongPress) {
    return (
      <View
        testID={testID}
        style={base}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, detail].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: 'rgba(43,30,26,0.08)' }}
      style={({ pressed }) => [base, pressed ? { backgroundColor: theme.color.surfaceAlt } : null]}
    >
      {content}
    </Pressable>
  );
}

export interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/** Whole row toggles (48+), label left, caption below. */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  testID,
}: SwitchRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      style={[styles.row, { minHeight: 56, gap: theme.space.md }]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={disabled ? 'textDisabled' : 'textPrimary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="textSecondary">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.color.borderStrong, true: theme.color.focus }}
        thumbColor={theme.color.surface}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export interface CheckRowProps {
  label: string;
  detail?: string;
  checked: boolean;
  onToggle: () => void;
  left?: ReactNode;
  /** checkbox (default) or radio. */
  kind?: 'checkbox' | 'radio';
  disabled?: boolean;
  testID?: string;
}

/** Checkbox/radio row: 56 dp, whole row tappable, state shown with a check. */
export function CheckRow({
  label,
  detail,
  checked,
  onToggle,
  left,
  kind = 'checkbox',
  disabled,
  testID,
}: CheckRowProps) {
  const theme = useTheme();
  const radio = kind === 'radio';
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole={kind}
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityState={{ checked, disabled: !!disabled }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: 56,
          gap: theme.space.md,
          paddingHorizontal: theme.space.sm,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? theme.color.surfaceAlt : 'transparent',
        },
      ]}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: radio ? 12 : 6,
          borderWidth: theme.size.borderWidthStrong,
          borderColor: checked ? theme.color.primaryText : theme.color.borderStrong,
          backgroundColor: checked && !radio ? theme.color.primaryText : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && !radio ? <Icon name="check" size={16} color="surface" /> : null}
        {checked && radio ? (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: theme.color.primaryText,
            }}
          />
        ) : null}
      </View>
      {left}
      <View style={styles.flex}>
        <Text variant="body">{label}</Text>
        {detail ? (
          <Text variant="caption" color="textSecondary">
            {detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
});
