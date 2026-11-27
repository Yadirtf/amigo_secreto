import { describe, expect, it } from 'vitest';
import {
  ChatThread,
  CreateGroupRequest,
  JoinRequest,
  PushTokenRequest,
  UpdateMeRequest,
} from '../src/index.js';

describe('contracts', () => {
  it('rejects NoSQL operator injection and unknown keys', () => {
    expect(JoinRequest.safeParse({ code: { $ne: null } }).success).toBe(false);
    expect(JoinRequest.safeParse({ code: 'ABCDE-FGHJK', $where: '1' }).success).toBe(false);
    expect(JoinRequest.safeParse({ code: '{"$gt":""}' }).success).toBe(false);
    expect(JoinRequest.safeParse({ code: 'abcde-fghjk' }).success).toBe(true);
  });
  it('applies defaults for group creation', () => {
    const r = CreateGroupRequest.parse({
      name: 'Oficina',
      deliveryDate: '2026-12-20',
      budgetCop: 50000,
    });
    expect(r).toMatchObject({ photo: null, organizerParticipates: true });
    expect(
      CreateGroupRequest.safeParse({ name: 'Oficina', deliveryDate: '20/12/2026', budgetCop: null })
        .success,
    ).toBe(false);
  });
  it('validates photos and push tokens', () => {
    expect(UpdateMeRequest.safeParse({ photo: 'javascript:alert(1)' }).success).toBe(false);
    expect(PushTokenRequest.safeParse({ token: 'ExponentPushToken[abc123]' }).success).toBe(true);
    expect(PushTokenRequest.safeParse({ token: 'https://evil' }).success).toBe(false);
  });
  it('chat thread output is strict: extra fields like giverId fail', () => {
    const base = { side: 'receiver', counterpart: null, blocked: false, hasMore: false };
    expect(ChatThread.safeParse({ ...base, messages: [] }).success).toBe(true);
    expect(ChatThread.safeParse({ ...base, messages: [], giverId: 'x' }).success).toBe(false);
    expect(
      ChatThread.safeParse({
        ...base,
        messages: [
          { id: '1', mine: false, text: 'hola', createdAt: '2026-12-01T10:00:00.000Z', from: 'u1' },
        ],
      }).success,
    ).toBe(false);
  });
});
