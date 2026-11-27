import type { Wish } from '@entre-nos/contracts';
import { Card, Icon, IconButton, Text, useTheme } from '@entre-nos/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { domainOf, isSafeHttpsUrl } from '../lib/links';
import { openExternal } from '../lib/share';

export interface WishCardProps {
  wish: Wish;
  /** Shows a ⋮ button (own list). */
  onMore?: () => void;
  testID?: string;
}

/** One idea: text, size and the link's domain (opens in the external browser). */
export function WishCard({ wish, onMore, testID }: WishCardProps) {
  const theme = useTheme();
  const link = isSafeHttpsUrl(wish.link) ? wish.link : null;
  return (
    <Card testID={testID}>
      <View style={[styles.row, { gap: theme.space.sm }]}>
        <View style={[styles.flex, { gap: theme.space.xs }]}>
          <Text variant="title3">{wish.text}</Text>
          {wish.size || link ? (
            <View style={[styles.meta, { gap: theme.space.md }]}>
              {wish.size ? (
                <View style={[styles.row, { gap: theme.space.xs }]}>
                  <Icon name="size" size={16} color="textSecondary" />
                  <Text variant="caption" color="textSecondary">{`Talla ${wish.size}`}</Text>
                </View>
              ) : null}
              {link ? (
                <Pressable
                  onPress={() => void openExternal(link)}
                  accessibilityRole="link"
                  accessibilityLabel={`Abrir enlace en ${domainOf(link)}`}
                  hitSlop={12}
                  style={[styles.row, { gap: theme.space.xs }]}
                >
                  <Icon name="link" size={16} color="primaryText" />
                  <Text variant="caption" color="primaryText">
                    {domainOf(link)}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        {onMore ? (
          <IconButton
            icon="more"
            accessibilityLabel={`Opciones de ${wish.text}`}
            onPress={onMore}
            testID={testID ? `${testID}-more` : undefined}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
