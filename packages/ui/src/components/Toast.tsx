import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '../icons';
import { useTheme } from '../theme';
import { tokens } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ToastOptions {
  message: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
  kind?: 'default' | 'error';
}

interface ToastState extends ToastOptions {
  id: number;
}

interface ToastApi {
  show: (options: ToastOptions | string) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined, hide: () => undefined });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

/**
 * One toast at a time (the new one replaces the previous), above the bottom
 * bar, announced to TalkBack (§8.9).
 */
export function ToastProvider({
  children,
  bottomOffset = 88,
}: {
  children: ReactNode;
  bottomOffset?: number;
}) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((options: ToastOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    counter.current += 1;
    setToast({ ...opts, id: counter.current });
    AccessibilityInfo.announceForAccessibility(opts.message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setToast(null),
      opts.action ? tokens.duration.toastWithAction : tokens.duration.toast,
    );
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const api = useMemo(() => ({ show, hide }), [show, hide]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <ToastView key={toast.id} toast={toast} onHide={hide} bottomOffset={bottomOffset} />
      ) : null}
    </ToastContext.Provider>
  );
}

function ToastView({
  toast,
  onHide,
  bottomOffset,
}: {
  toast: ToastState;
  onHide: () => void;
  bottomOffset: number;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const dark = theme.scheme === 'dark';
  const bg = dark ? theme.color.surfaceAlt : theme.color.textPrimary;
  const fg = dark ? theme.color.textPrimary : theme.color.surface;
  // Light toast action uses #FFC9C0 (9:1 on #2B1E1A), the dark textOnPrimarySoft token.
  const actionColor = dark ? theme.color.accent : tokens.color.dark.textOnPrimarySoft;
  const iconName: IconName | undefined =
    toast.icon ?? (toast.kind === 'error' ? 'error' : undefined);
  return (
    <Animated.View
      entering={
        reduced ? FadeIn.duration(theme.duration.fast) : SlideInDown.duration(theme.duration.normal)
      }
      exiting={FadeOut.duration(theme.duration.fast)}
      pointerEvents="box-none"
      style={[
        styles.host,
        { bottom: Math.max(insets.bottom, 16) + bottomOffset, zIndex: theme.zIndex.toast },
      ]}
    >
      <Pressable
        testID="toast"
        onPress={onHide}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={toast.message}
        accessibilityHint="Toca para cerrar"
        style={[
          styles.toast,
          { backgroundColor: bg, borderRadius: theme.radius.md, ...theme.shadow.lg },
        ]}
      >
        {iconName ? <Icon name={iconName} size={20} rawColor={fg} /> : null}
        <Text variant="label" style={[styles.flex, { color: fg }]}>
          {toast.message}
        </Text>
        {toast.action ? (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              onHide();
            }}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            hitSlop={12}
            style={styles.action}
          >
            <Text variant="button" style={{ color: actionColor }}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  flex: { flex: 1 },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
});
