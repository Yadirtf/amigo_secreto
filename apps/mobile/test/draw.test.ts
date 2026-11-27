import type { GroupDetail, MemberView } from '@entre-nos/contracts';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../src/api/client';
import { drawErrorMessage, missingForDraw, purgeDate } from '../src/features/groups/draw';

const member = (id: string, name: string, participates = true): MemberView => ({
  id,
  name,
  photo: null,
  participates,
  isOrganizer: id === 'a',
  isMe: id === 'a',
});

const group = (members: MemberView[]): GroupDetail => ({
  id: 'g1',
  name: 'Oficina',
  photo: null,
  deliveryDate: '2026-12-18',
  daysLeft: 21,
  status: 'open',
  memberCount: members.length,
  isOrganizer: true,
  budgetCop: 50000,
  inviteCode: 'ABCDE23456',
  inviteExpiresAt: '2027-01-01T00:00:00.000Z',
  members,
  exclusions: [],
  drawCount: 0,
  drawnAt: null,
  revealedAt: null,
  canDraw: true,
  memberLimit: 100,
  redrawsLeft: 3,
});

describe('draw helpers', () => {
  const g = group([member('a', 'Laura'), member('b', 'Carlos'), member('c', 'Ana', false)]);

  it('counts only participants for the minimum of 3', () => {
    expect(missingForDraw(g)).toBe(1);
  });

  it('names the blocking person from details.blocking', () => {
    const e = new ApiRequestError({
      code: 'DRAW_IMPOSSIBLE',
      status: 409,
      details: { blocking: ['b'] },
    });
    expect(drawErrorMessage(e, g)).toContain('Carlos no tiene a quién regalarle');
  });

  it('falls back to the generic copy without names', () => {
    const e = new ApiRequestError({ code: 'DRAW_IMPOSSIBLE', status: 409 });
    expect(drawErrorMessage(e, g)).toContain('Hay demasiadas exclusiones para un grupo de 2');
  });

  it('reassures on network errors (nothing half-done)', () => {
    const e = new ApiRequestError({ code: 'NETWORK', status: 0 });
    expect(drawErrorMessage(e, g)).toContain('no quedó nada a medias');
  });

  it('computes the purge date 60 days after delivery', () => {
    expect(purgeDate(g)).toBe('2027-02-16');
  });
});
