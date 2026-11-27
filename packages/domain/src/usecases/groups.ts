import type { Exclusion, Group, GroupId, GroupStatus, UserId } from '../entities.js';
import { DomainError } from '../errors.js';
import type { Deps } from '../ports.js';
import { MIN_PARTICIPANTS } from '../rules/draw.js';
import { normalizeInviteCode } from '../rules/invite.js';
import {
  cleanText,
  LIMITS,
  validateBudget,
  validateDeliveryDate,
  validatePhoto,
} from '../rules/validation.js';
import {
  cloneGroup,
  daysBetween,
  loadGroupForMember,
  memberLimit,
  mutateGroup,
  participantsOf,
  profilesById,
  requireOrganizer,
  requireStatus,
  type PublicProfile,
} from './shared.js';

export interface GroupSummaryView {
  id: GroupId;
  name: string;
  photo: string | null;
  deliveryDate: string;
  daysLeft: number;
  status: GroupStatus;
  memberCount: number;
  isOrganizer: boolean;
}

export interface MemberView extends PublicProfile {
  participates: boolean;
  isOrganizer: boolean;
  isMe: boolean;
}

export interface GroupDetailView extends GroupSummaryView {
  budgetCop: number | null;
  inviteCode: string;
  inviteExpiresAt: string;
  members: MemberView[];
  /** Visible to every member (transparency: nobody can rig the draw silently). */
  exclusions: Exclusion[];
  drawCount: number;
  drawnAt: string | null;
  revealedAt: string | null;
  canDraw: boolean;
  memberLimit: number;
  redrawsLeft: number;
}

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

function toSummary(group: Group, actorId: UserId, now: Date): GroupSummaryView {
  return {
    id: group.id,
    name: group.name,
    photo: group.photo,
    deliveryDate: isoDay(group.deliveryDate),
    daysLeft: daysBetween(now, group.deliveryDate),
    status: group.status,
    memberCount: group.members.length,
    isOrganizer: group.organizerId === actorId,
  };
}

export async function toDetail(
  deps: Pick<Deps, 'users' | 'clock' | 'policy'>,
  group: Group,
  actorId: UserId,
): Promise<GroupDetailView> {
  const profiles = await profilesById(
    deps,
    group.members.map((m) => m.userId),
  );
  const isOrganizer = group.organizerId === actorId;
  return {
    ...toSummary(group, actorId, deps.clock.now()),
    budgetCop: group.budgetCop,
    inviteCode: group.inviteCode,
    inviteExpiresAt: group.inviteExpiresAt.toISOString(),
    members: group.members.map((m) => ({
      ...(profiles.get(m.userId) as PublicProfile),
      participates: m.participates,
      isOrganizer: m.userId === group.organizerId,
      isMe: m.userId === actorId,
    })),
    exclusions: group.exclusions,
    drawCount: group.drawCount,
    drawnAt: group.drawnAt?.toISOString() ?? null,
    revealedAt: group.revealedAt?.toISOString() ?? null,
    canDraw:
      isOrganizer && group.status === 'open' && participantsOf(group).length >= MIN_PARTICIPANTS,
    memberLimit: memberLimit(group, deps),
    redrawsLeft: Math.max(0, deps.policy.maxRedraws - Math.max(0, group.drawCount - 1)),
  };
}

export interface CreateGroupInput {
  name: string;
  deliveryDate: Date;
  budgetCop: number | null;
  photo: string | null;
  organizerParticipates: boolean;
}

export async function createGroup(
  deps: Pick<Deps, 'groups' | 'users' | 'ids' | 'clock' | 'policy'>,
  actorId: UserId,
  input: CreateGroupInput,
): Promise<GroupDetailView> {
  const now = deps.clock.now();
  const group: Group = {
    id: deps.ids.id(),
    name: cleanText(input.name, 'name', LIMITS.groupName.min, LIMITS.groupName.max),
    organizerId: actorId,
    deliveryDate: validateDeliveryDate(input.deliveryDate, now),
    budgetCop: validateBudget(input.budgetCop),
    photo: validatePhoto(input.photo),
    inviteCode: deps.ids.inviteCode(),
    inviteExpiresAt: new Date(now.getTime() + deps.policy.inviteTtlDays * 86_400_000),
    status: 'open',
    premium: false,
    members: [
      {
        userId: actorId,
        participates: input.organizerParticipates,
        joinedAt: now,
        hasSeenAssignment: false,
      },
    ],
    exclusions: [],
    bannedUserIds: [],
    drawCount: 0,
    drawnAt: null,
    revealedAt: null,
    createdAt: now,
    version: 1,
  };
  await deps.groups.create(group);
  return toDetail(deps, group, actorId);
}

export async function listMyGroups(
  deps: Pick<Deps, 'groups' | 'clock'>,
  actorId: UserId,
): Promise<GroupSummaryView[]> {
  const now = deps.clock.now();
  const groups = await deps.groups.listForUser(actorId);
  return groups
    .map((g) => toSummary(g, actorId, now))
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
}

export async function getGroup(
  deps: Pick<Deps, 'groups' | 'users' | 'clock' | 'policy'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<GroupDetailView> {
  const { group } = await loadGroupForMember(deps, groupId, actorId);
  return toDetail(deps, group, actorId);
}

export interface UpdateGroupInput {
  name?: string;
  deliveryDate?: Date;
  budgetCop?: number | null;
  photo?: string | null;
}

/** Name, date, budget and photo stay editable after the draw (they don't affect it). */
export async function updateGroup(
  deps: Pick<Deps, 'groups' | 'users' | 'clock' | 'policy'>,
  actorId: UserId,
  groupId: GroupId,
  input: UpdateGroupInput,
): Promise<GroupDetailView> {
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    if (input.name !== undefined) {
      g.name = cleanText(input.name, 'name', LIMITS.groupName.min, LIMITS.groupName.max);
    }
    if (input.deliveryDate !== undefined) {
      const next = validateDeliveryDate(input.deliveryDate, deps.clock.now());
      // After the draw the date may only move later, otherwise the organizer
      // could bring the reveal forward to peek at the assignments.
      if (g.status !== 'open' && next.getTime() < g.deliveryDate.getTime()) {
        throw new DomainError('GROUP_LOCKED', 'after the draw the date can only move later', {
          field: 'deliveryDate',
        });
      }
      g.deliveryDate = next;
    }
    if (input.budgetCop !== undefined) g.budgetCop = validateBudget(input.budgetCop);
    if (input.photo !== undefined) g.photo = validatePhoto(input.photo);
    return g;
  });
  return toDetail(deps, group, actorId);
}

export async function deleteGroup(
  deps: Pick<Deps, 'groups' | 'assignments' | 'messages' | 'wishlists'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<void> {
  const { group } = await loadGroupForMember(deps, groupId, actorId);
  requireOrganizer(group, actorId);
  await deps.assignments.deleteForGroup(groupId);
  await deps.messages.deleteForGroup(groupId);
  await deps.wishlists.deleteForGroup(groupId);
  await deps.groups.delete(groupId);
}

/** Minimal info shown on "Unirte a este grupo" before joining. */
export interface InvitePreviewView {
  name: string;
  photo: string | null;
  deliveryDate: string;
  organizerName: string;
  memberCount: number;
  status: GroupStatus;
  alreadyMember: boolean;
  groupId: GroupId | null;
}

async function findGroupByCode(
  deps: Pick<Deps, 'groups' | 'clock'>,
  rawCode: string,
): Promise<Group> {
  const code = normalizeInviteCode(rawCode);
  const group = code ? await deps.groups.findByInviteCode(code) : null;
  if (!group || group.inviteExpiresAt.getTime() < deps.clock.now().getTime()) {
    throw new DomainError('INVITE_INVALID', 'invite code invalid or expired');
  }
  return group;
}

export async function previewInvite(
  deps: Pick<Deps, 'groups' | 'users' | 'clock'>,
  actorId: UserId,
  rawCode: string,
): Promise<InvitePreviewView> {
  const group = await findGroupByCode(deps, rawCode);
  const organizer = await deps.users.findById(group.organizerId);
  const alreadyMember = group.members.some((m) => m.userId === actorId);
  return {
    name: group.name,
    photo: group.photo,
    deliveryDate: isoDay(group.deliveryDate),
    organizerName: organizer?.name ?? 'El organizador',
    memberCount: group.members.length,
    status: group.status,
    alreadyMember,
    groupId: alreadyMember ? group.id : null,
  };
}

export async function joinGroup(
  deps: Pick<Deps, 'groups' | 'users' | 'clock' | 'policy' | 'notifications'>,
  actorId: UserId,
  rawCode: string,
): Promise<GroupDetailView> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const group = await findGroupByCode(deps, rawCode);
    if (group.members.some((m) => m.userId === actorId)) {
      return toDetail(deps, group, actorId);
    }
    // Someone the organizer removed can't come back with the same link (PT-03).
    if ((group.bannedUserIds ?? []).includes(actorId)) {
      throw new DomainError('INVITE_INVALID', 'invite code invalid or expired');
    }
    requireStatus(group, 'open');
    const limit = memberLimit(group, deps);
    if (limit !== null && group.members.length >= limit) {
      throw new DomainError('GROUP_FULL', 'group is full', { limit });
    }
    const next = cloneGroup(group);
    next.members.push({
      userId: actorId,
      participates: true,
      joinedAt: deps.clock.now(),
      hasSeenAssignment: false,
    });
    next.version = group.version + 1;
    if (await deps.groups.save(next)) {
      const me = await deps.users.findById(actorId);
      await deps.notifications.notify([group.organizerId], {
        type: 'member_joined',
        groupId: group.id,
        groupName: group.name,
        memberName: me?.name ?? 'Alguien',
      });
      return toDetail(deps, next, actorId);
    }
  }
  throw new DomainError('CONFLICT', 'group changed concurrently, retry');
}

export async function rotateInvite(
  deps: Pick<Deps, 'groups' | 'users' | 'ids' | 'clock' | 'policy'>,
  actorId: UserId,
  groupId: GroupId,
): Promise<GroupDetailView> {
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    g.inviteCode = deps.ids.inviteCode();
    g.inviteExpiresAt = new Date(
      deps.clock.now().getTime() + deps.policy.inviteTtlDays * 86_400_000,
    );
    return g;
  });
  return toDetail(deps, group, actorId);
}

/**
 * A member leaves, or the organizer removes someone. Only while the group is
 * open: after the draw the organizer must reopen (which clears the draw).
 */
export async function removeMember(
  deps: Pick<Deps, 'groups' | 'wishlists' | 'ids' | 'clock' | 'policy'>,
  actorId: UserId,
  groupId: GroupId,
  targetId: UserId,
): Promise<void> {
  await mutateGroup(deps, groupId, actorId, (g) => {
    const self = targetId === actorId;
    if (!self) requireOrganizer(g, actorId);
    if (targetId === g.organizerId) {
      throw new DomainError('FORBIDDEN', 'the organizer cannot leave; delete the group instead');
    }
    requireStatus(g, 'open');
    if (!g.members.some((m) => m.userId === targetId)) {
      throw new DomainError('NOT_FOUND', 'member not found');
    }
    g.members = g.members.filter((m) => m.userId !== targetId);
    g.exclusions = g.exclusions.filter(([a, b]) => a !== targetId && b !== targetId);
    if (!self) {
      // Removed by the organizer: ban and rotate the invite code (PT-03).
      g.bannedUserIds = [...new Set([...(g.bannedUserIds ?? []), targetId])];
      g.inviteCode = deps.ids.inviteCode();
      g.inviteExpiresAt = new Date(
        deps.clock.now().getTime() + deps.policy.inviteTtlDays * 86_400_000,
      );
    }
    return g;
  });
  await deps.wishlists.deleteForUser(groupId, targetId);
}

export async function setOrganizerParticipation(
  deps: Pick<Deps, 'groups' | 'users' | 'clock' | 'policy'>,
  actorId: UserId,
  groupId: GroupId,
  participates: boolean,
): Promise<GroupDetailView> {
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    requireStatus(g, 'open');
    g.members = g.members.map((m) => (m.userId === actorId ? { ...m, participates } : m));
    if (!participates) {
      g.exclusions = g.exclusions.filter(([a, b]) => a !== actorId && b !== actorId);
    }
    return g;
  });
  return toDetail(deps, group, actorId);
}

export async function setExclusions(
  deps: Pick<Deps, 'groups' | 'users' | 'clock' | 'policy'>,
  actorId: UserId,
  groupId: GroupId,
  exclusions: readonly Exclusion[],
): Promise<GroupDetailView> {
  if (exclusions.length > LIMITS.exclusions) {
    throw new DomainError('INVALID_INPUT', 'too many exclusions', { field: 'exclusions' });
  }
  const group = await mutateGroup(deps, groupId, actorId, (g) => {
    requireOrganizer(g, actorId);
    requireStatus(g, 'open');
    const ids = new Set(g.members.map((m) => m.userId));
    const seen = new Set<string>();
    const perPerson = new Map<string, number>();
    const clean: Exclusion[] = [];
    for (const [a, b] of exclusions) {
      if (a === b || !ids.has(a) || !ids.has(b)) {
        throw new DomainError('INVALID_INPUT', 'invalid exclusion', { field: 'exclusions' });
      }
      const pair: Exclusion = a < b ? [a, b] : [b, a];
      const key = pair.join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      for (const p of pair) {
        const n = (perPerson.get(p) ?? 0) + 1;
        if (n > LIMITS.exclusionsPerPerson) {
          throw new DomainError('INVALID_INPUT', 'too many exclusions for one person', {
            field: 'exclusions',
            max: LIMITS.exclusionsPerPerson,
          });
        }
        perPerson.set(p, n);
      }
      clean.push(pair);
    }
    g.exclusions = clean;
    return g;
  });
  return toDetail(deps, group, actorId);
}
