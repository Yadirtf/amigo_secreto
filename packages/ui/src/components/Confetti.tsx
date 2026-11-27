import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

interface Particle {
  x: number;
  drift: number;
  delay: number;
  rotate: number;
  size: number;
  shape: 'circle' | 'rect' | 'spark';
  color: string;
}

function makeParticles(count: number, width: number, colors: string[]): Particle[] {
  // Decorative only: Math.random is fine here.
  const shapes: Particle['shape'][] = ['circle', 'rect', 'spark'];
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 80,
    delay: Math.random() * 300,
    rotate: (Math.random() - 0.5) * 540,
    size: 6 + Math.random() * 6,
    shape: shapes[i % shapes.length] as Particle['shape'],
    color: colors[i % colors.length] as string,
  }));
}

function Piece({ p, height, duration }: { p: Particle; height: number; duration: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      p.delay,
      withTiming(1, { duration: duration - p.delay, easing: Easing.bezier(0.2, 0, 0.6, 1) }),
    );
  }, [t, p.delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
    transform: [
      { translateX: p.x + p.drift * t.value },
      { translateY: -20 + t.value * (height + 40) },
      { rotate: `${p.rotate * t.value}deg` },
    ],
  }));
  const shapeStyle =
    p.shape === 'circle'
      ? { width: p.size, height: p.size, borderRadius: p.size / 2 }
      : p.shape === 'rect'
        ? { width: p.size * 1.4, height: p.size * 0.7, borderRadius: 2 }
        : { width: p.size * 0.6, height: p.size * 1.6, borderRadius: 3 };
  return (
    <Animated.View style={[styles.piece, style]}>
      <View style={[shapeStyle, { backgroundColor: p.color }]} />
    </Animated.View>
  );
}

export interface ConfettiProps {
  /** Changing the key replays it; by default it plays once on mount. */
  count?: number;
}

/**
 * Subtle confetti (identidad §7): ≤ 40 particles, brand colors, 1.8 s, falls
 * once. Disabled when the system asks to reduce motion.
 */
export function Confetti({ count = 40 }: ConfettiProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const particles = useMemo(
    () =>
      makeParticles(Math.min(count, 40), width, [
        theme.color.confettiCoral,
        theme.color.confettiGreen,
        theme.color.confettiGold,
      ]),
    [count, width, theme.color.confettiCoral, theme.color.confettiGreen, theme.color.confettiGold],
  );
  if (reduced) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {particles.map((p, i) => (
        <Piece key={i} p={p} height={height} duration={theme.duration.confetti} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0 },
});
