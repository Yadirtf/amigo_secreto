import { StyleSheet, View } from 'react-native';
import type { IconName } from '../icons';
import { useTheme } from '../theme';
import type { ColorName } from '../tokens';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export type BannerKind = 'info' | 'privacy' | 'warning' | 'error' | 'special' | 'success';

const KINDS: Record<
  BannerKind,
  { bg: ColorName; fg: ColorName; icon: IconName; iconColor: ColorName }
> = {
  info: { bg: 'surfaceAlt', fg: 'textPrimary', icon: 'info', iconColor: 'textPrimary' },
  privacy: {
    bg: 'secondarySoft',
    fg: 'textOnSecondarySoft',
    icon: 'lock',
    iconColor: 'textOnSecondarySoft',
  },
  warning: { bg: 'surfaceAlt', fg: 'textPrimary', icon: 'warning', iconColor: 'warning' },
  error: { bg: 'dangerSoft', fg: 'textPrimary', icon: 'error', iconColor: 'danger' },
  special: { bg: 'accent', fg: 'textOnAccent', icon: 'gift', iconColor: 'textOnAccent' },
  success: {
    bg: 'secondarySoft',
    fg: 'textOnSecondarySoft',
    icon: 'success',
    iconColor: 'textOnSecondarySoft',
  },
};

export interface BannerProps {
  kind?: BannerKind;
  message: string;
  title?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void; testID?: string; loading?: boolean };
  testID?: string;
}

/** Persistent in-screen information (§8.9). Always icon + text. */
export function Banner({ kind = 'info', message, title, icon, action, testID }: BannerProps) {
  const theme = useTheme();
  const k = KINDS[kind];
  return (
    <View
      testID={testID}
      accessibilityLiveRegion={kind === 'error' ? 'polite' : 'none'}
      style={[
        styles.wrap,
        {
          backgroundColor: theme.color[k.bg],
          borderRadius: theme.radius.md,
          paddingVertical: theme.space.md,
          paddingHorizontal: theme.space.lg,
          gap: theme.space.md,
        },
      ]}
    >
      <View style={styles.row}>
        <Icon name={icon ?? k.icon} size={20} color={k.iconColor} />
        <View style={styles.flex}>
          {title ? (
            <Text variant="label" color={k.fg}>
              {title}
            </Text>
          ) : null}
          <Text variant={title ? 'caption' : 'label'} color={k.fg}>
            {message}
          </Text>
        </View>
      </View>
      {action ? (
        <View style={styles.action}>
          <Button
            variant={kind === 'special' ? 'outline' : 'ghost'}
            size="small"
            label={action.label}
            onPress={action.onPress}
            loading={action.loading}
            testID={action.testID}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
  action: { alignItems: 'flex-end' },
});
