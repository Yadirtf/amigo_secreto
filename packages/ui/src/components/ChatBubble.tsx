import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type BubbleStatus = 'sent' | 'sending' | 'failed' | 'reported';

export interface ChatBubbleProps {
  text: string;
  mine: boolean;
  time: string;
  status?: BubbleStatus;
  /** Tap: retry a failed message. */
  onPress?: () => void;
  /** Long press on a received message: copy / report. */
  onLongPress?: () => void;
  /** Who wrote it, for TalkBack ("Tú", "Tu amigo secreto"). */
  authorLabel: string;
  testID?: string;
}

/** Style guide §8.12 ChatBubble. Own vs received differ by side AND color. */
export function ChatBubble({
  text,
  mine,
  time,
  status = 'sent',
  onPress,
  onLongPress,
  authorLabel,
  testID,
}: ChatBubbleProps) {
  const theme = useTheme();
  const reported = status === 'reported';
  const failed = status === 'failed';
  const statusText =
    status === 'sending'
      ? 'Enviando'
      : failed
        ? 'No se envió. Toca para reintentar.'
        : reported
          ? 'Reportaste este mensaje'
          : '';
  const a11y = `${authorLabel}: ${reported ? 'Reportaste este mensaje' : text}. ${time}${
    statusText && !reported ? `. ${statusText}` : ''
  }`;
  return (
    <View style={[styles.row, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={!onPress && !onLongPress}
        accessibilityRole={onPress || onLongPress ? 'button' : 'text'}
        accessibilityLabel={a11y}
        accessibilityHint={
          failed
            ? 'Toca para reintentar'
            : onLongPress
              ? 'Mantén presionado para más opciones'
              : undefined
        }
        style={[
          styles.bubble,
          {
            backgroundColor: mine ? theme.color.primary : theme.color.surfaceAlt,
            borderRadius: theme.radius.lg,
            borderBottomRightRadius: mine ? theme.radius.xs : theme.radius.lg,
            borderBottomLeftRadius: mine ? theme.radius.lg : theme.radius.xs,
            opacity: status === 'sending' ? 0.7 : 1,
          },
        ]}
      >
        {reported ? (
          <Text variant="body" color="textSecondary" italic>
            Reportaste este mensaje
          </Text>
        ) : (
          <Text variant="body" color={mine ? 'textOnPrimary' : 'textPrimary'}>
            {text}
          </Text>
        )}
        <View style={styles.meta}>
          {status === 'sending' ? (
            <Icon name="clock" size={14} color={mine ? 'textOnPrimary' : 'textSecondary'} />
          ) : null}
          <Text variant="caption" color={mine ? 'textOnPrimary' : 'textSecondary'}>
            {time}
          </Text>
        </View>
      </Pressable>
      {failed ? (
        <View style={styles.failed}>
          <Icon name="error" size={16} color="danger" />
          <Text variant="caption" color="danger">
            No se envió. Toca para reintentar.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%' },
  bubble: { maxWidth: '80%', paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  failed: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
