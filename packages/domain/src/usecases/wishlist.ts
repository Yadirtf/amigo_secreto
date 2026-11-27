import type { GroupId, UserId, Wish } from '../entities.js';
import { DomainError } from '../errors.js';
import type { Deps } from '../ports.js';
import { cleanText, LIMITS, validateLink } from '../rules/validation.js';
import { loadGroupForMember } from './shared.js';

export interface WishInput {
  id?: string;
  text: string;
  link?: string | null;
  size?: string | null;
}

export async function getMyWishlist(
  deps: Pick<Deps, 'groups' | 'wishlists'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<Wish[]> {
  await loadGroupForMember(deps, groupId, actorId);
  return (await deps.wishlists.get(groupId, actorId))?.items ?? [];
}

/** Replaces the whole list (small payload; simple offline sync). */
export async function putMyWishlist(
  deps: Pick<Deps, 'groups' | 'wishlists' | 'ids' | 'clock'>,
  actorId: UserId,
  groupId: GroupId,
  items: readonly WishInput[],
): Promise<Wish[]> {
  await loadGroupForMember(deps, groupId, actorId);
  if (items.length > LIMITS.wishlistItems) {
    throw new DomainError('INVALID_INPUT', 'too many wishes', { field: 'items' });
  }
  const seen = new Set<string>();
  const clean: Wish[] = items.map((item) => {
    let id = item.id && /^[A-Za-z0-9_-]{1,40}$/.test(item.id) ? item.id : deps.ids.id();
    if (seen.has(id)) id = deps.ids.id();
    seen.add(id);
    const size = item.size?.trim() ? cleanText(item.size, 'size', 1, LIMITS.wishSize) : null;
    return {
      id,
      text: cleanText(item.text, 'text', LIMITS.wishText.min, LIMITS.wishText.max),
      link: validateLink(item.link ?? null),
      size,
    };
  });
  await deps.wishlists.put({ groupId, userId: actorId, items: clean, updatedAt: deps.clock.now() });
  return clean;
}
