import { describe, expect, it } from 'vitest';
import {
  autoReveal,
  getMyWishlist,
  purgeExpired,
  putMyWishlist,
  runDraw,
  sendCountdowns,
} from '../src/index.js';
import { groupWith, user } from './helpers.js';

describe('wishlist', () => {
  it('replaces items, keeps valid ids and generates the rest', async () => {
    const { deps, org, groupId } = await groupWith(0);
    expect(await getMyWishlist(deps, org, groupId)).toEqual([]);
    const items = await putMyWishlist(deps, org, groupId, [
      {
        id: 'keep-1',
        text: ' Un libro de García Márquez ',
        link: 'https://buscalibre.com.co/x',
        size: '',
      },
      { id: 'keep-1', text: 'Duplicado' },
      { id: '{"$gt":""}', text: 'Camiseta', size: ' L ' },
    ]);
    expect(items[0]).toEqual({
      id: 'keep-1',
      text: 'Un libro de García Márquez',
      link: 'https://buscalibre.com.co/x',
      size: null,
    });
    expect(items[1]?.id).not.toBe('keep-1');
    expect(items[2]).toMatchObject({ text: 'Camiseta', size: 'L', link: null });
    expect(items[2]?.id).not.toContain('$');
    expect(await getMyWishlist(deps, org, groupId)).toEqual(items);
  });
  it('validates and requires membership', async () => {
    const { deps, org, groupId } = await groupWith(0);
    await expect(
      putMyWishlist(deps, org, groupId, [{ text: 'x', link: 'javascript:alert(1)' }]),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    const many = Array.from({ length: 21 }, () => ({ text: 'x' }));
    await expect(putMyWishlist(deps, org, groupId, many)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    const s = await user(deps, 's');
    await expect(getMyWishlist(deps, s, groupId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('maintenance jobs', () => {
  it('auto reveals drawn groups the day after delivery', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    deps.clock.current = new Date('2026-12-20T12:00:00Z');
    expect(await autoReveal(deps)).toBe(0);
    deps.clock.current = new Date('2026-12-21T12:00:00Z');
    expect(await autoReveal(deps)).toBe(1);
    expect((await deps.groups.findById(groupId))?.status).toBe('revealed');
    deps.groups.failNextSaves = 0;
  });
  it('skips a group when a concurrent save wins', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    deps.clock.current = new Date('2026-12-22T12:00:00Z');
    deps.groups.failNextSaves = 1;
    expect(await autoReveal(deps)).toBe(0);
  });
  it('purges everything N days after delivery', async () => {
    const { deps, org, groupId } = await groupWith(3);
    await runDraw(deps, org, groupId);
    await putMyWishlist(deps, org, groupId, [{ text: 'x' }]);
    deps.clock.current = new Date('2027-02-15T00:00:00Z');
    expect(await purgeExpired(deps)).toBe(0);
    deps.clock.current = new Date('2027-02-19T00:00:01Z');
    expect(await purgeExpired(deps)).toBe(1);
    expect(await deps.groups.findById(groupId)).toBeNull();
    expect(deps.assignments.data.size).toBe(0);
    expect(deps.wishlists.data.size).toBe(0);
  });
  it('sends countdowns on 7, 3, 1 and 0 days left', async () => {
    const { deps, org, groupId } = await groupWith(3);
    expect(await sendCountdowns(deps)).toBe(0); // not drawn
    await runDraw(deps, org, groupId);
    const sentOn: number[] = [];
    for (let day = 10; day <= 20; day++) {
      deps.clock.current = new Date(`2026-12-${String(day).padStart(2, '0')}T13:00:00Z`);
      if ((await sendCountdowns(deps)) > 0) sentOn.push(day);
    }
    expect(sentOn).toEqual([13, 17, 19, 20]);
    expect(deps.notifications.sent.at(-1)?.event).toMatchObject({ type: 'countdown', daysLeft: 0 });
  });
});
