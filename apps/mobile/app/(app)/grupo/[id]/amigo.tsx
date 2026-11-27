import type { GroupDetail, MyAssignment } from '@entre-nos/contracts';
import {
  AnonymousAvatar,
  Avatar,
  Button,
  Card,
  CountdownBadge,
  EmptyState,
  IconButton,
  Screen,
  SegmentedControl,
  Text,
  useTheme,
} from '@entre-nos/ui';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useChatMenu } from '../../../../src/components/ChatMenus';
import { ChatView } from '../../../../src/components/ChatView';
import { goBack, LoadError, LoadingScreen, OfflineBanner } from '../../../../src/components/states';
import { WishCard } from '../../../../src/components/WishCard';
import { purgeDate } from '../../../../src/features/groups/draw';
import { useAssignment, useGroup } from '../../../../src/features/groups/hooks';
import { formatCop, formatDayWithYear } from '../../../../src/lib/format';

type Tab = 'lista' | 'chat';
const SHOW_MS = 10_000;

/** S10 — Mi amigo secreto: hidden name, their wishlist and the secret chat. */
export default function FriendScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { data: g } = useGroup(id);
  const a = useAssignment(id, true);
  const menu = useChatMenu(id, 'giver', g?.name ?? 'este grupo');

  if (!a.data) {
    return a.error ? (
      <Screen topBar={{ title: 'Tu amigo secreto', onBack: goBack }}>
        <LoadError error={a.error} onRetry={() => void a.refetch()} />
      </Screen>
    ) : (
      <LoadingScreen title="Tu amigo secreto" onBack={goBack} />
    );
  }
  return (
    <Screen
      testID="friend-screen"
      scroll={false}
      topBar={{
        title: 'Tu amigo secreto',
        onBack: goBack,
        right: (
          <IconButton
            icon="more"
            accessibilityLabel="Opciones del chat"
            onPress={menu.open}
            testID="friend-more"
          />
        ),
      }}
    >
      <FriendBody a={a.data} g={g} initialTab={tab === 'chat' ? 'chat' : 'lista'} />
      {menu.element}
    </Screen>
  );
}

function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

function FriendBody({
  a,
  g,
  initialTab,
}: {
  a: MyAssignment;
  g: GroupDetail | undefined;
  initialTab: Tab;
}) {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [shown, setShown] = useState(false);
  const keyboardOpen = useKeyboardOpen();
  // Small phones: with the keyboard up, the card would leave no room for the
  // conversation, so it steps aside while typing.
  const compact = keyboardOpen && tab === 'chat';

  // Name hidden by default every time; "Mostrar" reveals it for 10 s.
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), SHOW_MS);
    return () => clearTimeout(t);
  }, [shown]);

  const r = a.recipient;
  const first = r.name.split(' ')[0] ?? r.name;
  const readOnly =
    g?.status === 'revealed'
      ? `La revelación ya pasó. Los mensajes se borran el ${formatDayWithYear(purgeDate(g))}.`
      : null;

  return (
    <View style={[styles.flex, { gap: theme.space.md }]}>
      <OfflineBanner />
      {compact ? null : (
        <Card testID="friend-card">
          <View style={[styles.row, { gap: theme.space.md }]}>
            {shown ? (
              <Avatar name={r.name} seed={r.id} photo={r.photo} size="lg" />
            ) : (
              <AnonymousAvatar size="lg" />
            )}
            <View style={[styles.flex, { gap: theme.space.xs }]}>
              <Text
                variant="title3"
                accessibilityLabel={shown ? r.name : 'Nombre oculto. Toca Mostrar para verlo'}
                testID="friend-name"
              >
                {shown ? r.name : '••••••'}
              </Text>
              <View style={[styles.row, styles.wrap, { gap: theme.space.sm }]}>
                {g ? <CountdownBadge daysLeft={g.daysLeft} /> : null}
                {g?.budgetCop != null ? (
                  <Text variant="caption" color="textSecondary">
                    {formatCop(g.budgetCop)}
                  </Text>
                ) : null}
              </View>
            </View>
            <Button
              variant="ghost"
              size="small"
              icon={shown ? 'eyeOff' : 'eye'}
              label={shown ? 'Ocultar' : 'Mostrar'}
              accessibilityLabel={shown ? 'Ocultar el nombre' : 'Mostrar el nombre'}
              onPress={() => setShown((s) => !s)}
              testID="friend-show"
            />
          </View>
        </Card>
      )}
      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { key: 'lista', label: `Su lista (${a.wishlist.length})`, testID: 'friend-tab-list' },
          { key: 'chat', label: 'Chat secreto', testID: 'friend-tab-chat' },
        ]}
      />
      {tab === 'lista' ? (
        a.wishlist.length === 0 ? (
          <EmptyState
            icon="wishlist"
            title="Su lista está vacía"
            body="Todavía no ha escrito su lista. Pregúntale en secreto qué le gustaría."
            primary={{ label: 'Preguntarle', icon: 'chat', onPress: () => setTab('chat') }}
            testID="friend-list-empty"
          />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={{ gap: theme.space.sm, paddingBottom: theme.space.lg }}
            testID="friend-list"
          >
            {a.wishlist.map((w, i) => (
              <WishCard key={w.id} wish={w} testID={`friend-wish-${i}`} />
            ))}
          </ScrollView>
        )
      ) : (
        <ChatView
          groupId={a.groupId}
          side="giver"
          counterpartName={shown ? first : undefined}
          readOnlyNote={readOnly}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
});
