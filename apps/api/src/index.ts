import { autoReveal, purgeExpired, sendCountdowns } from '@entre-nos/domain';
import { containerFromEnv, type WorkerEnv } from './container.js';
import { createApp } from './http/app.js';

const app = createApp((c) => containerFromEnv(c.env as WorkerEnv));

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const { deps } = await containerFromEnv(env);
        const sent = await sendCountdowns(deps);
        const revealed = await autoReveal(deps);
        const purged = await purgeExpired(deps);
        console.log(`cron countdowns=${sent} revealed=${revealed} purged=${purged}`);
      })(),
    );
  },
} satisfies ExportedHandler<WorkerEnv>;
