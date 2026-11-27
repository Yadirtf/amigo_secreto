import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export interface Segment<K extends string> {
  key: K;
  label: string;
  /** Extra text for TalkBack ("3 ideas"). */
  accessibilityLabel?: string;
  testID?: string;
}

export interface SegmentedControlProps<K extends string> {
  segments: Segment<K>[];
  value: K;
  onChange: (key: K) => void;
}

/** Two-tab control (S10 "Su lista" / "Chat secreto"). Selected = fill + bold. */
export function SegmentedControl<K extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<K>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.wrap,
        {
          backgroundColor: theme.color.surfaceAlt,
          borderRadius: theme.radius.md,
          padding: theme.space.xs,
        },
      ]}
    >
      {segments.map((s) => {
        const selected = s.key === value;
        return (
          <Pressable
            key={s.key}
            testID={s.testID}
            onPress={() => onChange(s.key)}
            accessibilityRole="tab"
            accessibilityLabel={s.accessibilityLabel ?? s.label}
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              {
                minHeight: 44,
                borderRadius: theme.radius.sm,
                backgroundColor: selected ? theme.color.surface : 'transparent',
                borderWidth: selected ? theme.size.borderWidthStrong : 0,
                borderColor: theme.color.borderStrong,
              },
            ]}
          >
            <Text
              variant={selected ? 'label' : 'caption'}
              color={selected ? 'textPrimary' : 'textSecondary'}
              align="center"
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
