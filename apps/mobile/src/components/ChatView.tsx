import type { ChatMessage } from '@entre-nos/contracts';
import {
  Banner,
  BottomSheet,
  Button,
  ChatBubble,
  CheckRow,
  EmptyState,
  IconButton,
  ListRow,
  SkeletonCard,
  SkeletonGroup,
  Text,
  TextField,
  useTheme,
  useToast,
  type BubbleStatus,
} from '@entre-nos/ui';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { ChatSideName } from '../api/endpoints';
import {
  useBlockChat,
  useChatThread,
  useOlderMessages,
  useReportMessage,
  useSendMessage,
} from '../features/chat/hooks';
import { errorMessage } from '../lib/errors';
import { formatTime } from '../lib/format';
import { haptics } from '../lib/haptics';
import { copyText } from '../lib/share';
import { usePrefs } from '../state/prefs';
import { LoadError } from './states';

const MAX_LEN = 500;
const COUNTER_FROM = 400;

const REPORT_REASONS = [
  'Es ofensivo o me hace sentir mal',
  'Es acoso',
  'Revela información privada',
  'Otro motivo',
] as const;

export interface ChatViewProps {
  groupId: string;
  /** My role in this thread: giver = I write anonymously to my recipient. */
  side: ChatSideName;
  /** Recipient's name (giver side only), for the privacy banner. */
  counterpartName?: string;
  /** When set, the chat is read-only and shows this note instead of the composer. */
  readOnlyNote?: string | null;
  /** Ask "¿Quieres bloquear también este chat?" after a report (receiver side). */
  onBlockRequest?: () => void;
}

interface Row {
  key: string;
  text: string;
  mine: boolean;
  time: string;
  status: BubbleStatus;
  messageId: string | null;
  tempId: string | null;
}

/** Shared secret chat (S10b): both threads, polling while focused. */
export function ChatView({
  groupId,
  side,
  counterpartName,
  readOnlyNote,
  onBlockRequest,
}: ChatViewProps) {
  const theme = useTheme();
  const toast = useToast();
  const thread = useChatThread(groupId, side);
  const older = useOlderMessages(groupId, side);
  const { outbox, send, retry } = useSendMessage(groupId, side);
  const block = useBlockChat(groupId);
  const report = useReportMessage(groupId, side);
  const reported = usePrefs((s) => s.reported[groupId]);
  const hintShown = usePrefs((s) => s.chatHintShown);
  const markHint = usePrefs((s) => s.markChatHintShown);
  const markReported = usePrefs((s) => s.markReported);
  const [draft, setDraft] = useState('');
  const [actionsFor, setActionsFor] = useState<ChatMessage | null>(null);
  const [reportFor, setReportFor] = useState<ChatMessage | null>(null);

  const rows = useMemo<Row[]>(() => {
    const seen = new Set<string>();
    const all: ChatMessage[] = [];
    for (const m of [...older.older, ...(thread.data?.messages ?? [])]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      all.push(m);
    }
    const reportedIds = new Set(reported ?? []);
    const sent: Row[] = all.map((m) => ({
      key: m.id,
      text: m.text,
      mine: m.mine,
      time: formatTime(m.createdAt),
      status: reportedIds.has(m.id) ? 'reported' : 'sent',
      messageId: m.id,
      tempId: null,
    }));
    const pending: Row[] = outbox.map((o) => ({
      key: o.tempId,
      text: o.text,
      mine: true,
      time: formatTime(o.createdAt),
      status: o.status,
      messageId: null,
      tempId: o.tempId,
    }));
    // Inverted list: newest first.
    return [...sent, ...pending].reverse();
  }, [older.older, thread.data?.messages, outbox, reported]);

  const messageById = (id: string | null) =>
    [...older.older, ...(thread.data?.messages ?? [])].find((m) => m.id === id) ?? null;

  if (!thread.data) {
    return thread.error ? (
      <LoadError error={thread.error} onRetry={() => void thread.refetch()} />
    ) : (
      <SkeletonGroup testID="chat-loading">
        <SkeletonCard />
      </SkeletonGroup>
    );
  }

  const t = thread.data;
  const giver = side === 'giver';
  const myLabel = giver ? 'Tú (en secreto)' : 'Tú';
  const otherLabel = giver ? (counterpartName ?? 'Tu amigo secreto') : 'Quien te regala';
  const hasMore = older.hasMore ?? t.hasMore;
  const oldest = older.older[0]?.createdAt ?? t.messages[0]?.createdAt;
  const tooLong = draft.length >= MAX_LEN;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (giver && !hintShown) markHint();
    void send(text).then((ok) => {
      if (!ok) haptics.error();
    });
  };

  const submitReport = (reason: string) => {
    const target = reportFor;
    report.mutate(
      { messageId: target?.id ?? null, reason },
      {
        onSuccess: () => {
          if (target) markReported(groupId, target.id);
          setReportFor(null);
          toast.show('Gracias por avisar. Vamos a revisar el mensaje.');
          if (!giver && !t.blocked) onBlockRequest?.();
        },
        onError: (e) => toast.show({ message: errorMessage(e), kind: 'error' }),
      },
    );
  };

  let composer: React.ReactNode;
  if (readOnlyNote) {
    composer = (
      <Text variant="caption" color="textSecondary" align="center" testID="chat-readonly">
        {readOnlyNote}
      </Text>
    );
  } else if (t.blocked) {
    composer = giver ? (
      <Text variant="caption" color="textSecondary" align="center" testID="chat-paused">
        Este chat está pausado, así que no se pueden enviar mensajes.
      </Text>
    ) : (
      <View style={[styles.blockedRow, { gap: theme.space.sm }]} testID="chat-blocked">
        <Text variant="body" color="textSecondary" style={styles.flex}>
          Bloqueaste este chat.
        </Text>
        <Button
          variant="ghost"
          size="small"
          label="Desbloquear"
          loading={block.isPending}
          onPress={() =>
            block.mutate(false, {
              onError: (e) => toast.show({ message: errorMessage(e), kind: 'error' }),
            })
          }
          testID="chat-unblock"
        />
      </View>
    );
  } else {
    composer = (
      <View style={{ gap: theme.space.xs }}>
        <View style={[styles.composer, { gap: theme.space.sm }]}>
          <TextField
            label={giver ? 'Tu pregunta' : 'Tu respuesta'}
            variant="multiline"
            placeholder={giver ? 'Escribe tu pregunta…' : 'Escribe tu respuesta…'}
            value={draft}
            onChangeText={setDraft}
            maxLength={MAX_LEN}
            counterFrom={COUNTER_FROM}
            error={tooLong ? 'Máximo 500 caracteres.' : null}
            containerStyle={styles.flex}
            testID="chat-input"
          />
          <IconButton
            icon="send"
            accessibilityLabel="Enviar mensaje"
            onPress={submit}
            disabled={draft.trim() === ''}
            color="primaryText"
            testID="chat-send"
          />
        </View>
        {giver && !hintShown ? (
          <Text variant="caption" color="textSecondary">
            Ojo: no firmes con tu nombre.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.flex, { gap: theme.space.sm }]} testID={`chat-${side}`}>
      <Banner
        kind="privacy"
        message={
          giver
            ? `Escribes en secreto: ${counterpartName ?? 'tu amigo secreto'} no sabe que eres tú.`
            : 'Quien te regala te escribe en secreto. Tú no sabes quién es.'
        }
      />
      {rows.length === 0 ? (
        // Rendered outside the inverted list: on Android an inverted list's empty
        // component ends up rotated, whatever counter-transform we apply.
        <View style={styles.flex}>
          <EmptyState
            icon="chat"
            title={giver ? 'Pregúntale algo' : 'Todavía no hay mensajes'}
            body={
              giver
                ? 'Pregúntale algo para atinarle al regalo, por ejemplo: ¿te gusta más el dulce o lo salado?'
                : 'Cuando quien te regala te escriba, lo verás aquí.'
            }
            testID="chat-empty"
          />
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={rows}
          inverted
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: theme.space.sm }}
          renderItem={({ item }) => (
            <ChatBubble
              text={item.text}
              mine={item.mine}
              time={item.time}
              status={item.status}
              authorLabel={item.mine ? myLabel : otherLabel}
              onPress={
                item.status === 'failed' && item.tempId
                  ? () => {
                      const o = outbox.find((x) => x.tempId === item.tempId);
                      if (o) void retry(o);
                    }
                  : undefined
              }
              onLongPress={
                !item.mine && item.status !== 'reported'
                  ? () => setActionsFor(messageById(item.messageId))
                  : undefined
              }
              testID={`bubble-${item.key}`}
            />
          )}
          ListFooterComponent={
            hasMore && oldest ? (
              <Button
                variant="ghost"
                size="small"
                label="Ver mensajes anteriores"
                loading={older.loading}
                onPress={() => void older.load(oldest).catch(() => undefined)}
                testID="chat-older"
              />
            ) : undefined
          }
        />
      )}
      {composer}

      <BottomSheet
        visible={actionsFor !== null}
        onClose={() => setActionsFor(null)}
        title="Mensaje"
        testID="message-actions"
      >
        <ListRow
          icon="copy"
          title="Copiar"
          onPress={() => {
            if (actionsFor) void copyText(actionsFor.text);
            setActionsFor(null);
            toast.show('Mensaje copiado');
          }}
          testID="message-copy"
        />
        <ListRow
          icon="flag"
          title="Reportar mensaje"
          onPress={() => {
            setReportFor(actionsFor);
            setActionsFor(null);
          }}
          testID="message-report"
        />
      </BottomSheet>

      {reportFor ? (
        <ReportSheet
          busy={report.isPending}
          onClose={() => setReportFor(null)}
          onSubmit={submitReport}
        />
      ) : null}
    </View>
  );
}

export function ReportSheet({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [extra, setExtra] = useState('');
  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="¿Por qué lo reportas?"
      busy={busy}
      testID="report-sheet"
      footer={
        <Button
          label="Enviar reporte"
          loading={busy}
          loadingLabel="Enviando…"
          onPress={() => onSubmit([reason, extra.trim()].filter(Boolean).join(': ').slice(0, 200))}
          fullWidth
          testID="report-send"
        />
      }
    >
      {REPORT_REASONS.map((r, i) => (
        <CheckRow
          key={r}
          kind="radio"
          label={r}
          checked={reason === r}
          onToggle={() => {
            haptics.selection();
            setReason(r);
          }}
          testID={`report-reason-${i}`}
        />
      ))}
      <TextField
        label="¿Quieres contarnos algo más? (opcional)"
        variant="multiline"
        value={extra}
        onChangeText={setExtra}
        maxLength={150}
        testID="report-extra"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end' },
  blockedRow: { flexDirection: 'row', alignItems: 'center' },
});
