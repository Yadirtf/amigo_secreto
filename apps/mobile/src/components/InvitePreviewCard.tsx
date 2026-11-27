import type { InvitePreview } from '@entre-nos/contracts';
import { Avatar, Card, Text, useTheme } from '@entre-nos/ui';
import { StyleSheet, View } from 'react-native';
import { formatDayShort } from '../lib/format';

export function InvitePreviewCard({ preview }: { preview: InvitePreview }) {
  const theme = useTheme();
  const people = `${preview.memberCount} ${preview.memberCount === 1 ? 'persona' : 'personas'}`;
  return (
    <Card
      testID="invite-preview"
      accessibilityLabel={`${preview.name}. Organiza ${preview.organizerName}. ${people}. Entrega ${formatDayShort(preview.deliveryDate)}`}
    >
      <View style={[styles.row, { gap: theme.space.md }]} accessible>
        <Avatar
          name={preview.name}
          seed={preview.groupId ?? preview.name}
          photo={preview.photo}
          size="lg"
          rounded
        />
        <View style={styles.flex}>
          <Text variant="title3">{preview.name}</Text>
          <Text variant="caption" color="textSecondary">
            {`Organiza: ${preview.organizerName} · ${people}`}
          </Text>
          <Text variant="caption" color="textSecondary">
            {`Entrega ${formatDayShort(preview.deliveryDate)}`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
});
