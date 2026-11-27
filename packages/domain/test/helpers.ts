import { createGroup, joinGroup, signInWithProvider } from '../src/index.js';
import { memoryDeps, type MemoryDeps } from '../src/testing/memory.js';

export async function user(deps: MemoryDeps, name: string) {
  const { user } = await signInWithProvider(deps, {
    provider: 'google',
    sub: `sub-${name}`,
    email: `${name}@example.com`,
    name,
  });
  return user.id;
}

/** Organizer + N members already joined. */
export async function groupWith(n: number, opts: Parameters<typeof memoryDeps>[0] = {}) {
  const deps = memoryDeps(opts);
  const org = await user(deps, 'org');
  const g = await createGroup(deps, org, {
    name: 'Oficina 2026',
    deliveryDate: new Date('2026-12-20'),
    budgetCop: 50_000,
    photo: null,
    organizerParticipates: true,
  });
  const members: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = await user(deps, `m${i}`);
    await joinGroup(deps, id, g.inviteCode);
    members.push(id);
  }
  return { deps, org, groupId: g.id, code: g.inviteCode, members, all: [org, ...members] };
}
