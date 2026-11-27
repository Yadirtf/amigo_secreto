import type { InvitePreview } from '@entre-nos/contracts';
import { useToast } from '@entre-nos/ui';
import { router } from 'expo-router';
import { maybeOfferNotifications } from '../notifications/push';
import { errorCode, errorMessage } from '../../lib/errors';
import { haptics } from '../../lib/haptics';
import { usePendingInvite } from '../../state/prefs';
import { useJoinGroup } from './hooks';

/** Why a previewed group can't be joined (copy from flujos S4), or null. */
export function previewBlocker(p: InvitePreview): string | null {
  if (p.alreadyMember) return null;
  if (p.status === 'drawn') {
    return `Este grupo ya hizo el sorteo. Pídele a ${p.organizerName} que te agregue: tendrá que sortear de nuevo.`;
  }
  if (p.status === 'revealed') {
    return 'Este amigo secreto ya terminó. Si quieren hacer otro, que alguien cree un grupo nuevo.';
  }
  return null;
}

/** Join + navigation + toasts shared by S4 and S4b. */
export function useJoinFlow() {
  const toast = useToast();
  const join = useJoinGroup();
  const goToGroup = (id: string, wishlistHint: boolean) => {
    usePendingInvite.getState().set(null);
    router.replace({
      pathname: '/grupo/[id]',
      params: wishlistHint ? { id, joined: '1' } : { id },
    });
  };
  const run = (code: string, preview: InvitePreview | undefined, onError: (m: string) => void) => {
    if (preview?.alreadyMember && preview.groupId) {
      toast.show('Ya estás en este grupo.');
      goToGroup(preview.groupId, false);
      return;
    }
    join.mutate(code, {
      onSuccess: (g) => {
        haptics.success();
        toast.show(`¡Entraste a ${g.name}!`);
        goToGroup(g.id, true);
        void maybeOfferNotifications();
      },
      onError: (e) => {
        if (errorCode(e) === 'ALREADY_MEMBER' && preview?.groupId) {
          toast.show('Ya estás en este grupo.');
          goToGroup(preview.groupId, false);
          return;
        }
        haptics.error();
        onError(
          errorMessage(e, 'join', {
            organizer: preview?.organizerName,
            memberCount: preview?.memberCount,
          }),
        );
      },
    });
  };
  return { run, isPending: join.isPending };
}
