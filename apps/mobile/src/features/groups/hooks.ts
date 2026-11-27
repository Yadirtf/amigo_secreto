import type {
  CreateGroupRequest,
  GroupDetail,
  GroupSummary,
  UpdateGroupRequest,
} from '@entre-nos/contracts';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import type { ExclusionPair } from '../../api/endpoints';
import { qk } from '../../query/keys';

const GROUPS_STALE = 60_000;

function toSummary(g: GroupDetail): GroupSummary {
  return {
    id: g.id,
    name: g.name,
    photo: g.photo,
    deliveryDate: g.deliveryDate,
    daysLeft: g.daysLeft,
    status: g.status,
    memberCount: g.memberCount,
    isOrganizer: g.isOrganizer,
  };
}

/** Writes a fresh GroupDetail into the cache and keeps the list in sync. */
export function storeGroup(client: QueryClient, g: GroupDetail): void {
  client.setQueryData(qk.group(g.id), g);
  client.setQueryData<{ groups: GroupSummary[] }>(qk.groups, (old) => {
    if (!old) return old;
    const exists = old.groups.some((x) => x.id === g.id);
    return {
      groups: exists
        ? old.groups.map((x) => (x.id === g.id ? toSummary(g) : x))
        : [toSummary(g), ...old.groups],
    };
  });
}

function dropGroup(client: QueryClient, id: string): void {
  client.setQueryData<{ groups: GroupSummary[] }>(qk.groups, (old) =>
    old ? { groups: old.groups.filter((g) => g.id !== id) } : old,
  );
  client.removeQueries({ queryKey: qk.group(id) });
  client.removeQueries({ queryKey: qk.assignment(id) });
  client.removeQueries({ queryKey: qk.wishlist(id) });
  client.removeQueries({ queryKey: ['chat', id] });
  client.removeQueries({ queryKey: qk.reveal(id) });
}

export function useGroups() {
  return useQuery({
    queryKey: qk.groups,
    queryFn: ({ signal }) => api.groups.list(signal),
    staleTime: GROUPS_STALE,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: qk.group(id),
    queryFn: ({ signal }) => api.groups.get(id, signal),
    staleTime: GROUPS_STALE,
    enabled: id !== '',
  });
}

export function useCreateGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupRequest) => api.groups.create(body),
    networkMode: 'online',
    retry: false,
    onSuccess: (g) => storeGroup(client, g),
  });
}

export function useUpdateGroup(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateGroupRequest) => api.groups.update(id, body),
    networkMode: 'online',
    onSuccess: (g) => storeGroup(client, g),
  });
}

export function useDeleteGroup(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.groups.delete(id),
    networkMode: 'online',
    onSuccess: () => dropGroup(client, id),
  });
}

export function useJoinGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.groups.join(code),
    networkMode: 'online',
    retry: false,
    onSuccess: (g) => storeGroup(client, g),
  });
}

export function useInvitePreview(code: string | null) {
  return useQuery({
    queryKey: qk.invite(code ?? ''),
    queryFn: ({ signal }) => api.invites.preview(code ?? '', signal),
    enabled: !!code,
    staleTime: 30_000,
    retry: false,
    networkMode: 'online',
  });
}

/** Group-level actions that return the updated GroupDetail. */
function useGroupAction<V>(fn: (v: V) => Promise<GroupDetail>, extra?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    networkMode: 'online',
    retry: false,
    onSuccess: (g) => {
      storeGroup(client, g);
      extra?.();
    },
  });
}

export function useRotateInvite(id: string) {
  return useGroupAction(() => api.groups.rotateInvite(id));
}

export function useParticipation(id: string) {
  return useGroupAction((participates: boolean) => api.groups.participation(id, participates));
}

export function useSaveExclusions(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (exclusions: ExclusionPair[]) => api.groups.exclusions(id, exclusions),
    networkMode: 'online',
    onMutate: async (exclusions) => {
      await client.cancelQueries({ queryKey: qk.group(id) });
      const prev = client.getQueryData<GroupDetail>(qk.group(id));
      if (prev) client.setQueryData(qk.group(id), { ...prev, exclusions });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) client.setQueryData(qk.group(id), ctx.prev);
    },
    onSuccess: (g) => storeGroup(client, g),
  });
}

export function useDraw(id: string) {
  const client = useQueryClient();
  return useGroupAction(
    () => api.groups.draw(id),
    () => client.invalidateQueries({ queryKey: qk.assignment(id) }),
  );
}

export function useRedraw(id: string) {
  const client = useQueryClient();
  return useGroupAction(
    () => api.groups.redraw(id),
    () => {
      client.removeQueries({ queryKey: qk.assignment(id) });
      client.removeQueries({ queryKey: ['chat', id] });
    },
  );
}

export function useReopen(id: string) {
  const client = useQueryClient();
  return useGroupAction(
    () => api.groups.reopen(id),
    () => {
      client.removeQueries({ queryKey: qk.assignment(id) });
      client.removeQueries({ queryKey: ['chat', id] });
    },
  );
}

export function useRevealNow(id: string) {
  const client = useQueryClient();
  return useGroupAction(
    () => api.groups.reveal(id),
    () => client.invalidateQueries({ queryKey: qk.reveal(id) }),
  );
}

export function useRemoveMember(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.groups.removeMember(id, userId),
    networkMode: 'online',
    onSuccess: () => client.invalidateQueries({ queryKey: qk.group(id) }),
  });
}

export function useLeaveGroup(id: string, myId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.groups.removeMember(id, myId),
    networkMode: 'online',
    onSuccess: () => dropGroup(client, id),
  });
}

export function useReveal(id: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.reveal(id),
    queryFn: ({ signal }) => api.groups.getReveal(id, signal),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export function useAssignment(id: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.assignment(id),
    queryFn: ({ signal }) => api.groups.assignment(id, signal),
    enabled,
    staleTime: 10 * 60_000,
  });
}

export { dropGroup };
