import type { User, UserId } from '../entities.js';
import { DomainError } from '../errors.js';
import type { Deps } from '../ports.js';
import { cleanText, LIMITS, validatePhoto } from '../rules/validation.js';
import { cloneGroup } from './shared.js';

export interface ProviderIdentity {
  provider: 'google' | 'apple';
  sub: string;
  email: string | null;
  name: string | null;
  photoUrl?: string | null;
}

/** Finds or creates the user behind a verified identity-provider token. */
export async function signInWithProvider(
  deps: Pick<Deps, 'users' | 'ids' | 'clock'>,
  identity: ProviderIdentity,
): Promise<{ user: User; isNew: boolean }> {
  if (!identity.sub) throw new DomainError('INVALID_INPUT', 'missing subject');
  const existing = await deps.users.findByProvider(identity.provider, identity.sub);
  if (existing) return { user: existing, isNew: false };

  const rawName = (identity.name ?? '').trim() || (identity.email ?? '').split('@')[0] || 'Amigo';
  const user: User = {
    id: deps.ids.id(),
    name: rawName.slice(0, LIMITS.userName.max).trim() || 'Amigo',
    photo: null,
    email: identity.email,
    googleSub: identity.provider === 'google' ? identity.sub : null,
    appleSub: identity.provider === 'apple' ? identity.sub : null,
    createdAt: deps.clock.now(),
  };
  await deps.users.create(user);
  return { user, isNew: true };
}

export interface MeView {
  id: UserId;
  name: string;
  photo: string | null;
  email: string | null;
}

export const toMeView = (u: User): MeView => ({
  id: u.id,
  name: u.name,
  photo: u.photo,
  email: u.email,
});

export async function getMe(deps: Pick<Deps, 'users'>, actorId: UserId): Promise<MeView> {
  const user = await deps.users.findById(actorId);
  if (!user) throw new DomainError('NOT_FOUND', 'user not found');
  return toMeView(user);
}

export async function updateProfile(
  deps: Pick<Deps, 'users'>,
  actorId: UserId,
  input: { name?: string; photo?: string | null },
): Promise<MeView> {
  const patch: Partial<Pick<User, 'name' | 'photo'>> = {};
  if (input.name !== undefined) {
    patch.name = cleanText(input.name, 'name', LIMITS.userName.min, LIMITS.userName.max);
  }
  if (input.photo !== undefined) patch.photo = validatePhoto(input.photo);
  const user = await deps.users.update(actorId, patch);
  if (!user) throw new DomainError('NOT_FOUND', 'user not found');
  return toMeView(user);
}

/**
 * Deletes the account (store requirement).
 * - Groups the user organizes: ownership goes to the earliest other member, or
 *   the group is deleted when nobody else is in it.
 * - Open groups: the membership is removed.
 * - Drawn/revealed groups: the membership stays so the draw remains consistent;
 *   the user record is deleted and shows up as "Participante".
 * - Their wishlists are deleted everywhere.
 */
export async function deleteAccount(
  deps: Pick<Deps, 'users' | 'groups' | 'wishlists' | 'assignments' | 'messages'>,
  actorId: UserId,
): Promise<void> {
  const groups = await deps.groups.listForUser(actorId);
  for (const g of groups) {
    const others = g.members.filter((m) => m.userId !== actorId);
    if (others.length === 0) {
      await deps.assignments.deleteForGroup(g.id);
      await deps.messages.deleteForGroup(g.id);
      await deps.wishlists.deleteForGroup(g.id);
      await deps.groups.delete(g.id);
      continue;
    }
    const next = cloneGroup(g);
    if (next.organizerId === actorId) {
      const heir = [...others].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
      next.organizerId = (heir as (typeof others)[number]).userId;
    }
    if (next.status === 'open') {
      next.members = others;
      next.exclusions = next.exclusions.filter(([a, b]) => a !== actorId && b !== actorId);
    }
    next.version = g.version + 1;
    await deps.groups.save(next);
    await deps.wishlists.deleteForUser(g.id, actorId);
  }
  await deps.users.delete(actorId);
}
