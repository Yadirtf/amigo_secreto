import { StyleSheet, View } from 'react-native';
import type { IconName } from '../icons';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
  testID?: string;
  icon?: IconName;
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  body: string;
  primary?: EmptyStateAction;
  secondary?: EmptyStateAction;
  /** Error variant: icon in a neutral circle. */
  tone?: 'default' | 'error';
  testID?: string;
}

/** Style guide §8.7. No screen is ever blank. */
export function EmptyState({
  icon = 'gift',
  title,
  body,
  primary,
  secondary,
  tone = 'default',
  testID,
}: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View testID={testID} style={[styles.wrap, { paddingVertical: theme.space.xxxl }]}>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: tone === 'error' ? theme.color.surfaceAlt : theme.color.primarySoft,
            borderRadius: theme.radius.full,
          },
        ]}
      >
        <Icon
          name={icon}
          size={theme.size.iconLg}
          color={tone === 'error' ? 'textSecondary' : 'textOnPrimarySoft'}
        />
      </View>
      <Text variant="title2" align="center">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {body}
      </Text>
      {primary ? (
        <Button
          label={primary.label}
          onPress={primary.onPress}
          testID={primary.testID}
          icon={primary.icon}
          fullWidth
          style={{ marginTop: theme.space.lg }}
        />
      ) : null}
      {secondary ? (
        <Button
          variant="ghost"
          label={secondary.label}
          onPress={secondary.onPress}
          testID={secondary.testID}
          icon={secondary.icon}
          fullWidth
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', alignItems: 'center', maxWidth: 320, width: '100%', gap: 12 },
  circle: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
});
