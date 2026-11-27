import type { Reveal } from '@entre-nos/contracts';
import { Avatar, Button, Confetti, Icon, Screen, SectionHeader, Text, useTheme } from '@entre-nos/ui';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { goBack, LoadError, LoadingScreen } from '../../../../src/components/states';
import { purgeDate } from '../../../../src/features/groups/draw';
import { useGroup, useReveal } from '../../../../src/features/groups/hooks';
import { formatDayWithYear } from '../../../../src/lib/format';
import { shareToWhatsApp } from '../../../../src/lib/share';

/** S11 — Revelación final. */
export default function RevelationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: g } = useGroup(id);
  const reveal = useReveal(id, true);

  if (!reveal.data) {
    return reveal.error ? (
      <Screen topBar={{ onBack: goBack }}>
        <LoadError error={reveal.error} onRetry={() => void reveal.refetch()} />
      </Screen>
    ) : (
      <LoadingScreen onBack={goBack} />
    );
  }
  return (
    <RevelationView
      r={reveal.data}
      groupName={g?.name ?? ''}
      purge={g ? formatDayWithYear(purgeDate(g)) : null}
      myId={g?.members.find((m) => m.isMe)?.id}
    />
  );
}

function shareRevealText(groupName: string, r: Reveal): string {
  const list = r.pairs.map((p) => `${p.giver.name} → ${p.receiver.name}`).join('\n');
  return `¡Así quedó nuestro amigo secreto *${groupName}*! 🎁\n${list}\nLo organizamos con Entre Nos.`;
}

function RevelationView({
  r,
  groupName,
  purge,
  myId,
}: {
  r: Reveal;
  groupName: string;
  purge: string | null;
  myId: string | undefined;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    enter.value = withSpring(1, theme.spring.bouncy);
    if (r.myGiver) AccessibilityInfo.announceForAccessibility(`Quien te regaló fue ${r.myGiver.name}`);
  }, [enter, r.myGiver, theme.spring.bouncy]);

  const nameStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.9 + 0.1 * enter.value }],
  }));

  return (
    <Screen
      testID="revelation-screen"
      topBar={{ onBack: goBack }}
      footer={
        <Button
          variant="outline"
          icon="share"
          label="Compartir en el grupo"
          onPress={() => void shareToWhatsApp(shareRevealText(groupName, r))}
          fullWidth
          testID="revelation-share"
        />
      }
    >
      <View style={[styles.center, { gap: theme.space.sm }]}>
        <Icon name="gift" size={48} color="accentText" />
        <Text variant="title1" align="center" accessibilityRole="header">
          ¡Llegó la revelación!
        </Text>
        {r.myGiver ? (
          <>
            <Text variant="body" color="textSecondary" align="center">
              Quien te regaló fue…
            </Text>
            <Animated.View style={[styles.center, { gap: theme.space.sm }, nameStyle]}>
              <Avatar
                name={r.myGiver.name}
                seed={r.myGiver.id}
                photo={r.myGiver.photo}
                size="xl"
              />
              <Text variant="display" color="accentText" align="center" testID="revelation-giver">
                {r.myGiver.name}
              </Text>
            </Animated.View>
          </>
        ) : null}
      </View>

      <SectionHeader title="ASÍ QUEDÓ EL SORTEO" />
      <View testID="revelation-pairs">
        {r.pairs.map((p) => {
          const mine = p.giver.id === myId || p.receiver.id === myId;
          return (
            <View
              key={`${p.giver.id}-${p.receiver.id}`}
              style={[
                styles.pair,
                {
                  gap: theme.space.sm,
                  paddingHorizontal: theme.space.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: mine ? theme.color.surfaceAlt : 'transparent',
                },
              ]}
              accessible
              accessibilityLabel={`${p.giver.name} le regaló a ${p.receiver.name}`}
            >
              <Text variant="body" style={styles.flex}>
                {p.giver.name}
              </Text>
              <Icon name="chevronRight" size={16} color="textSecondary" />
              <Text variant="bodyStrong" style={styles.flex}>
                {p.receiver.name}
              </Text>
            </View>
          );
        })}
      </View>
      {purge ? (
        <Text variant="caption" color="textSecondary" align="center">
          {`Los datos de este grupo se borran el ${purge}.`}
        </Text>
      ) : null}
      <Confetti />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  pair: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  flex: { flex: 1 },
});
