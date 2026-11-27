import type { GroupDetail } from '@entre-nos/contracts';
import { Avatar, Button, Screen, Text, useTheme } from '@entre-nos/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { drawErrorMessage, useDrawNotice } from '../../../../src/features/groups/draw';
import { useDraw, useGroup, useRedraw } from '../../../../src/features/groups/hooks';
import { errorCode } from '../../../../src/lib/errors';
import { haptics } from '../../../../src/lib/haptics';

const RING = 220;
const AVATAR = 56;
const MAX_RING = 8;

/** S7 — Sorteo (animación). Runs the draw (or redraw) once on mount. */
export default function DrawScreen() {
  const theme = useTheme();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const { data: g } = useGroup(id);
  const draw = useDraw(id);
  const redraw = useRedraw(id);
  const reduced = useReducedMotion();
  const [done, setDone] = useState(false);
  const started = useRef(false);
  const groupRef = useRef<GroupDetail | undefined>(g);
  groupRef.current = g;

  const spin = useSharedValue(0);
  const gather = useSharedValue(1);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!reduced) {
      spin.value = withRepeat(
        withTiming(360, { duration: theme.duration.drawLoop * 2, easing: Easing.linear }),
        -1,
      );
    }
  }, [reduced, spin, theme.duration.drawLoop]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t0 = Date.now();
    const wait = () =>
      new Promise<void>((r) =>
        setTimeout(r, Math.max(0, theme.duration.drawMin - (Date.now() - t0))),
      );
    const m = mode === 'redraw' ? redraw : draw;
    m.mutate(undefined, {
      onSuccess: async () => {
        await wait();
        gather.value = withTiming(0, { duration: theme.duration.normal });
        flash.value = withSpring(1, theme.spring.bouncy);
        haptics.success();
        AccessibilityInfo.announceForAccessibility('Sorteo hecho');
        setDone(true);
      },
      onError: async (e) => {
        await wait();
        haptics.error();
        const current = groupRef.current;
        useDrawNotice.getState().set(id, {
          message: current
            ? drawErrorMessage(e, current)
            : 'El sorteo no se completó. No te preocupes: no quedó nada a medias. Vuelve a intentar.',
          reviewExclusions: errorCode(e) === 'DRAW_IMPOSSIBLE',
        });
        if (router.canGoBack()) router.back();
        else router.replace({ pathname: '/grupo/[id]', params: { id } });
      },
    });
    // Run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: gather.value }],
    opacity: gather.value,
  }));
  const flashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flash.value }],
    opacity: flash.value,
  }));

  const people = (g?.members ?? []).filter((m) => m.participates).slice(0, MAX_RING);
  const iParticipate = g?.members.find((m) => m.isMe)?.participates ?? true;

  return (
    <Screen
      testID="draw-screen"
      scroll={false}
      footer={
        done ? (
          iParticipate ? (
            <Button
              label="Ver a quién me tocó"
              icon="gift"
              onPress={() => router.replace({ pathname: '/grupo/[id]/revelar', params: { id } })}
              fullWidth
              testID="draw-see"
            />
          ) : (
            <Button
              label="Volver al grupo"
              onPress={() => router.back()}
              fullWidth
              testID="draw-back"
            />
          )
        ) : undefined
      }
    >
      <View style={styles.center}>
        <View style={styles.stage}>
          <Animated.View style={[styles.ring, ringStyle]}>
            {people.map((m, i) => {
              const angle = (2 * Math.PI * i) / Math.max(people.length, 1);
              const r = RING / 2 - AVATAR / 2;
              return (
                <View
                  key={m.id}
                  style={[
                    styles.slot,
                    {
                      left: RING / 2 - AVATAR / 2 + r * Math.cos(angle),
                      top: RING / 2 - AVATAR / 2 + r * Math.sin(angle),
                    },
                  ]}
                >
                  <Avatar name={m.name} seed={m.id} photo={m.photo} size="md" />
                </View>
              );
            })}
          </Animated.View>
          <Animated.View
            style={[
              styles.flash,
              { backgroundColor: theme.color.accent, borderRadius: theme.radius.full },
              flashStyle,
            ]}
          />
          {reduced && !done ? <ActivityIndicator color={theme.color.primary} /> : null}
        </View>
        <View style={{ gap: theme.space.sm }} accessibilityLiveRegion="polite">
          <Text variant="title2" align="center" accessibilityRole="header">
            {done ? '¡Listo! El sorteo quedó hecho.' : 'Barajando nombres…'}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {done
              ? 'Ya les avisamos a todos.'
              : 'La app hace el sorteo. Nadie puede ver los resultados.'}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32 },
  stage: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING, height: RING },
  slot: { position: 'absolute', width: AVATAR, height: AVATAR },
  flash: { position: 'absolute', width: 120, height: 120 },
});
