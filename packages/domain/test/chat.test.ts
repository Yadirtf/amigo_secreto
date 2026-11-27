import { describe, expect, it } from 'vitest';
import {
  listMessages,
  MAX_THREAD_MESSAGES_PER_HOUR,
  reportThread,
  runDraw,
  sendMessage,
  setGiverBlocked,
} from '../src/index.js';
import { groupWith, user } from './helpers.js';

async function drawn() {
  const ctx = await groupWith(4);
  await runDraw(ctx.deps, ctx.org, ctx.groupId);
  const a = await ctx.deps.assignments.findByGiver(ctx.groupId, ctx.org);
  return { ...ctx, receiver: a?.receiverId as string, threadId: a?.id as string };
}

describe('anonymous chat', () => {
  it('giver writes, receiver reads without any giver identity', async () => {
    const { deps, org, groupId, receiver } = await drawn();
    await sendMessage(deps, org, groupId, 'giver', '¿Qué talla de camisa usas?');
    deps.clock.advanceDays(0.01);
    await sendMessage(deps, receiver, groupId, 'receiver', 'Talla M 😊');

    const giverView = await listMessages(deps, org, groupId, 'giver');
    expect(giverView.counterpart?.id).toBe(receiver);
    expect(giverView.messages.map((m) => [m.mine, m.text])).toEqual([
      [false, 'Talla M 😊'],
      [true, '¿Qué talla de camisa usas?'],
    ]);

    expect(giverView.messages[0]?.createdAt).toMatch(/:00\.000Z$/);
    const receiverView = await listMessages(deps, receiver, groupId, 'receiver');
    expect(receiverView.counterpart).toBeNull();
    const json = JSON.stringify(receiverView);
    expect(json).not.toContain(org);
    expect(json).not.toMatch(/giver|userId|threadId/);
    expect(receiverView.messages.map((m) => m.mine)).toEqual([true, false]);
  });

  it('notifications reveal no identity: only side and group', async () => {
    const { deps, org, groupId, receiver } = await drawn();
    deps.notifications.sent = [];
    await sendMessage(deps, org, groupId, 'giver', 'Hola');
    expect(deps.notifications.sent).toEqual([
      {
        userIds: [receiver],
        event: { type: 'new_message', groupId, groupName: 'Oficina 2026', side: 'receiver' },
      },
    ]);
    await sendMessage(deps, receiver, groupId, 'receiver', 'Hola!');
    expect(deps.notifications.sent[1]?.userIds).toEqual([org]);
    expect(deps.notifications.sent[1]?.event).toMatchObject({ side: 'giver' });
  });

  it('paginates newest first', async () => {
    const { deps, org, groupId } = await drawn();
    for (let i = 0; i < 5; i++) {
      await sendMessage(deps, org, groupId, 'giver', `m${i}`);
      deps.clock.advanceDays(0.001);
    }
    const p1 = await listMessages(deps, org, groupId, 'giver', { limit: 2 });
    expect(p1.messages.map((m) => m.text)).toEqual(['m4', 'm3']);
    expect(p1.hasMore).toBe(true);
    const p2 = await listMessages(deps, org, groupId, 'giver', {
      limit: 10,
      before: new Date(p1.messages[1]?.createdAt as string),
    });
    expect(p2.messages.map((m) => m.text)).toEqual(['m2', 'm1', 'm0']);
    expect(p2.hasMore).toBe(false);
  });

  it('requires membership and a draw', async () => {
    const ctx = await groupWith(3);
    await expect(listMessages(ctx.deps, ctx.org, ctx.groupId, 'giver')).rejects.toMatchObject({
      code: 'DRAW_NOT_DONE',
    });
    await runDraw(ctx.deps, ctx.org, ctx.groupId);
    const stranger = await user(ctx.deps, 'stranger');
    await expect(sendMessage(ctx.deps, stranger, ctx.groupId, 'giver', 'x')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('receiver can pause the giver; giver gets CHAT_BLOCKED but can still read', async () => {
    const { deps, org, groupId, receiver } = await drawn();
    await setGiverBlocked(deps, receiver, groupId, true);
    await expect(sendMessage(deps, org, groupId, 'giver', 'hola')).rejects.toMatchObject({
      code: 'CHAT_BLOCKED',
    });
    expect((await listMessages(deps, org, groupId, 'giver')).blocked).toBe(true);
    await sendMessage(deps, receiver, groupId, 'receiver', 'sigo aquí');
    await setGiverBlocked(deps, receiver, groupId, false);
    await sendMessage(deps, org, groupId, 'giver', 'gracias');
  });

  it('validates text and rate limits per thread', async () => {
    const { deps, org, groupId } = await drawn();
    await expect(sendMessage(deps, org, groupId, 'giver', '   ')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(sendMessage(deps, org, groupId, 'giver', 'x'.repeat(501))).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    for (let i = 0; i < MAX_THREAD_MESSAGES_PER_HOUR; i++)
      await sendMessage(deps, org, groupId, 'giver', `${i}`);
    await expect(sendMessage(deps, org, groupId, 'giver', 'one more')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('stores reports without exposing them', async () => {
    const { deps, groupId, receiver, threadId } = await drawn();
    await reportThread(deps, receiver, groupId, 'receiver', { messageId: null, reason: '' });
    await reportThread(deps, receiver, groupId, 'receiver', {
      messageId: 'm1',
      reason: 'Groserías',
    });
    expect(deps.reports.data.map((r) => [r.threadId, r.reason])).toEqual([
      [threadId, 'Sin motivo'],
      [threadId, 'Groserías'],
    ]);
  });
});
