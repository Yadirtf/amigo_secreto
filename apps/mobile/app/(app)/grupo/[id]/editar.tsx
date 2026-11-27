import { useToast } from '@entre-nos/ui';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { GroupForm } from '../../../../src/components/GroupForm';
import { goBack, LoadError, LoadingScreen } from '../../../../src/components/states';
import { useGroup, useUpdateGroup } from '../../../../src/features/groups/hooks';
import { errorMessage } from '../../../../src/lib/errors';
import { haptics } from '../../../../src/lib/haptics';
import { Screen } from '@entre-nos/ui';

/** "Editar grupo": same form as S3, data loaded. */
export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data: g, error, refetch } = useGroup(id);
  const update = useUpdateGroup(id);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!g) {
    return error ? (
      <Screen topBar={{ title: 'Editar grupo', onBack: goBack }}>
        <LoadError error={error} onRetry={() => void refetch()} />
      </Screen>
    ) : (
      <LoadingScreen title="Editar grupo" onBack={goBack} />
    );
  }

  return (
    <GroupForm
      mode="edit"
      initial={{
        name: g.name,
        deliveryDate: g.deliveryDate,
        budgetCop: g.budgetCop ?? undefined,
        photo: g.photo,
      }}
      minDate={g.status === 'open' ? undefined : g.deliveryDate}
      submitting={update.isPending}
      submitError={submitError}
      onBack={goBack}
      onSubmit={(v) => {
        setSubmitError(null);
        update.mutate(
          {
            ...(v.name !== g.name ? { name: v.name } : {}),
            ...(v.deliveryDate !== g.deliveryDate ? { deliveryDate: v.deliveryDate } : {}),
            ...(v.budgetCop !== g.budgetCop ? { budgetCop: v.budgetCop } : {}),
            ...(v.photo !== g.photo ? { photo: v.photo } : {}),
          },
          {
            onSuccess: () => {
              haptics.success();
              toast.show('Cambios guardados');
              goBack();
            },
            onError: (e) => {
              haptics.error();
              setSubmitError(errorMessage(e, 'saveGroup'));
            },
          },
        );
      }}
    />
  );
}
