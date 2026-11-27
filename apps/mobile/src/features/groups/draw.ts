import type { GroupDetail } from '@entre-nos/contracts';
import { MIN_PARTICIPANTS } from '@entre-nos/domain';
import { isApiError } from '../../api/client';
import { errorCode, errorMessage } from '../../lib/errors';
import { create } from 'zustand';
import { addDays } from '../../lib/dates';

/** Server policy: group data is deleted 60 days after delivery (domain `retentionDays`). */
export const RETENTION_DAYS = 60;

export function purgeDate(g: Pick<GroupDetail, 'deliveryDate'>): string {
  return addDays(g.deliveryDate, RETENTION_DAYS);
}

export function participantsOf(g: GroupDetail) {
  return g.members.filter((m) => m.participates);
}

export function missingForDraw(g: GroupDetail): number {
  return Math.max(0, MIN_PARTICIPANTS - participantsOf(g).length);
}

/** Copy for a failed draw/redraw (flujos S7), resolving `details.blocking` ids to names. */
export function drawErrorMessage(e: unknown, g: GroupDetail): string {
  const code = errorCode(e);
  let blockingName: string | undefined;
  if (code === 'DRAW_IMPOSSIBLE' && isApiError(e)) {
    const ids = e.details?.blocking;
    if (Array.isArray(ids)) {
      const first = ids.find((x): x is string => typeof x === 'string');
      blockingName = g.members.find((m) => m.id === first)?.name;
    }
  }
  return errorMessage(e, 'draw', {
    blockingName,
    memberCount: participantsOf(g).length,
    missing: missingForDraw(g) || 1,
  });
}

export interface DrawNotice {
  message: string;
  reviewExclusions: boolean;
}

interface DrawNoticeState {
  /** groupId → error copy shown as a Banner on S5 after a failed draw. */
  notices: Record<string, DrawNotice | undefined>;
  set: (groupId: string, notice: DrawNotice | null) => void;
}

/** In-memory hand-off from S7 (animation) back to S5 when the draw fails. */
export const useDrawNotice = create<DrawNoticeState>((set) => ({
  notices: {},
  set: (groupId, notice) =>
    set((s) => ({ notices: { ...s.notices, [groupId]: notice ?? undefined } })),
}));
