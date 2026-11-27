/**
 * Pruebas de regresión de seguridad (informe-pentest.md, §Controles verificados).
 * Deben pasar siempre: si alguna falla, se rompió un control del modelo de amenazas.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { draw } from '@entre-nos/domain';
import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cryptoIds, cryptoRandom } from '../../src/infra/crypto.js';
import { renderNotification } from '../../src/infra/push.js';
import { harness } from '../harness.js';

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const SECRET = 'test-secret-test-secret-test-secret-123';

async function group(n = 3, h = harness()) {
  const org = await h.login('org', 'Organizadora');
  const created = await h.call('POST', '/v1/groups', {
    token: org.accessToken,
    body: { name: 'Oficina', deliveryDate: day(20), budgetCop: 50_000 },
  });
  expect(created.status).toBe(201);
  const groupId = created.json.id as string;
  const code = created.json.inviteCode as string;
  const members: Awaited<ReturnType<typeof h.login>>[] = [];
  for (let i = 0; i < n; i++) {
    const m = await h.login(`m${i}`, `Miembro${i}`);
    expect(
      (await h.call('POST', '/v1/groups/join', { token: m.accessToken, body: { code } })).status,
    ).toBe(200);
    members.push(m);
  }
  return { h, org, groupId, code, members, everyone: [org, ...members] };
}

async function drawn(n = 3) {
  const g = await group(n);
  const d = await g.h.call('POST', `/v1/groups/${g.groupId}/draw`, { token: g.org.accessToken });
  expect(d.status).toBe(200);
  return { ...g, drawResponse: d };
}

afterEach(() => vi.restoreAllMocks());

describe('API1 BOLA / IDOR', () => {
  it('SEC-IDOR-01: un miembro del grupo A recibe 404 idéntico en todas las rutas del grupo B', async () => {
    const { h, groupId } = await drawn(3);
    const outsider = await h.login('intruso', 'Intruso');
    const ghost = await h.call('GET', '/v1/groups/no-existe-123', { token: outsider.accessToken });
    expect(ghost.status).toBe(404);
    const routes: [string, string, unknown?][] = [
      ['GET', `/v1/groups/${groupId}`],
      ['PATCH', `/v1/groups/${groupId}`, { name: 'Hackeado' }],
      ['DELETE', `/v1/groups/${groupId}`],
      ['POST', `/v1/groups/${groupId}/invite/rotate`],
      ['PUT', `/v1/groups/${groupId}/participation`, { participates: false }],
      ['PUT', `/v1/groups/${groupId}/exclusions`, { exclusions: [] }],
      ['POST', `/v1/groups/${groupId}/draw`],
      ['POST', `/v1/groups/${groupId}/redraw`, { confirm: true }],
      ['POST', `/v1/groups/${groupId}/reopen`, { confirm: true }],
      ['POST', `/v1/groups/${groupId}/reveal`, { confirm: true }],
      ['GET', `/v1/groups/${groupId}/reveal`],
      ['GET', `/v1/groups/${groupId}/assignment`],
      ['GET', `/v1/groups/${groupId}/wishlist`],
      ['PUT', `/v1/groups/${groupId}/wishlist`, { items: [] }],
      ['GET', `/v1/groups/${groupId}/chat/giver`],
      ['GET', `/v1/groups/${groupId}/chat/receiver`],
      ['POST', `/v1/groups/${groupId}/chat/giver/messages`, { text: 'hola' }],
      ['POST', `/v1/groups/${groupId}/chat/receiver/messages`, { text: 'hola' }],
      ['PUT', `/v1/groups/${groupId}/chat/receiver/block`, { blocked: true }],
      ['POST', `/v1/groups/${groupId}/chat/receiver/report`, { reason: 'x' }],
    ];
    for (const [method, path, body] of routes) {
      const r = await h.call(method, path, { token: outsider.accessToken, body });
      expect.soft(r.status, `${method} ${path}`).toBe(404);
      expect.soft(r.text, `${method} ${path}`).toBe(ghost.text);
    }
  });

  it('SEC-IDOR-02: GET /assignment ignora parámetros que intenten elegir otro "giver"', async () => {
    const { h, groupId, members, deps } = { ...(await drawn(3)), deps: undefined as any };
    const victim = members[0]!;
    const attacker = members[1]!;
    const mine = await h.call('GET', `/v1/groups/${groupId}/assignment`, {
      token: attacker.accessToken,
    });
    const forged = await h.call(
      'GET',
      `/v1/groups/${groupId}/assignment?userId=${victim.user.id}&giverId=${victim.user.id}`,
      { token: attacker.accessToken },
    );
    expect(forged.status).toBe(200);
    expect(forged.json.recipient.id).toBe(mine.json.recipient.id);
    void deps;
  });

  it('SEC-IDOR-03: GET /groups solo lista los grupos propios', async () => {
    const { h } = await group(2);
    const other = await h.login('otro', 'Otro');
    const r = await h.call('GET', '/v1/groups', { token: other.accessToken });
    expect(r.json.groups).toEqual([]);
  });
});

describe('API5 BFLA', () => {
  it('SEC-BFLA-01: un miembro no organizador recibe 403 en acciones de organizador', async () => {
    const { h, groupId, members } = await group(3);
    const m = members[0]!;
    const target = members[1]!;
    const routes: [string, string, unknown?][] = [
      ['PATCH', `/v1/groups/${groupId}`, { name: 'Mío' }],
      ['DELETE', `/v1/groups/${groupId}`],
      ['POST', `/v1/groups/${groupId}/invite/rotate`],
      ['PUT', `/v1/groups/${groupId}/participation`, { participates: false }],
      ['PUT', `/v1/groups/${groupId}/exclusions`, { exclusions: [] }],
      ['POST', `/v1/groups/${groupId}/draw`],
      ['DELETE', `/v1/groups/${groupId}/members/${target.user.id}`],
    ];
    for (const [method, path, body] of routes) {
      const r = await h.call(method, path, { token: m.accessToken, body });
      expect.soft(r.status, `${method} ${path}`).toBe(403);
    }
    const d = await h.call('POST', `/v1/groups/${groupId}/draw`, {
      token: (await h.login('org')).accessToken,
    });
    expect(d.status).toBe(200);
    for (const [method, path] of [
      ['POST', `/v1/groups/${groupId}/redraw`],
      ['POST', `/v1/groups/${groupId}/reopen`],
      ['POST', `/v1/groups/${groupId}/reveal`],
    ] as const) {
      const r = await h.call(method, path, { token: m.accessToken, body: { confirm: true } });
      expect.soft(r.status, `${method} ${path}`).toBe(403);
    }
  });
});

describe('Asignaciones nunca expuestas', () => {
  it('SEC-ASG-01: la respuesta del sorteo y el detalle del grupo no contienen asignaciones', async () => {
    const { h, groupId, org, drawResponse } = await drawn(4);
    const detail = await h.call('GET', `/v1/groups/${groupId}`, { token: org.accessToken });
    const keys = (v: unknown): string[] =>
      v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];
    for (const json of [drawResponse.json, detail.json]) {
      // (hasSeenAssignment es otro hallazgo: PT-01)
      const ks = keys(json).filter((k) => !/^\d+$/.test(k) && k !== 'hasSeenAssignment');
      expect(ks.join(',')).not.toMatch(/recipient|receiver|giver|assignment|pairs/i);
    }
  });

  it('SEC-ASG-02: el repositorio guarda el receptor cifrado (sin id en claro)', async () => {
    // El adaptador Mongo cifra; aquí se verifica el cifrador real.
    const { AssignmentCipher } = await import('../../src/infra/crypto.js');
    const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const c = await AssignmentCipher.fromSecret(key);
    const enc = await c.encrypt('g1', 'user-123');
    expect(enc).not.toContain('user-123');
    expect(await c.decrypt('g1', enc)).toBe('user-123');
    await expect(c.decrypt('g2', enc)).rejects.toThrow(); // AAD = groupId
    expect(await c.lookup('g1', 'user-123')).not.toContain('user-123');
  });

  it('SEC-ASG-03: GET /reveal antes de la revelación responde 409 igual para todos', async () => {
    const { h, groupId, everyone } = await drawn(3);
    const bodies = new Set<string>();
    for (const u of everyone) {
      const r = await h.call('GET', `/v1/groups/${groupId}/reveal`, { token: u.accessToken });
      expect(r.status).toBe(409);
      bodies.add(r.text);
    }
    expect(bodies.size).toBe(1);
  });
});

describe('Anonimato del chat (C-03/C-04)', () => {
  it('SEC-CHAT-01: el JSON del receptor nunca contiene id, nombre, correo ni foto del que regala', async () => {
    const { h, groupId, everyone } = await drawn(4);
    for (const receiver of everyone) {
      const a = await h.deps.assignments.findByReceiver(groupId, receiver.user.id);
      const giver = everyone.find((u) => u.user.id === a!.giverId)!;
      const giverUser = await h.deps.users.findById(giver.user.id);
      const sent = await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
        token: giver.accessToken,
        body: { text: 'Pista: me gusta el café' },
      });
      expect(sent.status).toBe(201);
      const responses = [
        await h.call('GET', `/v1/groups/${groupId}/chat/receiver`, { token: receiver.accessToken }),
        await h.call('POST', `/v1/groups/${groupId}/chat/receiver/messages`, {
          token: receiver.accessToken,
          body: { text: '¿Quién eres?' },
        }),
        await h.call('PUT', `/v1/groups/${groupId}/chat/receiver/block`, {
          token: receiver.accessToken,
          body: { blocked: true },
        }),
        await h.call('POST', `/v1/groups/${groupId}/chat/receiver/messages`, {
          token: receiver.accessToken,
          body: { text: 'sigo aquí' },
        }),
        await h.call('POST', `/v1/groups/${groupId}/chat/receiver/report`, {
          token: receiver.accessToken,
          body: { reason: 'prueba' },
        }),
      ];
      const forbidden = [giver.user.id, giverUser!.name, giverUser!.email!, a!.id];
      for (const r of responses) {
        const blob = r.text + JSON.stringify([...r.headers.entries()]);
        for (const f of forbidden) expect(blob).not.toContain(f);
      }
      const thread = responses[0]!.json;
      expect(thread.counterpart).toBeNull();
      expect(Object.keys(thread).sort()).toEqual([
        'blocked',
        'counterpart',
        'hasMore',
        'messages',
        'side',
      ]);
      for (const m of thread.messages)
        expect(Object.keys(m).sort()).toEqual(['createdAt', 'id', 'mine', 'text']);
    }
  });

  it('SEC-CHAT-02: las horas del chat salen redondeadas al minuto', async () => {
    const { h, groupId, org } = await drawn(3);
    h.deps.clock.current = new Date(h.deps.clock.current.getTime() + 37_123);
    await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
      token: org.accessToken,
      body: { text: 'hola' },
    });
    const r = await h.call('GET', `/v1/groups/${groupId}/chat/giver`, { token: org.accessToken });
    for (const m of r.json.messages) expect(m.createdAt).toMatch(/:00\.000Z$/);
  });

  it('SEC-CHAT-03: el push al receptor no lleva texto ni datos del remitente', async () => {
    const { h, groupId, org } = await drawn(3);
    h.deps.notifications.sent.length = 0;
    await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
      token: org.accessToken,
      body: { text: 'SECRETO-123' },
    });
    const [n] = h.deps.notifications.sent;
    expect(n!.userIds).not.toContain(org.user.id);
    expect(JSON.stringify(n)).not.toContain('SECRETO-123');
    expect(JSON.stringify(n)).not.toContain(org.user.id);
    const rendered = renderNotification(n!.event);
    expect(Object.keys(rendered.data).sort()).toEqual(['groupId', 'side', 'type']);
    expect(JSON.stringify(rendered)).not.toMatch(/Organizadora|SECRETO/);
  });

  it('SEC-CHAT-04: un usuario no puede leer el hilo de otro (ambos lados resueltos por contexto)', async () => {
    const { h, groupId, everyone } = await drawn(4);
    const [a, b] = everyone;
    await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
      token: a!.accessToken,
      body: { text: 'de A' },
    });
    const asB = await h.call('GET', `/v1/groups/${groupId}/chat/giver`, { token: b!.accessToken });
    const aRecipient = (await h.deps.assignments.findByGiver(groupId, a!.user.id))!.receiverId;
    if (aRecipient !== b!.user.id) {
      expect(JSON.stringify(asB.json.messages)).not.toContain('de A');
    }
  });
});

describe('API2 autenticación', () => {
  const sign = (
    claims: Record<string, unknown>,
    opts: { secret?: string; alg?: string; exp?: number } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: opts.alg ?? 'HS256' })
      .setSubject(String(claims.sub ?? 'x'))
      .setIssuer('entre-nos-api')
      .setAudience(String(claims.aud ?? 'entre-nos-app'))
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? Math.floor(Date.now() / 1000) + 600)
      .sign(new TextEncoder().encode(opts.secret ?? SECRET));

  it('SEC-AUTH-01: rechaza JWT con otra clave, otro aud, vencido, alg none o HS512', async () => {
    const h = harness();
    const s = await h.login('u1');
    const sid = [...h.sessions.data.keys()][0]!;
    const base = { sub: s.user.id, sid };
    const bad = [
      await sign(base, { secret: 'otra-clave-otra-clave-otra-clave-xx' }),
      await sign({ ...base, aud: 'otra-app' }),
      await sign(base, { exp: Math.floor(Date.now() / 1000) - 120 }),
      await sign(base, { alg: 'HS512' }),
      `${btoa('{"alg":"none"}')}.${btoa(JSON.stringify(base))}.`,
      await sign({ sub: s.user.id }), // sin sid
      await sign({ ...base, sid: 'sesion-inexistente' }),
    ];
    for (const t of bad) expect((await h.call('GET', '/v1/me', { token: t })).status).toBe(401);
    expect((await h.call('GET', '/v1/me', { token: await sign(base) })).status).toBe(200);
  });

  it('SEC-AUTH-02: logout invalida el access token en curso (sesión revocada)', async () => {
    const h = harness();
    const s = await h.login('u1');
    await h.call('POST', '/v1/auth/logout', {
      token: s.accessToken,
      body: { refreshToken: s.refreshToken },
    });
    expect((await h.call('GET', '/v1/me', { token: s.accessToken })).status).toBe(401);
  });

  it('SEC-AUTH-03: no se puede cerrar la sesión de otro usuario con su refresh', async () => {
    const h = harness();
    const a = await h.login('a');
    const b = await h.login('b');
    await h.call('POST', '/v1/auth/logout', {
      token: a.accessToken,
      body: { refreshToken: b.refreshToken },
    });
    expect((await h.call('GET', '/v1/me', { token: b.accessToken })).status).toBe(200);
  });

  it('SEC-AUTH-04: el login de prueba no existe en producción aunque haya llave', async () => {
    const h = harness({ appEnv: 'production', devLoginKey: 'dev-login-key-for-tests' });
    const r = await h.call('POST', '/v1/auth/dev', {
      body: { key: 'dev-login-key-for-tests', name: 'Ana' },
    });
    expect(r.status).toBe(404);
  });
});

describe('Entrada hostil (inyección, CORS, cabeceras)', () => {
  it('SEC-INJ-01: operadores NoSQL y tipos no string se rechazan antes de la BD', async () => {
    const { h, org } = await group(1);
    const spy = vi.spyOn(h.deps.groups, 'findByInviteCode');
    for (const code of [
      { $ne: null },
      { $regex: '.*' },
      ['ABCDE23456'],
      1234567890,
      'ABCDE\u000023456',
      "ABCDE' || '1",
    ]) {
      const r = await h.call('POST', '/v1/groups/join', { token: org.accessToken, body: { code } });
      expect.soft(r.status, JSON.stringify(code)).toBeGreaterThanOrEqual(400);
      expect.soft(r.status, JSON.stringify(code)).toBeLessThan(500);
    }
    expect(spy).not.toHaveBeenCalled();
    for (const body of [
      { refreshToken: { $gt: '' } },
      { refreshToken: 'x'.repeat(30), extra: 1 },
    ]) {
      expect((await h.call('POST', '/v1/auth/refresh', { body })).status).toBe(400);
    }
    const byId = await h.call('GET', `/v1/groups/${encodeURIComponent('{"$ne":null}')}`, {
      token: org.accessToken,
    });
    expect(byId.status).toBe(404);
  });

  it('SEC-HDR-01: cualquier petición con Origin a /v1 es rechazada y no hay cabeceras CORS', async () => {
    const { h, org } = await group(0);
    const r = await h.call('GET', '/v1/me', {
      token: org.accessToken,
      headers: { origin: 'https://evil.example' },
    });
    expect(r.status).toBe(403);
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const pre = await h.call('OPTIONS', '/v1/me', { headers: { origin: 'https://evil.example' } });
    expect(pre.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('SEC-HDR-02: respuestas de /v1 (incluidas las de error) llevan no-store y nosniff', async () => {
    const { h, org, groupId } = await group(0);
    const cases = [
      await h.call('GET', '/v1/me', { token: org.accessToken }),
      await h.call('GET', `/v1/groups/${groupId}/assignment`, { token: org.accessToken }), // 409
      await h.call('GET', '/v1/groups/no-existe', { token: org.accessToken }), // 404
      await h.call('GET', '/v1/me'), // 401
    ];
    for (const r of cases) {
      expect.soft(r.headers.get('cache-control'), String(r.status)).toBe('no-store');
      expect.soft(r.headers.get('x-content-type-options')).toBe('nosniff');
    }
  });

  it('SEC-ERR-01: un error interno no filtra mensajes, stack ni datos en la respuesta ni en el log', async () => {
    const { h, org, groupId } = await group(0);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(h.deps.groups, 'findById').mockRejectedValue(
      new Error('MongoServerError: user=app pass=hunter2'),
    );
    const r = await h.call('GET', `/v1/groups/${groupId}`, { token: org.accessToken });
    expect(r.status).toBe(500);
    expect(r.json.error.code).toBe('INTERNAL');
    expect(r.text).not.toMatch(/hunter2|Mongo|stack/);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/hunter2|Mongo/);
  });

  it('SEC-WISH-01: la lista de deseos solo acepta enlaces https', async () => {
    const { h, org, groupId } = await group(0);
    for (const link of [
      'javascript:alert(1)',
      'intent://x#Intent;end',
      'http://a.co',
      'data:text/html,x',
      'file:///etc/passwd',
      'https://u:p@a.co',
    ]) {
      const r = await h.call('PUT', `/v1/groups/${groupId}/wishlist`, {
        token: org.accessToken,
        body: { items: [{ text: 'algo', link }] },
      });
      expect.soft(r.status, link).toBe(400);
    }
  });

  it('SEC-LAND-01: la landing /i/:code no consulta la BD y escapa la entrada', async () => {
    const h = harness();
    const spy = vi.spyOn(h.deps.groups, 'findByInviteCode');
    const r = await h.call('GET', `/i/${encodeURIComponent('<script>alert(1)</script>')}`);
    expect(r.status).toBe(200);
    expect(r.text).not.toContain('<script>');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('API4/API6 límites y flujos de negocio', () => {
  it('SEC-RL-01: unirse con código: el intento 11 en un minuto da 429', async () => {
    const { h } = await group(0);
    const u = await h.login('bruto');
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (
          await h.call('POST', '/v1/groups/join', {
            token: u.accessToken,
            body: { code: `ZZZZZ${String(i).padStart(5, '2').replace(/[01]/g, '9')}` },
          })
        ).status,
      );
    }
    expect(statuses.slice(0, 10).every((s) => s === 404)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('SEC-RL-02: chat limitado a 20 mensajes/minuto por usuario', async () => {
    const { h, groupId, org } = await drawn(3);
    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = (
        await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
          token: org.accessToken,
          body: { text: `m${i}` },
        })
      ).status;
    }
    expect(last).toBe(429);
  });

  it('SEC-FLOW-01: no se puede revelar antes del día de entrega ni adelantar la fecha tras el sorteo', async () => {
    const { h, groupId, org } = await drawn(3);
    const rv = await h.call('POST', `/v1/groups/${groupId}/reveal`, {
      token: org.accessToken,
      body: { confirm: true },
    });
    expect(rv.status).toBe(409);
    expect(rv.json.error.code).toBe('NOT_REVEALED');
    const earlier = await h.call('PATCH', `/v1/groups/${groupId}`, {
      token: org.accessToken,
      body: { deliveryDate: day(0) },
    });
    expect(earlier.status).toBe(409);
    const later = await h.call('PATCH', `/v1/groups/${groupId}`, {
      token: org.accessToken,
      body: { deliveryDate: day(25) },
    });
    expect(later.status).toBe(200);
  });

  it('SEC-FLOW-02: re-sorteos limitados a 2 (también vía reabrir + sortear) y notificados a todos', async () => {
    const { h, groupId, org, everyone } = await drawn(3);
    const ok1 = await h.call('POST', `/v1/groups/${groupId}/redraw`, {
      token: org.accessToken,
      body: { confirm: true },
    });
    expect(ok1.status).toBe(200);
    const re = await h.call('POST', `/v1/groups/${groupId}/reopen`, {
      token: org.accessToken,
      body: { confirm: true },
    });
    expect(re.status).toBe(200);
    expect(
      (await h.call('POST', `/v1/groups/${groupId}/draw`, { token: org.accessToken })).status,
    ).toBe(200);
    for (const path of ['redraw', 'reopen']) {
      const r = await h.call('POST', `/v1/groups/${groupId}/${path}`, {
        token: org.accessToken,
        body: { confirm: true },
      });
      expect.soft(r.json.error?.code, path).toBe('REDRAW_LIMIT');
    }
    const draws = h.deps.notifications.sent.filter((n) => n.event.type === 'draw_done');
    expect(draws).toHaveLength(3);
    for (const n of draws)
      expect(new Set(n.userIds)).toEqual(new Set(everyone.map((u) => u.user.id)));
    const detail = await h.call('GET', `/v1/groups/${groupId}`, {
      token: everyone[1]!.accessToken,
    });
    expect(detail.json.drawCount).toBe(3);
    expect(detail.json.redrawsLeft).toBe(0);
  });

  it('SEC-FLOW-03: exclusiones que dejan a alguien con 1 sola opción se rechazan', async () => {
    const { h, groupId, org, members } = await group(3);
    const ex = await h.call('PUT', `/v1/groups/${groupId}/exclusions`, {
      token: org.accessToken,
      body: {
        exclusions: [
          [org.user.id, members[0]!.user.id],
          [org.user.id, members[1]!.user.id],
        ],
      },
    });
    expect(ex.status).toBe(200);
    const d = await h.call('POST', `/v1/groups/${groupId}/draw`, { token: org.accessToken });
    expect(d.json.error.code).toBe('DRAW_IMPOSSIBLE');
  });

  it('SEC-FLOW-04: unirse a un grupo ya sorteado se rechaza', async () => {
    const { h, code } = await drawn(3);
    const late = await h.login('tarde');
    const r = await h.call('POST', '/v1/groups/join', { token: late.accessToken, body: { code } });
    expect(r.json.error.code).toBe('GROUP_LOCKED');
  });
});

describe('Aleatoriedad e identificadores', () => {
  it('SEC-RNG-01: ids públicos son UUIDv4 (nunca ObjectId) y códigos del alfabeto sin confusos', () => {
    for (let i = 0; i < 200; i++) {
      const id = cryptoIds.id();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(id).not.toMatch(/^[0-9a-f]{24}$/);
      expect(cryptoIds.inviteCode()).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$/);
    }
  });

  it('SEC-RNG-02: el sorteo es uniforme sobre los 9 derangements de 4 personas (chi-cuadrado)', () => {
    const people = ['a', 'b', 'c', 'd'];
    const counts = new Map<string, number>();
    const N = 45_000;
    for (let i = 0; i < N; i++) {
      const r = draw(people, [], cryptoRandom);
      if (!r.ok) throw new Error('draw failed');
      const key = r.pairs.map((p) => p.receiverId).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(9);
    const expected = N / 9;
    const chi = [...counts.values()].reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(26.12); // p = 0.001 con 8 grados de libertad
  });
});

describe('C-08 logs', () => {
  it('SEC-LOG-01: un flujo completo no escribe en consola textos de chat, tokens ni correos', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const { h, groupId, everyone } = await drawn(3);
    for (const u of everyone) {
      await h.call('GET', `/v1/groups/${groupId}/assignment`, { token: u.accessToken });
      await h.call('POST', `/v1/groups/${groupId}/chat/giver/messages`, {
        token: u.accessToken,
        body: { text: 'TEXTO-SECRETO' },
      });
      await h.call('GET', `/v1/groups/${groupId}/chat/receiver`, { token: u.accessToken });
    }
    const all = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(all).not.toContain('TEXTO-SECRETO');
    expect(all).not.toContain('@example.com');
    for (const u of everyone) {
      expect(all).not.toContain(u.accessToken);
      expect(all).not.toContain(u.refreshToken);
    }
  });
});
