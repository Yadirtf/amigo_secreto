import { EmptyState, Screen } from '@entre-nos/ui';
import { router } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <Screen testID="not-found" scroll={false}>
      <EmptyState
        icon="info"
        title="Esta página no existe"
        body="Puede que el enlace esté incompleto. Te llevamos a tus grupos."
        primary={{ label: 'Ir a Mis grupos', onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
