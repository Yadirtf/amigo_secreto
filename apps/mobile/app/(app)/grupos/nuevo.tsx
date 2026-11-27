import { useToast } from '@entre-nos/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { GroupForm } from '../../../src/components/GroupForm';
import { goBack } from '../../../src/components/states';
import { useCreateGroup } from '../../../src/features/groups/hooks';
import { errorCode, errorMessage } from '../../../src/lib/errors';
import { haptics } from '../../../src/lib/haptics';

/** S3 — Crear grupo. */
export default function NewGroupScreen() {
  const toast = useToast();
  const create = useCreateGroup();
  const [error, setError] = useState<string | null>(null);

  return (
    <GroupForm
      mode="create"
      submitting={create.isPending}
      submitError={error}
      onBack={goBack}
      onSubmit={(v) => {
        setError(null);
        const send = (photo: string | null) =>
          create.mutate(
            {
              name: v.name,
              deliveryDate: v.deliveryDate,
              budgetCop: v.budgetCop,
              photo,
              organizerParticipates: v.organizerParticipates,
            },
            {
              onSuccess: (g) => {
                haptics.success();
                toast.show('¡Listo! Tu grupo está creado.');
                router.replace({ pathname: '/grupo/[id]', params: { id: g.id, invite: '1' } });
              },
              onError: (e) => {
                // The photo is optional: if it was the problem, create without it.
                if (photo && errorCode(e) === 'INVALID_INPUT') {
                  toast.show({ message: 'No pudimos usar esa foto. Prueba con otra.', kind: 'error' });
                  send(null);
                  return;
                }
                haptics.error();
                setError(errorMessage(e, 'createGroup'));
              },
            },
          );
        send(v.photo);
      }}
    />
  );
}
