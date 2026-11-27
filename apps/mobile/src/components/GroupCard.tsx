import type { GroupSummary } from '@entre-nos/contracts';
import {
  Avatar,
  Card,
  CountdownBadge,
  countdownInfo,
  Icon,
  StatusChip,
  Text,
  useTheme,
} from '@entre-nos/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDayShort } from '../lib/format';

export function statusLabel(g: Pick<GroupSummary, 'status' | 'daysLeft'>): {
  kind: 'waiting' | 'drawn' | 'revealed' | 'finished';
  label: string;
} {
  if (g.status === 'revealed') return { kind: 'revealed', label: 'Revelado' };
  if (g.status === 'drawn') return { kind: 'drawn', label: 'Sorteo hecho' };
  return { kind: 'waiting', label: 'Esperando gente' };
}

export interface GroupCardProps {
  group: GroupSummary;
  onPress: () => void;
  /** Drawn and I haven't opened my assignment yet. */
  pendingReveal: boolean;
  onReveal: () => void;
}

/** GroupCard (§8.4): read by TalkBack as a single element. */
export function GroupCard({ group, onPress, pendingReveal, onReveal }: GroupCardProps) {
  const theme = useTheme();
  const status = statusLabel(group);
  const people = `${group.memberCount} ${group.memberCount === 1 ? 'persona' : 'personas'}`;
  const a11y = [
    group.name,
    people,
    `entrega el ${formatDayShort(group.deliveryDate)}`,
    countdownInfo(group.daysLeft).accessibilityLabel,
    status.label,
    group.isOrganizer ? 'organizas tú' : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <View testID={`group-card-${group.name}`}>
      <Card onPress={onPress} accessibilityLabel={a11y} padded={false}>
        <View style={[styles.row, { padding: theme.space.lg, gap: theme.space.md }]}>
          <Avatar name={group.name} seed={group.id} photo={group.photo} size="lg" rounded />
          <View style={styles.body}>
            <Text variant="title3" numberOfLines={2}>
              {group.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {`${people} · Entrega ${formatDayShort(group.deliveryDate)}`}
            </Text>
            <View style={styles.chips}>
              <CountdownBadge daysLeft={group.daysLeft} />
              <StatusChip kind={status.kind} label={status.label} />
              {group.isOrganizer ? <StatusChip kind="organizer" label="Organizas tú" /> : null}
            </View>
          </View>
        </View>
        {pendingReveal ? (
          <Pressable
            testID={`group-card-reveal-${group.name}`}
            onPress={onReveal}
            accessibilityRole="button"
            accessibilityLabel={`Ver a quién te tocó en ${group.name}`}
            style={({ pressed }) => [
              styles.strip,
              {
                backgroundColor: pressed ? theme.color.accentPressed : theme.color.accent,
                borderBottomLeftRadius: theme.radius.lg,
                borderBottomRightRadius: theme.radius.lg,
                paddingHorizontal: theme.space.lg,
              },
            ]}
          >
            <Icon name="gift" size={20} color="textOnAccent" />
            <Text variant="button" color="textOnAccent">
              Ver a quién te tocó
            </Text>
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  body: { flex: 1, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
});
