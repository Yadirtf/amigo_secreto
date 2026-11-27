import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../theme';
import { IconButton } from './IconButton';
import { Text, type TextRef } from './Text';
import { ToastOutlet } from './Toast';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Main action, pinned at the bottom of the sheet. */
  footer?: ReactNode;
  /** While saving, the sheet can't be dismissed by dragging or tapping outside. */
  busy?: boolean;
  /** Called instead of onClose when the user tries to dismiss with unsaved changes. */
  onRequestDismiss?: () => void;
  testID?: string;
}

/**
 * Style guide §8.10: surface, top corners xl, handle, title + close (48),
 * keyboard-aware, Android back closes it, max 90 % of the screen.
 * Implemented with Modal + Reanimated + Gesture Handler (drag the handle down).
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  busy,
  onRequestDismiss,
  testID,
}: BottomSheetProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const translateY = useSharedValue(height);
  const backdrop = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);
  const titleRef = useRef<TextRef>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = reduced
        ? withTiming(0, { duration: theme.duration.fast })
        : withSpring(0, theme.spring.gentle);
      backdrop.value = withTiming(1, { duration: theme.duration.normal });
      const t = setTimeout(() => {
        if (titleRef.current) AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
      }, 350);
      return () => clearTimeout(t);
    }
    translateY.value = withTiming(height, {
      duration: theme.duration.normal,
      easing: Easing.bezier(...theme.easing.accelerate),
    });
    backdrop.value = withTiming(0, { duration: theme.duration.normal });
    const t = setTimeout(() => setMounted(false), theme.duration.normal);
    return () => clearTimeout(t);
  }, [visible, height, reduced, translateY, backdrop, theme]);

  const dismiss = () => {
    if (busy) return;
    if (onRequestDismiss) onRequestDismiss();
    else onClose();
  };

  const pan = usePanGesture({
    runOnJS: true,
    enabled: !busy,
    onUpdate: (e) => {
      translateY.value = Math.max(0, e.translationY);
    },
    onDeactivate: (e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        dismiss();
        translateY.value = withSpring(0, theme.spring.gentle);
      } else {
        translateY.value = withSpring(0, theme.spring.gentle);
      }
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}
    >
      <ThemeProvider scheme={theme.scheme}>
        <GestureHandlerRootView style={styles.flex}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.flex}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.color.overlay },
                backdropStyle,
              ]}
            >
              <Pressable
                style={styles.flex}
                onPress={dismiss}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              />
            </Animated.View>
            <View style={styles.end} pointerEvents="box-none">
              <Animated.View
                testID={testID}
                accessibilityViewIsModal
                style={[
                  styles.sheet,
                  {
                    maxHeight: height * 0.9,
                    backgroundColor: theme.color.surface,
                    borderTopLeftRadius: theme.radius.xl,
                    borderTopRightRadius: theme.radius.xl,
                    paddingBottom: Math.max(insets.bottom, theme.space.lg),
                    ...theme.shadow.lg,
                  },
                  sheetStyle,
                ]}
              >
                <GestureDetector gesture={pan}>
                  <View style={styles.handleArea}>
                    <View
                      style={{
                        width: theme.size.bottomSheetHandle.width,
                        height: theme.size.bottomSheetHandle.height,
                        borderRadius: 2,
                        backgroundColor: theme.color.borderStrong,
                      }}
                    />
                  </View>
                </GestureDetector>
                <View style={[styles.header, { paddingLeft: theme.space.gutter }]}>
                  <Text ref={titleRef} variant="title2" style={styles.flexShrink}>
                    {title}
                  </Text>
                  <IconButton
                    icon="close"
                    accessibilityLabel="Cerrar"
                    onPress={dismiss}
                    disabled={busy}
                    testID={testID ? `${testID}-close` : undefined}
                  />
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{
                    paddingHorizontal: theme.space.gutter,
                    paddingBottom: theme.space.lg,
                    gap: theme.space.lg,
                  }}
                >
                  {children}
                </ScrollView>
                {footer ? (
                  <View
                    style={{
                      paddingHorizontal: theme.space.gutter,
                      paddingTop: theme.space.md,
                      gap: theme.space.sm,
                    }}
                  >
                    {footer}
                  </View>
                ) : null}
              </Animated.View>
            </View>
          </KeyboardAvoidingView>
          <ToastOutlet />
        </GestureHandlerRootView>
      </ThemeProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flex: 1 },
  end: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', alignSelf: 'center', maxWidth: 640 },
  handleArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 8, minHeight: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 8, gap: 8 },
});
