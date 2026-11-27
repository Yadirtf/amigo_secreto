/**
 * Work that must not delay the HTTP response (push delivery). One queue per
 * request: the app middleware hands it to `ctx.waitUntil` and only then
 * closes that request's database connection.
 */
export class BackgroundQueue {
  private pending: Promise<unknown>[] = [];

  run(task: Promise<unknown>): void {
    this.pending.push(task.catch(() => undefined));
  }

  drain(): Promise<unknown> | null {
    if (this.pending.length === 0) return null;
    const all = Promise.all(this.pending);
    this.pending = [];
    return all;
  }
}
