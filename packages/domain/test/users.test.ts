import { describe, expect, it } from 'vitest';
import {
  deleteAccount,
  DomainError,
  getGroup,
  getMe,
  putMyWishlist,
  runDraw,
  signInWithProvider,
  updateProfile,
} from '../src/index.js';
import { memoryDeps } from '../src/testing/memory.js';
import { groupWith, user } from './helpers.js';

describe('signInWithProvider', () => {
  it('creates once and then finds the same user', async () => {
    const deps = memoryDeps();
    const a = await signInWithProvider(deps, {
      provider: 'google',
      sub: 's1',
      email: 'ana@x.co',
      name: '  Ana  ',
    });
    expect(a.isNew).toBe(true);
    expect(a.user.name).toBe('Ana');
    const b = await signInWithProvider(deps, {
      provider: 'google',
      sub: 's1',
      email: null,
      name: null,
    });
    expect(b.isNew).toBe(false);
    expect(b.user.id).toBe(a.user.id);
  });
  it('falls back to email prefix or "Amigo" and supports apple', async () => {
    const deps = memoryDeps();
    const a = await signInWithProvider(deps, {
      provider: 'apple',
      sub: 'x',
      email: 'pepe@x.co',
      name: null,
    });
    expect(a.user.name).toBe('pepe');
    expect(a.user.appleSub).toBe('x');
    const b = await signInWithProvider(deps, {
      provider: 'apple',
      sub: 'y',
      email: null,
      name: '',
    });
    expect(b.user.name).toBe('Amigo');
    await expect(
      signInWithProvider(deps, { provider: 'google', sub: '', email: null, name: null }),
    ).rejects.toThrow(DomainError);
  });
});

describe('profile', () => {
  it('reads and updates name/photo', async () => {
    const deps = memoryDeps();
    const id = await user(deps, 'ana');
    expect((await getMe(deps, id)).name).toBe('ana');
    const me = await updateProfile(deps, id, {
      name: ' Ana María ',
      photo: 'data:image/jpeg;base64,AA==',
    });
    expect(me).toMatchObject({ name: 'Ana María', photo: 'data:image/jpeg;base64,AA==' });
    expect((await updateProfile(deps, id, {})).name).toBe('Ana María');
  });
  it('fails for unknown users', async () => {
    const deps = memoryDeps();
    await expect(getMe(deps, 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(updateProfile(deps, 'nope', { name: 'x' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('deleteAccount', () => {
  it('removes membership from open groups and transfers organizer role', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    await putMyWishlist(deps, org, groupId, [{ text: 'Libro' }]);
    await deleteAccount(deps, org);
    const view = await getGroup(deps, members[0] as string, groupId);
    expect(view.members.map((m) => m.id)).not.toContain(org);
    expect(view.members.find((m) => m.isOrganizer)?.id).toBe(members[0]);
    expect(await deps.wishlists.get(groupId, org)).toBeNull();
    expect(await deps.users.findById(org)).toBeNull();
  });
  it('keeps the slot in drawn groups and shows "Participante"', async () => {
    const { deps, org, groupId, members } = await groupWith(3);
    await runDraw(deps, org, groupId);
    const gone = members[1] as string;
    await deleteAccount(deps, gone);
    const view = await getGroup(deps, org, groupId);
    expect(view.members.find((m) => m.id === gone)?.name).toBe('Participante');
  });
  it('deletes groups left empty', async () => {
    const deps = memoryDeps();
    const { groupId, org, deps: d } = await groupWith(0);
    await deleteAccount(d, org);
    expect(await d.groups.findById(groupId)).toBeNull();
    expect(deps).toBeTruthy();
  });
});
