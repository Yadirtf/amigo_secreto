import type { Deps } from '../ports.js';
import { cloneGroup, daysBetween } from './shared.js';

/**
 * Scheduled jobs (run by a cron trigger once a day).
 */

/** Reveals drawn groups automatically the day after delivery if the organizer didn't. */
export async function autoReveal(
  deps: Pick<Deps, 'groups' | 'clock' | 'notifications'>,
): Promise<number> {
  const now = deps.clock.now();
  const cutoff = new Date(now.getTime() - 86_400_000);
  const pending = await deps.groups.listPendingAutoReveal(cutoff);
  let count = 0;
  for (const g of pending) {
    const next = cloneGroup(g);
    next.status = 'revealed';
    next.revealedAt = now;
    next.version = g.version + 1;
    if (await deps.groups.save(next)) {
      count++;
      await deps.notifications.notify(
        g.members.map((m) => m.userId),
        { type: 'revealed', groupId: g.id, groupName: g.name },
      );
    }
  }
  return count;
}

/** Deletes groups, assignments, chats and wishlists N days after delivery. */
export async function purgeExpired(
  deps: Pick<Deps, 'groups' | 'assignments' | 'messages' | 'wishlists' | 'clock' | 'policy'>,
): Promise<number> {
  const cutoff = new Date(deps.clock.now().getTime() - deps.policy.retentionDays * 86_400_000);
  const ids = await deps.groups.listDeliveredBefore(cutoff);
  for (const id of ids) {
    await deps.assignments.deleteForGroup(id);
    await deps.messages.deleteForGroup(id);
    await deps.wishlists.deleteForGroup(id);
    await deps.groups.delete(id);
  }
  return ids.length;
}

/** Days before delivery on which members get a countdown reminder. */
export const COUNTDOWN_DAYS = [7, 3, 1, 0] as const;

export async function sendCountdowns(
  deps: Pick<Deps, 'groups' | 'clock' | 'notifications'>,
): Promise<number> {
  const now = deps.clock.now();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const groups = await deps.groups.listDrawnDeliveringBetween(
    today,
    new Date(today.getTime() + 8 * 86_400_000),
  );
  let sent = 0;
  for (const g of groups) {
    if (g.status !== 'drawn') continue;
    const daysLeft = daysBetween(now, g.deliveryDate);
    if (!(COUNTDOWN_DAYS as readonly number[]).includes(daysLeft)) continue;
    await deps.notifications.notify(
      g.members.map((m) => m.userId),
      { type: 'countdown', groupId: g.id, groupName: g.name, daysLeft },
    );
    sent++;
  }
  return sent;
}
