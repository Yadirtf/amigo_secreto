import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import type { IconName } from '../icons';
import { countdownInfo, type CountdownKind } from '../logic';
import { useTheme } from '../theme';
import type { ColorName } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

const STYLE: Record<CountdownKind, { bg: ColorName; fg: ColorName; icon: IconName }> = {
  far: { bg: 'surfaceAlt', fg: 'textPrimary', icon: 'calendar' },
  soon: { bg: 'primarySoft', fg: 'textOnPrimarySoft', icon: 'calendar' },
  tomorrow: { bg: 'primarySoft', fg: 'textOnPrimarySoft', icon: 'alarm' },
  today: { bg: 'accent', fg: 'textOnAccent', icon: 'gift' },
  past: { bg: 'surfaceAlt', fg: 'textSecondary', icon: 'check' },
};

export interface CountdownBadgeProps {
  daysLeft: number;
  /** Large version (detail): big number + label. */
  large?: boolean;
  testID?: string;
}

/** Style guide §8.11. Days are calendar days computed by the server (Bogotá). */
export function CountdownBadge({ daysLeft, large, testID }: CountdownBadgeProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const info = countdownInfo(daysLeft);
  const s = STYLE[info.kind];
  const scale = useSharedValue(1);

  useEffect(() => {
    if (info.kind !== 'today' || reduced) return;
    scale.value = withRepeat(
      withSequence(withSpring(1.05, theme.spring.bouncy), withSpring(1, theme.spring.bouncy)),
      2,
      false,
    );
  }, [info.kind, reduced, scale, theme.spring.bouncy]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (large && (info.kind === 'far' || info.kind === 'soon')) {
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={info.accessibilityLabel}
        style={[
          styles.large,
          {
            backgroundColor: theme.color[s.bg],
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.space.lg,
            paddingVertical: theme.space.sm,
          },
        ]}
      >
        <Text variant="countdown" color={s.fg} align="center">
          {String(daysLeft)}
        </Text>
        <Text variant="label" color={s.fg} align="center">
          días para la entrega
        </Text>
      </View>
    );
  }

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityLabel={info.accessibilityLabel}
      style={[
        styles.badge,
        {
          backgroundColor: theme.color[s.bg],
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.space.md,
        },
        animated,
      ]}
    >
      <Icon name={s.icon} size={16} color={s.fg} />
      <Text variant="label" color={s.fg}>
        {info.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 28,
    paddingVertical: 2,
  },
  large: { alignItems: 'center', alignSelf: 'flex-start' },
});
