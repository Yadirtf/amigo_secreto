import type { Group, GroupId, Member, User, UserId } from '../entities.js';
import { DomainError } from '../errors.js';
import type { Deps } from '../ports.js';

/** A non-member gets the same error as a missing group: no existence oracle. */
export async function loadGroupForMember(
  deps: Pick<Deps, 'groups'>,
  groupId: GroupId,
  actorId: UserId,
): Promise<{ group: Group; member: Member }> {
  const group = await deps.groups.findById(groupId);
  const member = group?.members.find((m) => m.userId === actorId);
  if (!group || !member) throw new DomainError('NOT_FOUND', 'group not found');
  return { group, member };
}

export function requireOrganizer(group: Group, actorId: UserId): void {
  if (group.organizerId !== actorId) {
    throw new DomainError('FORBIDDEN', 'only the organizer can do this');
  }
}

export function requireStatus(group: Group, ...allowed: Group['status'][]): void {
  if (!allowed.includes(group.status)) {
    throw new DomainError('GROUP_LOCKED', `group is ${group.status}`, { status: group.status });
  }
}

/** Deep copy of a group (no structuredClone: not available on every runtime). */
export function cloneGroup(g: Group): Group {
  return {
    ...g,
    deliveryDate: new Date(g.deliveryDate),
    inviteExpiresAt: new Date(g.inviteExpiresAt),
    drawnAt: g.drawnAt ? new Date(g.drawnAt) : null,
    revealedAt: g.revealedAt ? new Date(g.revealedAt) : null,
    createdAt: new Date(g.createdAt),
    members: g.members.map((m) => ({ ...m, joinedAt: new Date(m.joinedAt) })),
    exclusions: g.exclusions.map(([a, b]) => [a, b]),
  };
}

/**
 * Loads, mutates and saves a group with optimistic concurrency, retrying a
 * few times on concurrent writes.
 */
export async function mutateGroup(
  deps: Pick<Deps, 'groups'>,
  groupId: GroupId,
  actorId: UserId,
  mutate: (group: Group, member: Member) => Group | Promise<Group>,
): Promise<Group> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { group, member } = await loadGroupForMember(deps, groupId, actorId);
    const next = await mutate(cloneGroup(group), member);
    next.version = group.version + 1;
    if (await deps.groups.save(next)) return next;
  }
  throw new DomainError('CONFLICT', 'group changed concurrently, retry');
}

export function participantsOf(group: Group): UserId[] {
  return group.members.filter((m) => m.participates).map((m) => m.userId);
}

export function memberLimit(group: Group, deps: Pick<Deps, 'policy'>): number | null {
  return group.premium ? deps.policy.maxMembersPremium : deps.policy.maxMembersFree;
}

export interface PublicProfile {
  id: UserId;
  name: string;
  photo: string | null;
}

export const DELETED_NAME = 'Participante';

export function toProfile(user: User | undefined, id: UserId): PublicProfile {
  return user
    ? { id: user.id, name: user.name, photo: user.photo }
    : { id, name: DELETED_NAME, photo: null };
}

export async function profilesById(
  deps: Pick<Deps, 'users'>,
  ids: readonly UserId[],
): Promise<Map<UserId, PublicProfile>> {
  const users = await deps.users.findManyByIds(ids);
  const byId = new Map(users.map((u) => [u.id, u]));
  return new Map(ids.map((id) => [id, toProfile(byId.get(id), id)]));
}

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/** Today's date in Colombia (UTC-5, no DST) as UTC midnight. */
export function colombiaToday(now: Date): Date {
  const local = new Date(now.getTime() - 5 * 3_600_000);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}
