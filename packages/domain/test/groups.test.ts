import { describe, expect, it } from 'vitest';
import {
  createGroup,
  deleteGroup,
  getGroup,
  joinGroup,
  listMyGroups,
  previewInvite,
  removeMember,
  rotateInvite,
  runDraw,
  setExclusions,
  setOrganizerParticipation,
  updateGroup,
} from '../src/index.js';
import { memoryDeps } from '../src/testing/memory.js';
import { groupWith, user } from './helpers.js';

describe('createGroup', () => {
  it('creates an open group with the organizer as participant', async () => {
    const deps = memoryDeps();
    const org = await user(deps, 'org');
    const g = await createGroup(deps, org, {
      name: '  Familia   Pérez ',
      deliveryDate: new Date('2026-12-24T20:00:00Z'),
      budgetCop: 80_000,
      photo: null,
      organizerParticipates: true,
    });
    expect(g).toMatchObject({
      name: 'Familia Pérez',
      deliveryDate: '2026-12-24',
      daysLeft: 23,
      status: 'open',
      memberCount: 1,
      isOrganizer: true,
      budgetCop: 80_000,
      canDraw: false,
      memberLimit: null,
      drawCount: 0,
    });
    expect(g.inviteCode).toMatch(/^[2-9A-Z]{10}$/);
    expect(g.members[0]).toMatchObject({
      id: org,
      isMe: true,
      isOrganizer: true,
      participates: true,
    });
  });
  it('validates input', async () => {
    const deps = memoryDeps();
    const org = await user(deps, 'org');
    await expect(
      createGroup(deps, org, {
        name: 'x',
        deliveryDate: new Date('2026-12-24'),
        budgetCop: null,
        photo: null,
        organizerParticipates: true,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('join / preview / list', () => {
  it('joins with a typed code, idempotently, and notifies the organizer', async () => {
    const { deps, org, groupId, code, members } = await groupWith(2);
    const typed = `${code.slice(0, 5).toLowerCase()} - ${code.slice(5)}`;
    const again = await joinGroup(deps, members[0] as string, typed);
    expect(again.memberCount).toBe(3);
    expect(deps.notifications.sent.filter((n) => n.event.type === 'member_joined')).toHaveLength(2);
    expect(deps.notifications.sent[0]?.userIds).toEqual([org]);
    const list = await listMyGroups(deps, members[1] as string);
    expect(list.map((g) => g.id)).toEqual([groupId]);
  });
  it('previews an invite without joining', async () => {
    const { deps, code, members } = await groupWith(1);
    const stranger = await user(deps, 'stranger');
    const p = await previewInvite(deps, stranger, code);
    expect(p).toMatchObject({
      name: 'Oficina 2026',
      organizerName: 'org',
      memberCount: 2,
      alreadyMember: false,
      groupId: null,
    });
    const mine = await previewInvite(deps, members[0] as string, code);
    expect(mine.alreadyMember).toBe(true);
    expect(mine.groupId).not.toBeNull();
  });
  it('rejects invalid or expired codes with the same error', async () => {
    const { deps, code } = await groupWith(0);
    const s = await user(deps, 's');
    await expect(joinGroup(deps, s, 'XXXXXXXXXX')).rejects.toMatchObject({
      code: 'INVITE_INVALID',
    });
    await expect(joinGroup(deps, s, '$ne')).rejects.toMatchObject({ code: 'INVITE_INVALID' });
    deps.clock.advanceDays(61);
    await expect(joinGroup(deps, s, code)).rejects.toMatchObject({ code: 'INVITE_INVALID' });
  });
  it('closes the group after the draw', async () => {
    const { deps, org, groupId, code } = await groupWith(3);
    await runDraw(deps, org, groupId);
    const late = await user(deps, 'late');
    await expect(joinGroup(deps, late, code)).rejects.toMatchObject({ code: 'GROUP_LOCKED' });
  });
  it('enforces the member limit only when the policy sets one', async () => {
    const { deps, code } = await groupWith(2, { policy: { maxMembersFree: 3 } });
    const extra = await user(deps, 'extra');
    await expect(joinGroup(deps, extra, code)).rejects.toMatchObject({ code: 'GROUP_FULL' });
  });
  it('retries on concurrent writes and gives up after 3', async () => {
    const { deps, code } = await groupWith(0);
    const a = await user(deps, 'a');
    deps.groups.failNextSaves = 2;
    expect((await joinGroup(deps, a, code)).memberCount).toBe(2);
    const b = await user(deps, 'b');
    deps.groups.failNextSaves = 3;
    await expect(joinGroup(deps, b, code)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('access control', () => {
  it('non-members get NOT_FOUND (no existence oracle)', async () => {
    const { deps, groupId } = await groupWith(1);
    const s = await user(deps, 'stranger');
    await expect(getGroup(deps, s, groupId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(getGroup(deps, s, 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('only the organizer edits, rotates, deletes and sets exclusions', async () => {
    const { deps, groupId, members } = await groupWith(2);
    const m = members[0] as string;
    await expect(updateGroup(deps, m, groupId, { name: 'Hack' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(rotateInvite(deps, m, groupId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(deleteGroup(deps, m, groupId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(setExclusions(deps, m, groupId, [])).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(runDraw(deps, m, groupId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(removeMember(deps, m, groupId, members[1] as string)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('exclusions are visible to every member (transparency)', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    await setExclusions(deps, org, groupId, [[members[0] as string, members[1] as string]]);
    expect((await getGroup(deps, org, groupId)).exclusions).toHaveLength(1);
    expect((await getGroup(deps, members[2] as string, groupId)).exclusions).toHaveLength(1);
  });
});

describe('organizer actions', () => {
  it('updates fields', async () => {
    const { deps, org, groupId } = await groupWith(0);
    const g = await updateGroup(deps, org, groupId, {
      name: 'Nuevo nombre',
      deliveryDate: new Date('2026-12-23'),
      budgetCop: null,
      photo: 'data:image/webp;base64,AA==',
    });
    expect(g).toMatchObject({ name: 'Nuevo nombre', deliveryDate: '2026-12-23', budgetCop: null });
    expect(g.photo).toContain('webp');
  });
  it('after the draw the date can only move later', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    await expect(
      updateGroup(deps, org, groupId, { deliveryDate: new Date('2026-12-05') }),
    ).rejects.toMatchObject({ code: 'GROUP_LOCKED' });
    const g = await updateGroup(deps, org, groupId, { deliveryDate: new Date('2026-12-27') });
    expect(g.deliveryDate).toBe('2026-12-27');
  });
  it('rotates the invite code', async () => {
    const { deps, org, groupId, code } = await groupWith(0);
    const g = await rotateInvite(deps, org, groupId);
    expect(g.inviteCode).not.toBe(code);
  });
  it('deletes the group and everything in it', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    await deleteGroup(deps, org, groupId);
    expect(await deps.groups.findById(groupId)).toBeNull();
    expect(await deps.assignments.listForGroup(groupId)).toEqual([]);
  });
  it('members can leave, organizer can remove, both only while open', async () => {
    const { deps, org, groupId, members } = await groupWith(4);
    const [a, b] = members as [string, string];
    await setExclusions(deps, org, groupId, [[a, b]]);
    await removeMember(deps, a, groupId, a);
    await removeMember(deps, org, groupId, b);
    const g = await getGroup(deps, org, groupId);
    expect(g.memberCount).toBe(3);
    expect(g.exclusions).toEqual([]);
    await expect(removeMember(deps, org, groupId, org)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(removeMember(deps, org, groupId, 'ghost')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await runDraw(deps, org, groupId);
    await expect(
      removeMember(deps, members[2] as string, groupId, members[2] as string),
    ).rejects.toMatchObject({
      code: 'GROUP_LOCKED',
    });
  });
  it('"solo organizo" removes the organizer from the draw and their exclusions', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    await setExclusions(deps, org, groupId, [[org, members[0] as string]]);
    const g = await setOrganizerParticipation(deps, org, groupId, false);
    expect(g.members.find((m) => m.isMe)?.participates).toBe(false);
    expect(g.exclusions).toEqual([]);
    expect(g.canDraw).toBe(true);
    const back = await setOrganizerParticipation(deps, org, groupId, true);
    expect(back.members.find((m) => m.isMe)?.participates).toBe(true);
  });
  it('validates and dedupes exclusions', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    const [a, b] = members as [string, string];
    const g = await setExclusions(deps, org, groupId, [
      [a, b],
      [b, a],
    ]);
    expect(g.exclusions).toHaveLength(1);
    await expect(setExclusions(deps, org, groupId, [[a, a]])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(setExclusions(deps, org, groupId, [[a, 'ghost']])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    const many = Array.from({ length: 201 }, (): [string, string] => [a, b]);
    await expect(setExclusions(deps, org, groupId, many)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
});
