import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  circle?: boolean;
  style?: ViewStyle;
}

/** A single shimmering block (§8.8). Hidden from screen readers. */
export function Skeleton({ width = '100%', height = 16, radius, circle, style }: SkeletonProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: theme.duration.skeletonPulse,
        easing: Easing.bezier(...theme.easing.linear),
      }),
      -1,
      reduced,
    );
  }, [progress, reduced, theme.duration.skeletonPulse, theme.easing.linear]);

  const shimmer = useAnimatedStyle(() =>
    reduced
      ? { opacity: 0 }
      : { transform: [{ translateX: -w + progress.value * w * 2 }], opacity: 1 },
  );
  const pulse = useAnimatedStyle(() => (reduced ? { opacity: 1 - progress.value * 0.4 } : {}));

  return (
    <Animated.View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        {
          width: circle ? height : width,
          height,
          borderRadius: circle ? height / 2 : (radius ?? theme.radius.xs),
          backgroundColor: theme.color.skeleton,
          overflow: 'hidden',
        },
        pulse,
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { width: '60%', backgroundColor: theme.color.skeletonHighlight, opacity: 0.9 },
          shimmer,
        ]}
      />
    </Animated.View>
  );
}

export interface SkeletonGroupProps {
  children: ReactNode;
  /** Only shows after this delay to avoid flicker on fast loads (§8.8). */
  delayMs?: number;
  testID?: string;
}

/** Wraps skeleton blocks: announces "Cargando" once, as busy. */
export function SkeletonGroup({ children, delayMs = 300, testID }: SkeletonGroupProps) {
  const [visible, setVisible] = useState(delayMs === 0);
  useEffect(() => {
    if (delayMs === 0) return;
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel="Cargando"
      accessibilityState={{ busy: true }}
      style={{ opacity: visible ? 1 : 0, gap: 12 }}
    >
      {children}
    </View>
  );
}

/** Skeleton shaped like a GroupCard / list card. */
export function SkeletonCard() {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderRadius: theme.radius.lg,
        padding: theme.space.lg,
        flexDirection: 'row',
        gap: theme.space.md,
        borderWidth: theme.scheme === 'dark' ? 1 : 0,
        borderColor: theme.color.border,
      }}
    >
      <Skeleton height={56} width={56} radius={theme.radius.sm} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={18} width="70%" />
        <Skeleton height={14} width="50%" />
        <Skeleton height={24} width={96} radius={theme.radius.full} />
      </View>
    </View>
  );
}
