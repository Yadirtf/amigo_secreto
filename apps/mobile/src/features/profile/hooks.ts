import type { Me } from '@entre-nos/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { qk } from '../../query/keys';
import { useSession } from '../../state/session';

export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; photo?: string | null }) => api.me.update(body),
    networkMode: 'online',
    onSuccess: async (me: Me) => {
      client.setQueryData(qk.me, me);
      await useSession.getState().setUser(me);
      // Member lists show my name/photo: refresh them in the background.
      void client.invalidateQueries({ queryKey: ['group'] });
    },
  });
}
