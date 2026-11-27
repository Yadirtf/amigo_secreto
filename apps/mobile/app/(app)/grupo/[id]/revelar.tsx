import type { MyAssignment } from '@entre-nos/contracts';
import {
  Avatar,
  Button,
  Confetti,
  EmptyState,
  Icon,
  Screen,
  Text,
  ThemeProvider,
  useTheme,
} from '@entre-nos/ui';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { goBack } from '../../../../src/components/states';
import { useAssignment, useGroup } from '../../../../src/features/groups/hooks';
import { errorMessage } from '../../../../src/lib/errors';
import { formatCop, formatDayLong } from '../../../../src/lib/format';
import { haptics } from '../../../../src/lib/haptics';
import { usePrefs } from '../../../../src/state/prefs';

/** S8 — "¿A quién te tocó?". Always dark: it's a moment. */
export default function RevealScreen() {
  usePreventScreenCapture();
  return (
    <ThemeProvider scheme="dark">
      <StatusBar style="light" />
      <RevealFlow />
    </ThemeProvider>
  );
}

type Step = 'redrawNotice' | 'privacy' | 'hold' | 'revealed';

function RevealFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: g } = useGroup(id);
  const assignment = useAssignment(id, true);
  const seen = usePrefs((s) => s.seenDraw[id]);
  const markDrawSeen = usePrefs((s) => s.markDrawSeen);
  const drawCount = g?.drawCount ?? assignment.data?.drawNumber;
  const [step, setStep] = useState<Step>(() =>
    seen !== undefined && drawCount !== undefined && seen !== drawCount
      ? 'redrawNotice'
      : 'privacy',
  );

  const onRevealed = (a: MyAssignment) => {
    markDrawSeen(id, a.drawNumber);
    setStep('revealed');
    AccessibilityInfo.announceForAccessibility(`Te tocó regalarle a ${a.recipient.name}`);
  };

  if (step === 'redrawNotice') {
    return (
      <Screen
        topBar={{ onBack: goBack, backIcon: 'close' }}
        scroll={false}
        footer={
          <Button
            label="Entendido"
            onPress={() => setStep('privacy')}
            fullWidth
            testID="reveal-redraw-ok"
          />
        }
      >
        <Centered>
          <Icon name="draw" size={48} color="primaryText" />
          <Text variant="title1" align="center" accessibilityRole="header">
            Hubo un nuevo sorteo. Tu amigo secreto cambió.
          </Text>
        </Centered>
      </Screen>
    );
  }

  if (step === 'privacy') {
    return (
      <Screen
        testID="reveal-privacy"
        topBar={{ onBack: goBack, backIcon: 'close' }}
        scroll={false}
        footer={
          <Button
            label="Listo, nadie me ve"
            onPress={() => setStep('hold')}
            fullWidth
            testID="reveal-ready"
          />
        }
      >
        <Centered>
          <Icon name="eye" size={48} color="primaryText" />
          <Text variant="title1" align="center" accessibilityRole="header">
            Antes de abrir…
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Asegúrate de que nadie esté mirando tu pantalla.
          </Text>
        </Centered>
      </Screen>
    );
  }

  if (!assignment.data) {
    if (assignment.error) {
      return (
        <Screen topBar={{ onBack: goBack, backIcon: 'close' }} scroll={false}>
          <EmptyState
            tone="error"
            icon="error"
            title="No pudimos abrir tu regalo"
            body={errorMessage(assignment.error, 'assignment')}
            primary={{
              label: 'Reintentar',
              onPress: () => void assignment.refetch(),
              testID: 'retry-button',
            }}
          />
        </Screen>
      );
    }
  }

  return (
    <HoldAndReveal
      assignment={assignment.data}
      revealed={step === 'revealed'}
      onRevealed={onRevealed}
      budgetCop={g?.budgetCop ?? null}
      deliveryDate={g?.deliveryDate ?? null}
      groupId={id}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const CARD_W = 240;
const CARD_H = 300;
const RING_PAD = 14;
const RING_W = CARD_W + RING_PAD * 2;
const RING_H = CARD_H + RING_PAD * 2;
const STROKE = 6;
// Approximation of the rounded-rect perimeter used for the progress ring.
const PERIMETER = 2 * (RING_W + RING_H);

const AnimatedSvgRect = Animated.createAnimatedComponent(Rect);

interface HoldProps {
  assignment: MyAssignment | undefined;
  revealed: boolean;
  onRevealed: (a: MyAssignment) => void;
  budgetCop: number | null;
  deliveryDate: string | null;
  groupId: string;
}

function HoldAndReveal({
  assignment,
  revealed,
  onRevealed,
  budgetCop,
  deliveryDate,
  groupId,
}: HoldProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const shake = useSharedValue(0);
  const flip = useSharedValue(revealed ? 1 : 0);
  const [hint, setHint] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const holdStart = useRef(0);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingReveal = useRef(false);
  const holdMs = theme.duration.revealHold;

  const stopTimers = () => {
    if (ticker.current) clearInterval(ticker.current);
    if (completeTimer.current) clearTimeout(completeTimer.current);
    ticker.current = null;
    completeTimer.current = null;
  };
  useEffect(() => stopTimers, []);

  const finish = (a: MyAssignment) => {
    stopTimers();
    cancelAnimation(shake);
    shake.value = withTiming(0, { duration: theme.duration.fast });
    haptics.reveal();
    setTimeout(() => haptics.success(), 150);
    flip.value = reduced
      ? withTiming(1, { duration: theme.duration.fast })
      : withSpring(1, theme.spring.bouncy);
    onRevealed(a);
  };

  // If the hold completed before the assignment arrived, reveal when it does.
  useEffect(() => {
    if (assignment && pendingReveal.current) {
      pendingReveal.current = false;
      setWaiting(false);
      finish(assignment);
    }
    // finish is stable enough for this hand-off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment]);

  const complete = () => {
    if (assignment) finish(assignment);
    else {
      pendingReveal.current = true;
      setWaiting(true);
      stopTimers();
    }
  };

  const onPressIn = () => {
    if (revealed) return;
    setHint(null);
    holdStart.current = Date.now();
    progress.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
    if (!reduced) {
      shake.value = withRepeat(
        withSequence(withTiming(-2, { duration: 60 }), withTiming(2, { duration: 60 })),
        -1,
        true,
      );
    }
    haptics.tapLight();
    ticker.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      if (elapsed >= holdMs * 0.6) haptics.tapMedium();
      else haptics.tapLight();
    }, 200);
    completeTimer.current = setTimeout(complete, holdMs);
  };

  const onPressOut = () => {
    if (revealed || pendingReveal.current) return;
    const elapsed = Date.now() - holdStart.current;
    if (elapsed < holdMs) {
      stopTimers();
      cancelAnimation(shake);
      shake.value = withTiming(0, { duration: theme.duration.fast });
      progress.value = withTiming(0, { duration: theme.duration.fast });
      setHint('¡Casi! Mantén un poquito más.');
    }
  };

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: PERIMETER * (1 - progress.value),
  }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateZ: `${shake.value}deg` },
      { scale: 1 + 0.06 * progress.value * (1 - flip.value) },
      { rotateY: `${flip.value * 180}deg` },
    ],
    opacity: reduced ? 1 - flip.value : flip.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${(flip.value - 1) * 180}deg` }],
    opacity: reduced ? flip.value : flip.value >= 0.5 ? 1 : 0,
  }));

  if (revealed && assignment) {
    return (
      <RevealedView
        a={assignment}
        backStyle={backStyle}
        budgetCop={budgetCop}
        deliveryDate={deliveryDate}
        groupId={groupId}
      />
    );
  }

  return (
    <Screen topBar={{ onBack: goBack, backIcon: 'close' }} scroll={false} testID="reveal-hold">
      <Centered>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Regalo cerrado. Toca dos veces para ver a quién te tocó."
          accessibilityActions={[{ name: 'activate', label: 'Abrir regalo' }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'activate') complete();
          }}
          testID="reveal-gift"
        >
          <View style={{ width: RING_W, height: RING_H }}>
            <ProgressFrame ringProps={ringProps} />
            <Animated.View
              style={[
                styles.card,
                {
                  backgroundColor: theme.color.accent,
                  borderRadius: theme.radius.xl,
                  left: RING_PAD,
                  top: RING_PAD,
                },
                boxStyle,
              ]}
            >
              <Icon name="gift" size={96} color="textOnAccent" strokeWidth={1.5} />
            </Animated.View>
          </View>
        </Pressable>
        <Text variant="title3" align="center">
          {waiting ? 'Abriendo tu regalo…' : 'Mantén presionado para abrir'}
        </Text>
        {hint ? (
          <Text
            variant="body"
            color="textSecondary"
            align="center"
            accessibilityLiveRegion="polite"
          >
            {hint}
          </Text>
        ) : null}
      </Centered>
    </Screen>
  );
}

function ProgressFrame({ ringProps }: { ringProps: Partial<{ strokeDashoffset: number }> }) {
  const theme = useTheme();
  return (
    <Svg width={RING_W} height={RING_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedSvgRect
        x={STROKE / 2}
        y={STROKE / 2}
        width={RING_W - STROKE}
        height={RING_H - STROKE}
        rx={theme.radius.xl + RING_PAD / 2}
        stroke={theme.color.primaryText}
        strokeWidth={STROKE}
        strokeDasharray={`${PERIMETER} ${PERIMETER}`}
        strokeLinecap="round"
        fill="none"
        animatedProps={ringProps}
      />
    </Svg>
  );
}

function RevealedView({
  a,
  backStyle,
  budgetCop,
  deliveryDate,
  groupId,
}: {
  a: MyAssignment;
  backStyle: ReturnType<typeof useAnimatedStyle>;
  budgetCop: number | null;
  deliveryDate: string | null;
  groupId: string;
}) {
  const theme = useTheme();
  const first = a.recipient.name.split(' ')[0] ?? a.recipient.name;
  const hasList = a.wishlist.length > 0;
  const toFriend = (tab: 'lista' | 'chat') =>
    router.replace({ pathname: '/grupo/[id]/amigo', params: { id: groupId, tab } });
  return (
    <Screen
      testID="reveal-result"
      scroll
      footer={
        <>
          {hasList ? (
            <Button
              label="Ver su lista de deseos"
              icon="wishlist"
              onPress={() => toFriend('lista')}
              fullWidth
              testID="reveal-wishlist"
            />
          ) : null}
          <Button
            variant={hasList ? 'outline' : 'primary'}
            label="Escribirle en secreto"
            icon="chat"
            onPress={() => toFriend('chat')}
            fullWidth
            testID="reveal-chat"
          />
          <Button
            variant="ghost"
            label="Volver al grupo"
            onPress={() => goBack()}
            fullWidth
            testID="reveal-back"
          />
        </>
      }
    >
      <Animated.View style={[styles.result, { gap: theme.space.md }, backStyle]}>
        <Text variant="body" color="textSecondary" align="center">
          Te tocó regalarle a
        </Text>
        <Avatar name={a.recipient.name} seed={a.recipient.id} photo={a.recipient.photo} size="xl" />
        <Text
          variant="display"
          color="accent"
          align="center"
          accessibilityRole="header"
          testID="reveal-name"
        >
          {a.recipient.name}
        </Text>
        {budgetCop !== null ? (
          <Text variant="body" align="center">{`Presupuesto: ${formatCop(budgetCop)}`}</Text>
        ) : null}
        {deliveryDate ? (
          <Text variant="body" align="center">{`Entrega: ${formatDayLong(deliveryDate)}`}</Text>
        ) : null}
        {!hasList ? (
          <Text variant="body" color="textSecondary" align="center">
            {`${first} todavía no ha escrito su lista. Pregúntale en secreto qué le gustaría.`}
          </Text>
        ) : null}
      </Animated.View>
      <Confetti />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  result: { alignItems: 'center', paddingTop: 24, backfaceVisibility: 'hidden' },
});
