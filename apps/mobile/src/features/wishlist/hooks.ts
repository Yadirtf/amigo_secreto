import type { Wish } from '@entre-nos/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import type { PutWishlistVars } from '../../query/client';
import { mutationKeys, qk } from '../../query/keys';

type WishlistData = { items: Wish[] };

let localCounter = 0;
/** Client-generated ids are kept by the server (stable for optimistic edits). */
export function newLocalId(): string {
  localCounter += 1;
  return `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}${localCounter}`;
}

export function useWishlist(groupId: string) {
  return useQuery({
    queryKey: qk.wishlist(groupId),
    queryFn: ({ signal }) => api.wishlist.get(groupId, signal),
    staleTime: 5 * 60_000,
  });
}

/**
 * Saves the whole list (PUT). Optimistic: the cache changes at once; offline
 * the save is paused, persisted, and resumed when the connection returns.
 * Saves for the same group run one after the other (scope).
 */
export function useSaveWishlist(groupId: string) {
  const client = useQueryClient();
  return useMutation<WishlistData, Error, PutWishlistVars, { prev: WishlistData | undefined }>({
    mutationKey: mutationKeys.putWishlist,
    scope: { id: `wishlist-${groupId}` },
    onMutate: async (vars) => {
      await client.cancelQueries({ queryKey: qk.wishlist(groupId) });
      const prev = client.getQueryData<WishlistData>(qk.wishlist(groupId));
      const optimistic: Wish[] = vars.items.map((i) => ({
        id: i.id ?? newLocalId(),
        text: i.text,
        link: i.link ?? null,
        size: i.size ?? null,
      }));
      client.setQueryData<WishlistData>(qk.wishlist(groupId), { items: optimistic });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) client.setQueryData(qk.wishlist(groupId), ctx.prev);
    },
    onSuccess: (data) => {
      // Only apply if no newer save is still queued for this group.
      const pending = client
        .getMutationCache()
        .findAll({ mutationKey: mutationKeys.putWishlist, status: 'pending' });
      if (pending.length <= 1) client.setQueryData(qk.wishlist(groupId), data);
    },
  });
}

/**
 * Builds the next list and saves it. Fire-and-forget: the cache updates at
 * once (works offline); `onError` fires only if the save finally fails.
 */
export function useWishlistEditor(groupId: string, onError?: (e: Error) => void) {
  const client = useQueryClient();
  const save = useSaveWishlist(groupId);
  const current = (): Wish[] =>
    client.getQueryData<WishlistData>(qk.wishlist(groupId))?.items ?? [];
  const commit = (items: Wish[]) =>
    save.mutate(
      {
        groupId,
        items: items.map((w) => ({ id: w.id, text: w.text, link: w.link, size: w.size })),
      },
      { onError },
    );
  return {
    save,
    add: (w: Omit<Wish, 'id'>) => commit([...current(), { ...w, id: newLocalId() }]),
    update: (w: Wish) => commit(current().map((x) => (x.id === w.id ? w : x))),
    remove: (id: string) => commit(current().filter((x) => x.id !== id)),
    restore: (items: Wish[]) => commit(items),
    current,
  };
}
