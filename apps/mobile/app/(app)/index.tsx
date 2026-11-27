import type { GroupDetail, GroupSummary } from '@entre-nos/contracts';
import {
  Avatar,
  Button,
  EmptyState,
  Screen,
  SkeletonCard,
  SkeletonGroup,
  Text,
  useTheme,
} from '@entre-nos/ui';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { GroupCard } from '../../src/components/GroupCard';
import { LoadError, OfflineBanner } from '../../src/components/states';
import { useGroups } from '../../src/features/groups/hooks';
import { qk } from '../../src/query/keys';
import { usePrefs } from '../../src/state/prefs';
import { useSession } from '../../src/state/session';

/** S2 — Mis grupos. */
export default function MyGroupsScreen() {
  const theme = useTheme();
  const client = useQueryClient();
  const user = useSession((s) => s.user);
  const seenDraw = usePrefs((s) => s.seenDraw);
  const { data, error, isPending, refetch, isRefetching } = useGroups();
  const [refreshing, setRefreshing] = useState(false);

  const pendingReveal = (g: GroupSummary): boolean => {
    if (g.status !== 'drawn' || seenDraw[g.id] !== undefined) return false;
    // "Solo organizo": nothing to reveal for me.
    const detail = client.getQueryData<GroupDetail>(qk.group(g.id));
    const me = detail?.members.find((m) => m.isMe);
    return me ? me.participates : true;
  };

  const groups = useMemo(() => {
    const list = data?.groups ?? [];
    const score = (g: GroupSummary) => {
      if (g.daysLeft < 0) return 3; // finished, last
      if (pendingReveal(g) || g.daysLeft === 0) return 0;
      return 1;
    };
    return [...list].sort((a, b) => score(a) - score(b) || a.daysLeft - b.daysLeft);
    // pendingReveal depends on seenDraw
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, seenDraw]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch().catch(() => undefined);
    setRefreshing(false);
  };

  const hasGroups = groups.length > 0;
  const footer = hasGroups ? (
    <View style={[styles.actions, { gap: theme.space.sm }]}>
      <Button
        label="Crear grupo"
        icon="plus"
        onPress={() => router.push('/grupos/nuevo')}
        style={styles.half}
        testID="create-group-button"
      />
      <Button
        variant="outline"
        label="Unirme con código"
        icon="code"
        onPress={() => router.push('/unirse')}
        style={styles.half}
        testID="join-code-button"
      />
    </View>
  ) : null;

  return (
    <Screen
      testID="groups-screen"
      header={
        <View style={styles.header}>
          <Text variant="title1" style={styles.flex}>
            Mis grupos
          </Text>
          <Pressable
            onPress={() => router.push('/perfil')}
            accessibilityRole="button"
            accessibilityLabel="Tu perfil y ajustes"
            testID="profile-button"
            hitSlop={4}
            style={styles.avatarBtn}
          >
            <Avatar
              name={user?.name ?? '?'}
              seed={user?.id ?? 'me'}
              photo={user?.photo}
              size="md"
            />
          </Pressable>
        </View>
      }
      footer={footer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || (isRefetching && refreshing)}
          onRefresh={() => void onRefresh()}
          colors={[theme.color.primary]}
          tintColor={theme.color.primary}
          progressBackgroundColor={theme.color.surface}
        />
      }
    >
      <OfflineBanner hasData={!!data} />
      {isPending && !data ? (
        <SkeletonGroup testID="groups-loading">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </SkeletonGroup>
      ) : error && !data ? (
        <LoadError
          error={error}
          onRetry={() => void refetch()}
          title="No pudimos cargar tus grupos"
        />
      ) : !hasGroups ? (
        <EmptyState
          testID="groups-empty"
          icon="gift"
          title="Arma tu primer amigo secreto"
          body="Crea un grupo e invita a tu gente por WhatsApp. O únete con el código que te mandaron."
          primary={{
            label: 'Crear grupo',
            onPress: () => router.push('/grupos/nuevo'),
            testID: 'empty-create-group',
          }}
          secondary={{
            label: 'Tengo un código',
            onPress: () => router.push('/unirse'),
            testID: 'empty-join-code',
          }}
        />
      ) : (
        <View style={{ gap: theme.space.md }}>
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              pendingReveal={pendingReveal(g)}
              onPress={() => router.push({ pathname: '/grupo/[id]', params: { id: g.id } })}
              onReveal={() =>
                router.push({ pathname: '/grupo/[id]/revelar', params: { id: g.id } })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 8 },
  flex: { flex: 1 },
  avatarBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  half: { flexGrow: 1, flexBasis: 140 },
});
