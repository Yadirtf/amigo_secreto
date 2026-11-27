import { useState, type ReactElement, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface TopBarProps {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  backIcon?: 'back' | 'close';
  right?: ReactNode;
  /** Shows the bottom border (content scrolled under it). */
  elevated?: boolean;
  large?: boolean;
}

/** Style guide §8.12 TopBar: 56 high, title left, back 48. */
export function TopBar({
  title,
  onBack,
  backLabel = 'Volver',
  backIcon = 'back',
  right,
  elevated,
  large,
}: TopBarProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.topBar,
        {
          minHeight: 56,
          paddingHorizontal: onBack ? theme.space.xs : theme.space.gutter,
          borderBottomWidth: elevated ? 1 : 0,
          borderBottomColor: theme.color.border,
        },
      ]}
    >
      {onBack ? (
        <IconButton
          icon={backIcon}
          accessibilityLabel={backLabel}
          onPress={onBack}
          testID="topbar-back"
        />
      ) : null}
      {title ? (
        <Text
          variant={large ? 'title1' : title.length > 24 ? 'title3' : 'title2'}
          numberOfLines={2}
          style={styles.title}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

export interface ScreenProps {
  children: ReactNode;
  topBar?: TopBarProps;
  /** Fixed bottom area (thumb zone) with the main action. */
  footer?: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
  /** Rendered above the content, outside the scroll (offline banner…). */
  header?: ReactNode;
  testID?: string;
  /** Background color override (reveal screen uses the dark palette via ThemeProvider). */
  padded?: boolean;
}

/**
 * Screen container: safe areas, optional scroll, keyboard avoiding, a fixed
 * footer that stays above the keyboard, and max content width on tablets.
 */
export function Screen({
  children,
  topBar,
  footer,
  scroll = true,
  refreshControl,
  contentStyle,
  header,
  testID,
  padded = true,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [viewportH, setViewportH] = useState(0);

  const inner: ViewStyle = {
    paddingHorizontal: padded ? theme.space.gutter : 0,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.xxl,
    gap: theme.space.lg,
    width: '100%',
    maxWidth: theme.size.maxContentWidth,
    alignSelf: 'center',
  };

  return (
    <View
      testID={testID}
      style={[styles.flex, { backgroundColor: theme.color.background, paddingTop: insets.top }]}
    >
      {topBar ? <TopBar {...topBar} elevated={scrolled} /> : null}
      {header ? (
        <View style={{ paddingHorizontal: theme.space.gutter, paddingBottom: theme.space.sm }}>
          {header}
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_, h) => setOverflow(h > viewportH + 1)}
            onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)}
            scrollEventThrottle={64}
            contentContainerStyle={[styles.grow, inner, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, inner, contentStyle]}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              paddingHorizontal: theme.space.gutter,
              paddingTop: theme.space.md,
              paddingBottom: Math.max(insets.bottom, theme.space.lg),
              backgroundColor: theme.color.background,
              borderTopWidth: overflow ? 1 : 0,
              borderTopColor: theme.color.border,
              gap: theme.space.sm,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: theme.size.maxContentWidth,
                alignSelf: 'center',
                gap: theme.space.sm,
              }}
            >
              {footer}
            </View>
          </View>
        ) : (
          <View style={{ height: insets.bottom }} />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Overline section header ("MIEMBROS (5)") with an optional right action. */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text
        variant="overline"
        color="textSecondary"
        accessibilityRole="header"
        style={styles.title}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
});
