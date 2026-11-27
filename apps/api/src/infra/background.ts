/**
 * Work that must not delay the HTTP response (push delivery). Collected per
 * request and handed to `ctx.waitUntil` by the app middleware.
 */
let pending: Promise<unknown>[] = [];

export function runInBackground(task: Promise<unknown>): void {
  pending.push(task.catch(() => undefined));
}

export function drainBackground(): Promise<unknown> | null {
  if (pending.length === 0) return null;
  const all = Promise.all(pending);
  pending = [];
  return all;
}
