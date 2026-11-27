import { describe, expect, it } from 'vitest';
import {
  getGroup,
  getMyAssignment,
  getReveal,
  putMyWishlist,
  redraw,
  reopenGroup,
  reveal,
  runDraw,
  sendMessage,
  setExclusions,
  setOrganizerParticipation,
} from '../src/index.js';
import { groupWith } from './helpers.js';

describe('runDraw', () => {
  it('assigns everyone, notifies everyone, and locks the group', async () => {
    const { deps, org, groupId, all } = await groupWith(4);
    const g = await runDraw(deps, org, groupId);
    expect(g).toMatchObject({ status: 'drawn', drawCount: 1, canDraw: false, redrawsLeft: 2 });
    const assignments = await deps.assignments.listForGroup(groupId);
    expect(assignments).toHaveLength(5);
    expect(new Set(assignments.map((a) => a.receiverId)).size).toBe(5);
    const n = deps.notifications.sent.at(-1);
    expect(n?.event).toMatchObject({ type: 'draw_done', redraw: false });
    expect(new Set(n?.userIds)).toEqual(new Set(all));
    await expect(runDraw(deps, org, groupId)).rejects.toMatchObject({ code: 'GROUP_LOCKED' });
  });
  it('keeps at least 2 possible recipients per person', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    const [a, b] = members as [string, string];
    await setExclusions(deps, org, groupId, [
      [org, a],
      [org, b],
    ]);
    await expect(runDraw(deps, org, groupId)).rejects.toMatchObject({
      code: 'DRAW_IMPOSSIBLE',
      details: { blocking: [org] },
    });
  });
  it('needs 3 participants', async () => {
    const { deps, org, groupId } = await groupWith(1);
    await expect(runDraw(deps, org, groupId)).rejects.toMatchObject({
      code: 'NOT_ENOUGH_PARTICIPANTS',
    });
  });
  it('explains impossible draws with the blocking people', async () => {
    const { deps, org, groupId, members } = await groupWith(2);
    const [a, b] = members as [string, string];
    await setExclusions(deps, org, groupId, [
      [org, a],
      [org, b],
    ]);
    await expect(runDraw(deps, org, groupId)).rejects.toMatchObject({
      code: 'DRAW_IMPOSSIBLE',
      details: { blocking: expect.arrayContaining([org]) },
    });
  });
  it('excludes a non-participating organizer', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await setOrganizerParticipation(deps, org, groupId, false);
    await runDraw(deps, org, groupId);
    const as = await deps.assignments.listForGroup(groupId);
    expect(as).toHaveLength(3);
    expect(as.some((a) => a.giverId === org || a.receiverId === org)).toBe(false);
    await expect(getMyAssignment(deps, org, groupId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('getMyAssignment', () => {
  it('shows only my recipient with their wishlist, and marks seen', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    await expect(getMyAssignment(deps, org, groupId)).rejects.toMatchObject({
      code: 'DRAW_NOT_DONE',
    });
    await runDraw(deps, org, groupId);
    const mine = await deps.assignments.findByGiver(groupId, org);
    await putMyWishlist(deps, mine?.receiverId as string, groupId, [{ text: 'Medias', size: 'M' }]);
    const view = await getMyAssignment(deps, org, groupId);
    expect(view.recipient.id).toBe(mine?.receiverId);
    expect(view.wishlist[0]).toMatchObject({ text: 'Medias', size: 'M' });
    expect(JSON.stringify(view)).not.toContain('giverId');
    const g = await getGroup(deps, members[0] as string, groupId);
    expect(g.members.find((m) => m.id === org)?.hasSeenAssignment).toBe(true);
    // Second call does not write again.
    const before = (await deps.groups.findById(groupId))?.version;
    await getMyAssignment(deps, org, groupId);
    expect((await deps.groups.findById(groupId))?.version).toBe(before);
  });
  it('group view never exposes assignments', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    const as = await deps.assignments.listForGroup(groupId);
    const json = JSON.stringify(await getGroup(deps, org, groupId));
    for (const a of as) expect(json).not.toContain(a.id);
    expect(json).not.toMatch(/receiver|giver/i);
  });
});

describe('redraw and reopen', () => {
  it('redraws, wipes old chats and notifies with redraw=true', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    await sendMessage(deps, org, groupId, 'giver', 'Hola');
    const g = await redraw(deps, org, groupId);
    expect(g.drawCount).toBe(2);
    expect(g.redrawsLeft).toBe(1);
    expect(deps.messages.data).toHaveLength(0);
    expect(deps.notifications.sent.at(-1)?.event).toMatchObject({
      type: 'draw_done',
      redraw: true,
    });
    const as = await deps.assignments.listForGroup(groupId);
    expect(as.every((a) => a.drawNumber === 2)).toBe(true);
  });
  it('cannot redraw an open group and is limited', async () => {
    const { deps, org, groupId } = await groupWith(3, { policy: { maxRedraws: 1 } });
    await expect(redraw(deps, org, groupId)).rejects.toMatchObject({ code: 'GROUP_LOCKED' });
    await runDraw(deps, org, groupId);
    await redraw(deps, org, groupId);
    await expect(redraw(deps, org, groupId)).rejects.toMatchObject({ code: 'REDRAW_LIMIT' });
    await expect(reopenGroup(deps, org, groupId)).rejects.toMatchObject({ code: 'REDRAW_LIMIT' });
  });
  it('reopens for joins, clearing the draw', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    const g = await reopenGroup(deps, org, groupId);
    expect(g).toMatchObject({ status: 'open', drawnAt: null, canDraw: true });
    expect(await deps.assignments.listForGroup(groupId)).toEqual([]);
    expect(deps.notifications.sent.at(-1)?.event.type).toBe('group_reopened');
    const again = await runDraw(deps, org, groupId);
    expect(again.drawCount).toBe(2);
  });
});

describe('reveal', () => {
  it('only after organizer reveals; then all pairs and my giver are visible', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    await runDraw(deps, org, groupId);
    const m = members[0] as string;
    await expect(getReveal(deps, m, groupId)).rejects.toMatchObject({ code: 'NOT_REVEALED' });
    await expect(reveal(deps, m, groupId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    // Not before the delivery day (Dec 20, Colombia time).
    deps.clock.current = new Date('2026-12-20T04:59:00Z'); // Dec 19, 11:59 pm in Bogotá
    await expect(reveal(deps, org, groupId)).rejects.toMatchObject({ code: 'NOT_REVEALED' });
    deps.clock.current = new Date('2026-12-20T05:00:00Z');
    await reveal(deps, org, groupId);
    const r = await getReveal(deps, m, groupId);
    const giver = (await deps.assignments.findByReceiver(groupId, m))?.giverId;
    expect(r.myGiver?.id).toBe(giver);
    expect(r.pairs).toHaveLength(4);
    expect(deps.notifications.sent.at(-1)?.event.type).toBe('revealed');
  });
  it('a non participant has no giver', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await setOrganizerParticipation(deps, org, groupId, false);
    await runDraw(deps, org, groupId);
    deps.clock.current = new Date('2026-12-20T15:00:00Z');
    await reveal(deps, org, groupId);
    expect((await getReveal(deps, org, groupId)).myGiver).toBeNull();
  });
});
