import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Modal, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Button, type ButtonVariant } from './Button';
import { Text, type TextRef } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  /** Exact verb ("Sortear de nuevo"), never "Sí/Aceptar". */
  confirmLabel: string;
  confirmLoadingLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** destructive (default), primary/secondary for irreversible but not destructive. */
  confirmVariant?: ButtonVariant;
  loading?: boolean;
  /** Called when the dialog opens (the app plays the warning haptic). */
  onShow?: () => void;
  testID?: string;
}

/** Style guide §8.10 confirmation dialog: stacked full-width buttons. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  confirmLoadingLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  confirmVariant = 'destructive',
  loading,
  onShow,
  testID,
}: ConfirmDialogProps) {
  const theme = useTheme();
  const titleRef = useRef<TextRef>(null);
  useEffect(() => {
    if (!visible) return;
    onShow?.();
    const t = setTimeout(() => {
      if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
    }, 250);
    return () => clearTimeout(t);
    // onShow is intentionally excluded: only fire when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={loading ? () => undefined : onCancel}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.color.overlay }]}>
        <View
          testID={testID}
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: theme.color.surface,
              borderRadius: theme.radius.xl,
              padding: theme.space.xxl,
              gap: theme.space.md,
              ...theme.shadow.lg,
            },
          ]}
        >
          <Text ref={titleRef} variant="title2">
            {title}
          </Text>
          <Text variant="body" color="textSecondary">
            {message}
          </Text>
          <View style={{ gap: theme.space.sm, marginTop: theme.space.md }}>
            <Button
              testID={testID ? `${testID}-confirm` : undefined}
              variant={confirmVariant}
              label={confirmLabel}
              loadingLabel={confirmLoadingLabel}
              loading={loading}
              onPress={onConfirm}
              fullWidth
            />
            <Button
              testID={testID ? `${testID}-cancel` : undefined}
              variant="outline"
              label={cancelLabel}
              onPress={onCancel}
              disabled={loading}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420 },
});
