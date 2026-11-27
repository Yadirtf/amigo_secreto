import { describe, expect, it } from 'vitest';
import { harness } from './harness.js';

const futureDay = () => {
  const d = new Date(Date.now() + 20 * 86_400_000);
  return d.toISOString().slice(0, 10);
};

async function setupGroup(n = 3) {
  const h = harness();
  const org = await h.login('org', 'Organizadora');
  const created = await h.call('POST', '/v1/groups', {
    token: org.accessToken,
    body: { name: 'Oficina', deliveryDate: futureDay(), budgetCop: 50_000 },
  });
  expect(created.status).toBe(201);
  const groupId = created.json.id as string;
  const code = created.json.inviteCode as string;
  const members = [];
  for (let i = 0; i < n; i++) {
    const m = await h.login(`m${i}`, `Miembro ${i}`);
    const j = await h.call('POST', '/v1/groups/join', { token: m.accessToken, body: { code } });
    expect(j.status).toBe(200);
    members.push(m);
  }
  return { h, org, groupId, code, members, everyone: [org, ...members] };
}

describe('auth', () => {
  it('signs in with Google and returns a session', async () => {
    const h = harness();
    const r = await h.call('POST', '/v1/auth/google', {
      body: { idToken: 'google-test-token:abc:Ana' },
    });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ isNew: true, user: { name: 'Ana', email: 'abc@example.com' } });
    const me = await h.call('GET', '/v1/me', { token: r.json.accessToken });
    expect(me.json.name).toBe('Ana');
  });
  it('rejects bad Google tokens and missing/forged access tokens', async () => {
    const h = harness();
    expect(
      (await h.call('POST', '/v1/auth/google', { body: { idToken: 'x'.repeat(30) } })).status,
    ).toBe(401);
    expect((await h.call('GET', '/v1/me')).status).toBe(401);
    expect(
      (await h.call('GET', '/v1/me', { token: ['eyJhbGciOiJub25lIn0', 'e30', ''].join('.') }))
        .status,
    ).toBe(401);
    const r = await h.call('GET', '/v1/me', { token: 'nope' });
    expect(r.json.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: expect.stringContaining('sesión'),
    });
  });
  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const h = harness();
    const s = await h.login('u1');
    const r1 = await h.call('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } });
    expect(r1.status).toBe(200);
    expect(r1.json.refreshToken).not.toBe(s.refreshToken);
    // Reuse right away (parallel request): refused but not revoked.
    expect(
      (await h.call('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } })).status,
    ).toBe(401);
    expect((await h.call('GET', '/v1/me', { token: r1.json.accessToken })).status).toBe(200);
    // Reuse after the grace window: whole family revoked (stolen token).
    const session = [...h.sessions.data.values()][0]!;
    session.rotatedAt = new Date(Date.now() - 60_000);
    expect(
      (await h.call('POST', '/v1/auth/refresh', { body: { refreshToken: s.refreshToken } })).status,
    ).toBe(401);
    expect((await h.call('GET', '/v1/me', { token: r1.json.accessToken })).status).toBe(401);
    expect(
      (await h.call('POST', '/v1/auth/refresh', { body: { refreshToken: r1.json.refreshToken } }))
        .status,
    ).toBe(401);
  });
  it('logout revokes the session', async () => {
    const h = harness();
    const s = await h.login('u1');
    expect(
      (
        await h.call('POST', '/v1/auth/logout', {
          token: s.accessToken,
          body: { refreshToken: s.refreshToken },
        })
      ).status,
    ).toBe(200);
    expect((await h.call('GET', '/v1/me', { token: s.accessToken })).status).toBe(401);
  });
  it('dev login works only with the key and never in production', async () => {
    const h = harness();
    const bad = await h.call('POST', '/v1/auth/dev', {
      body: { key: 'wrong-key-wrong-key', name: 'Tester' },
    });
    expect(bad.status).toBe(401);
    const good = await h.call('POST', '/v1/auth/dev', {
      body: { key: 'dev-login-key-for-tests', name: 'Tester' },
    });
    expect(good.status).toBe(200);
    const prod = harness({ appEnv: 'production' });
    expect(
      (
        await prod.call('POST', '/v1/auth/dev', {
          body: { key: 'dev-login-key-for-tests', name: 'Tester' },
        })
      ).status,
    ).toBe(404);
    const noKey = harness({ devLoginKey: null });
    expect(
      (
        await noKey.call('POST', '/v1/auth/dev', {
          body: { key: 'dev-login-key-for-tests', name: 'T' },
        })
      ).status,
    ).toBe(404);
  });
  it('rate limits sign in attempts per IP', async () => {
    const h = harness();
    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = (
        await h.call('POST', '/v1/auth/google', {
          body: { idToken: 'google-test-token:x:y' },
          headers: { 'cf-connecting-ip': '1.2.3.4' },
        })
      ).status;
    }
    expect(last).toBe(429);
  });
});

describe('security: input handling', () => {
  it('rejects NoSQL operators, unknown keys and malformed JSON with INVALID_INPUT', async () => {
    const { h, members } = await setupGroup(0);
    const t = (await h.login('x')).accessToken;
    for (const body of [
      { code: { $ne: null } },
      { code: 'ABCDE-FGHJK', $where: '1' },
      '{bad json',
    ]) {
      const r = await h.call('POST', '/v1/groups/join', { token: t, body });
      expect(r.status).toBe(400);
      expect(r.json.error.code).toBe('INVALID_INPUT');
    }
    expect(members).toEqual([]);
  });
  it('rejects browser requests (Origin header) — no CORS', async () => {
    const h = harness();
    const s = await h.login('u');
    const r = await h.call('GET', '/v1/me', {
      token: s.accessToken,
      headers: { origin: 'https://evil.example' },
    });
    expect(r.status).toBe(403);
  });
  it('limits body size', async () => {
    const h = harness();
    const s = await h.login('u');
    const r = await h.call('PATCH', '/v1/me', {
      token: s.accessToken,
      body: { name: 'x'.repeat(200_000) },
    });
    expect(r.status).toBe(400);
  });
  it('sets security headers and no-store', async () => {
    const h = harness();
    const s = await h.login('u');
    const r = await h.call('GET', '/v1/me', { token: s.accessToken });
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('rate limits join attempts (code enumeration)', async () => {
    const h = harness();
    const t = (await h.login('u')).accessToken;
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await h.call('POST', '/v1/groups/join', { token: t, body: { code: 'ABCDE-FGHJK' } }))
          .status,
      );
    }
    expect(statuses.slice(0, 10).every((s) => s === 404)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe('security: object level authorization (IDOR/BOLA)', () => {
  it('a member of group A cannot touch group B', async () => {
    const a = await setupGroup(3);
    const outsider = await a.h.login('outsider');
    const t = outsider.accessToken;
    const id = a.groupId;
    const attempts: [string, string, unknown?][] = [
      ['GET', `/v1/groups/${id}`],
      ['PATCH', `/v1/groups/${id}`, { name: 'Hack' }],
      ['DELETE', `/v1/groups/${id}`],
      ['POST', `/v1/groups/${id}/invite/rotate`],
      ['PUT', `/v1/groups/${id}/exclusions`, { exclusions: [] }],
      ['POST', `/v1/groups/${id}/draw`],
      ['GET', `/v1/groups/${id}/assignment`],
      ['GET', `/v1/groups/${id}/wishlist`],
      ['PUT', `/v1/groups/${id}/wishlist`, { items: [] }],
      ['GET', `/v1/groups/${id}/chat/giver`],
      ['GET', `/v1/groups/${id}/chat/receiver`],
      ['POST', `/v1/groups/${id}/chat/giver/messages`, { text: 'hola' }],
      ['GET', `/v1/groups/${id}/reveal`],
      ['DELETE', `/v1/groups/${id}/members/${a.members[0]!.user.id}`],
    ];
    for (const [method, path, body] of attempts) {
      const r = await a.h.call(method, path, { token: t, body });
      expect(r.status, `${method} ${path}`).toBe(404);
    }
  });
  it('members cannot use organizer actions', async () => {
    const { h, groupId, members } = await setupGroup(3);
    const t = members[0]!.accessToken;
    for (const [method, path, body] of [
      ['PATCH', `/v1/groups/${groupId}`, { name: 'Hack' }],
      ['POST', `/v1/groups/${groupId}/draw`, undefined],
      ['PUT', `/v1/groups/${groupId}/exclusions`, { exclusions: [] }],
      ['DELETE', `/v1/groups/${groupId}/members/${members[1]!.user.id}`, undefined],
    ] as const) {
      expect((await h.call(method, path, { token: t, body })).status).toBe(403);
    }
  });
});

describe('end to end flow', () => {
  it('draw → assignment → wishlist → anonymous chat → reveal', async () => {
    const { h, org, groupId, everyone } = await setupGroup(3);
    const draw = await h.call('POST', `/v1/groups/${groupId}/draw`, { token: org.accessToken });
    expect(draw.status).toBe(200);
    expect(draw.json.status).toBe('drawn');

    // Each one sees exactly their own recipient.
    const byId = new Map(everyone.map((p) => [p.user.id, p]));
    const recipientOf = new Map<string, string>();
    for (const p of everyone) {
      const a = await h.call('GET', `/v1/groups/${groupId}/assignment`, { token: p.accessToken });
      expect(a.status).toBe(200);
      expect(a.json.recipient.id).not.toBe(p.user.id);
      recipientOf.set(p.user.id, a.json.recipient.id);
    }
    expect(new Set(recipientOf.values()).size).toBe(4);

    // Group detail never leaks assignments, even to the organizer.
    const detail = await h.call('GET', `/v1/groups/${groupId}`, { token: org.accessToken });
    expect(detail.text).not.toMatch(/receiver|giver|recipient/i);

    // Recipient adds a wish; the giver sees it.
    const recipient = byId.get(recipientOf.get(org.user.id)!)!;
    await h.call('PUT', `/v1/groups/${groupId}/wishlist`, {
      token: recipient.accessToken,
      body: { items: [{ text: 'Unas medias navideñas', size: 'M' }] },
    });
    const a = await h.call('GET', `/v1/groups/${groupId}/assignment`, { token: org.accessToken });
    expect(a.json.wishlist[0].text).toBe('Unas medias navideñas');

    // Anonymous chat: receiver side never contains the giver id.
    const sent = await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
      token: org.accessToken,
      body: { text: '¿Qué color te gusta?' },
    });
    expect(sent.status).toBe(201);
    const inbox = await h.call('GET', `/v1/groups/${groupId}/chat/receiver`, {
      token: recipient.accessToken,
    });
    expect(inbox.status).toBe(200);
    expect(inbox.json.messages[0]).toMatchObject({ mine: false, text: '¿Qué color te gusta?' });
    expect(inbox.json.counterpart).toBeNull();
    expect(inbox.text).not.toContain(org.user.id);
    h.deps.clock.advanceDays(0.001);
    const reply = await h.call('POST', `/v1/groups/${groupId}/chat/receiver/messages`, {
      token: recipient.accessToken,
      body: { text: 'El verde 💚' },
    });
    expect(reply.status).toBe(201);
    const outbox = await h.call('GET', `/v1/groups/${groupId}/chat/giver?limit=10`, {
      token: org.accessToken,
    });
    expect(outbox.json.messages.map((m: { text: string }) => m.text)).toEqual([
      'El verde 💚',
      '¿Qué color te gusta?',
    ]);

    // Reveal is locked until the delivery day.
    const early = await h.call('POST', `/v1/groups/${groupId}/reveal`, {
      token: org.accessToken,
      body: { confirm: true },
    });
    expect(early.status).toBe(409);
    expect(early.json.error.code).toBe('NOT_REVEALED');
  });

  it('impossible draws explain who blocks it', async () => {
    const { h, org, groupId, members } = await setupGroup(2);
    await h.call('PUT', `/v1/groups/${groupId}/exclusions`, {
      token: org.accessToken,
      body: { exclusions: [[org.user.id, members[0]!.user.id]] },
    });
    const r = await h.call('POST', `/v1/groups/${groupId}/draw`, { token: org.accessToken });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('DRAW_IMPOSSIBLE');
    expect(r.json.error.details.blocking.length).toBeGreaterThan(0);
    expect(r.json.error.message).toMatch(/exclusiones/);
  });

  it('redraw and reopen need explicit confirmation', async () => {
    const { h, org, groupId } = await setupGroup(3);
    await h.call('POST', `/v1/groups/${groupId}/draw`, { token: org.accessToken });
    expect(
      (await h.call('POST', `/v1/groups/${groupId}/redraw`, { token: org.accessToken, body: {} }))
        .status,
    ).toBe(400);
    const r = await h.call('POST', `/v1/groups/${groupId}/redraw`, {
      token: org.accessToken,
      body: { confirm: true },
    });
    expect(r.json.drawCount).toBe(2);
    const o = await h.call('POST', `/v1/groups/${groupId}/reopen`, {
      token: org.accessToken,
      body: { confirm: true },
    });
    expect(o.json.status).toBe('open');
  });

  it('invite preview, push token, profile and account deletion', async () => {
    const { h, code } = await setupGroup(1);
    const s = await h.login('newbie', 'Nuevo');
    const p = await h.call('GET', `/v1/invites/${code}`, { token: s.accessToken });
    expect(p.json).toMatchObject({
      name: 'Oficina',
      organizerName: 'Organizadora',
      alreadyMember: false,
    });
    expect((await h.call('GET', '/v1/invites/%24ne', { token: s.accessToken })).status).toBe(404);
    expect(
      (
        await h.call('PUT', '/v1/me/push-token', {
          token: s.accessToken,
          body: { token: 'ExponentPushToken[abc]' },
        })
      ).status,
    ).toBe(200);
    expect(h.pushTokens.data.get('ExponentPushToken[abc]')).toBe(s.user.id);
    const me = await h.call('PATCH', '/v1/me', {
      token: s.accessToken,
      body: { name: 'Nuevo Nombre' },
    });
    expect(me.json.name).toBe('Nuevo Nombre');
    // Needs a fresh Google sign-in of the same account (PT-08).
    expect((await h.call('DELETE', '/v1/me', { token: s.accessToken, body: {} })).status).toBe(401);
    expect(
      (
        await h.call('DELETE', '/v1/me', {
          token: s.accessToken,
          body: { idToken: 'google-test-token:other:X' },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await h.call('DELETE', '/v1/me', {
          token: s.accessToken,
          body: { idToken: 'google-test-token:newbie:Nuevo' },
        })
      ).status,
    ).toBe(200);
    expect(h.pushTokens.data.size).toBe(0);
    expect((await h.call('GET', '/v1/me', { token: s.accessToken })).status).toBe(401);
  });
});

describe('public pages', () => {
  it('serves the invite landing without touching data and escapes input', async () => {
    const h = harness();
    const r = await h.call('GET', '/i/abcde-fghjk');
    expect(r.status).toBe(200);
    expect(r.text).toContain('ABCDE-FGHJK');
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");
    const x = await h.call('GET', '/i/%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    expect(x.text).not.toContain('<script>');
  });
  it('serves assetlinks, health and openapi', async () => {
    const h = harness();
    const al = await h.call('GET', '/.well-known/assetlinks.json');
    expect(al.json[0].target.package_name).toBe('com.entrenos.amigosecreto');
    expect((await h.call('GET', '/health')).json).toEqual({ ok: true });
    const doc = await h.call('GET', '/v1/openapi.json');
    expect(doc.json.openapi).toBe('3.1.0');
    expect(Object.keys(doc.json.paths).length).toBeGreaterThan(20);
  });
  it('unknown routes return the uniform error', async () => {
    const h = harness();
    const r = await h.call('GET', '/nope');
    expect(r.status).toBe(404);
    expect(r.json.error.code).toBe('NOT_FOUND');
  });
});
