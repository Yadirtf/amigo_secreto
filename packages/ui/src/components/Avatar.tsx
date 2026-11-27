import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { avatarBackground, initials } from '../logic';
import { useTheme } from '../theme';
import { tokens } from '../tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  /** Seed for the deterministic color (user or group id). */
  seed: string;
  photo?: string | null;
  size?: AvatarSize;
  /** Editable avatar (profile/group photo). */
  onPress?: () => void;
  accessibilityLabel?: string;
  loading?: boolean;
  testID?: string;
  /** Square-ish (group cover) instead of a circle. */
  rounded?: boolean;
}

function px(size: AvatarSize, s: ReturnType<typeof useTheme>['size']): number {
  return size === 'sm'
    ? s.avatarSm
    : size === 'md'
      ? s.avatarMd
      : size === 'lg'
        ? s.avatarLg
        : s.avatarXl;
}

/** Style guide §8.5: photo or initials over a color derived from the id. */
export function Avatar({
  name,
  seed,
  photo,
  size = 'md',
  onPress,
  accessibilityLabel,
  loading,
  testID,
  rounded,
}: AvatarProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const d = px(size, theme.size);
  const radius = rounded ? theme.radius.sm : d / 2;
  const showPhoto = !!photo && !failed;
  const body = loading ? (
    <View
      style={[
        styles.center,
        { width: d, height: d, borderRadius: radius, backgroundColor: theme.color.skeleton },
      ]}
    >
      <ActivityIndicator color={theme.color.textSecondary} />
    </View>
  ) : showPhoto ? (
    <Image
      source={{ uri: photo }}
      onError={() => setFailed(true)}
      resizeMode="cover"
      style={{ width: d, height: d, borderRadius: radius }}
      accessible={false}
    />
  ) : (
    <View
      style={[
        styles.center,
        {
          width: d,
          height: d,
          borderRadius: radius,
          backgroundColor: avatarBackground(seed, theme.scheme),
        },
      ]}
    >
      <Text
        variant="button"
        maxFontSizeMultiplier={1}
        style={{ fontSize: Math.round(d * 0.4), lineHeight: Math.round(d * 0.5) }}
      >
        {initials(name)}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessible={false} importantForAccessibility="no-hide-descendants">
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? 'Cambiar foto'}
      accessibilityState={{ busy: !!loading }}
      hitSlop={d < 48 ? (48 - d) / 2 : 0}
    >
      {({ pressed }) => (
        <View>
          {body}
          {pressed ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.center,
                { borderRadius: radius, backgroundColor: theme.color.overlay },
              ]}
            >
              <Icon name="camera" rawColor={tokens.color.light.surface} />
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

/** The anonymous secret friend: never initials, always the gift. */
export function AnonymousAvatar({ size = 'md' }: { size?: AvatarSize }) {
  const theme = useTheme();
  const d = px(size, theme.size);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.center,
        { width: d, height: d, borderRadius: d / 2, backgroundColor: theme.color.secondarySoft },
      ]}
    >
      <Icon name="gift" size={Math.round(d * 0.5)} color="textOnSecondarySoft" />
    </View>
  );
}

export interface AvatarStackProps {
  people: { id: string; name: string; photo: string | null }[];
  max?: number;
}

export function AvatarStack({ people, max = 5 }: AvatarStackProps) {
  const theme = useTheme();
  const shown = people.slice(0, max);
  return (
    <View style={styles.stack} accessible={false} importantForAccessibility="no-hide-descendants">
      {shown.map((p, i) => (
        <View
          key={p.id}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            borderWidth: 2,
            borderColor: theme.color.surface,
            borderRadius: theme.radius.full,
          }}
        >
          <Avatar name={p.name} seed={p.id} photo={p.photo} size="sm" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stack: { flexDirection: 'row', alignItems: 'center' },
});
