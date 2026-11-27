import { IconButton, Screen } from '@entre-nos/ui';
import { useLocalSearchParams } from 'expo-router';
import { useChatMenu } from '../../../../src/components/ChatMenus';
import { ChatView } from '../../../../src/components/ChatView';
import { goBack, OfflineBanner } from '../../../../src/components/states';
import { purgeDate } from '../../../../src/features/groups/draw';
import { useGroup } from '../../../../src/features/groups/hooks';
import { formatDayWithYear } from '../../../../src/lib/format';

/** S10b chat 2 — "Mensajes de quien te regala" (the giver is anonymous). */
export default function ReceiverChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: g } = useGroup(id);
  const menu = useChatMenu(id, 'receiver', g?.name ?? 'este grupo');
  const readOnly =
    g?.status === 'revealed'
      ? `La revelación ya pasó. Los mensajes se borran el ${formatDayWithYear(purgeDate(g))}.`
      : null;
  return (
    <Screen
      testID="receiver-chat-screen"
      scroll={false}
      topBar={{
        title: 'Quien te regala',
        onBack: goBack,
        right: (
          <IconButton
            icon="more"
            accessibilityLabel="Opciones del chat"
            onPress={menu.open}
            testID="chat-more"
          />
        ),
      }}
    >
      <OfflineBanner />
      <ChatView groupId={id} side="receiver" readOnlyNote={readOnly} onBlockRequest={menu.askBlock} />
      {menu.element}
    </Screen>
  );
}
