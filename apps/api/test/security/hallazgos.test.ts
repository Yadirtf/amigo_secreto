/**
 * Regresión de los hallazgos PT-01..PT-06 de docs/seguridad/informe-pentest.md.
 * Fallaban antes de las correcciones; ahora deben quedarse en verde.
 */
import { draw, realOptions } from '@entre-nos/domain';
import { describe, expect, it } from 'vitest';
import { cryptoRandom } from '../../src/infra/crypto.js';
import { harness } from '../harness.js';

const day = (offset: number) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function group(n: number, h = harness()) {
  const org = await h.login('org', 'Organizadora');
  const created = await h.call('POST', '/v1/groups', {
    token: org.accessToken,
    body: { name: 'Oficina', deliveryDate: day(20), budgetCop: 50_000 },
  });
  const groupId = created.json.id as string;
  const code = created.json.inviteCode as string;
  const members: Awaited<ReturnType<typeof h.login>>[] = [];
  for (let i = 0; i < n; i++) {
    const m = await h.login(`m${i}`, `Miembro${i}`);
    await h.call('POST', '/v1/groups/join', { token: m.accessToken, body: { code } });
    members.push(m);
  }
  return { h, org, groupId, code, members, everyone: [org, ...members] };
}

describe('Hallazgos corregidos (regresión)', () => {
  it('PT-01: el detalle del grupo no debe revelar quién ya abrió su asignación (reduce el anonimato del chat)', async () => {
    const { h, groupId, everyone } = await group(4);
    await h.call('POST', `/v1/groups/${groupId}/draw`, { token: everyone[0]!.accessToken });
    // Solo la persona 2 abre su asignación y escribe a su receptor.
    await h.call('GET', `/v1/groups/${groupId}/assignment`, { token: everyone[2]!.accessToken });
    const view = await h.call('GET', `/v1/groups/${groupId}`, { token: everyone[1]!.accessToken });
    // Hoy cualquier miembro ve hasSeenAssignment=true solo en la persona 2:
    // si recibe un mensaje anónimo, sabe que su amigo secreto es alguien con el flag en true.
    for (const m of view.json.members) expect(m).not.toHaveProperty('hasSeenAssignment');
  });

  it('PT-02: el organizador no debe poder forzar a quién le toca con exclusiones (todas con ≥2 opciones)', async () => {
    // 6 participantes: O (organizador), T (objetivo), A, B, C, D.
    const { h, groupId, org, members } = await group(5);
    const [T, A, B] = members.map((m) => m.user.id);
    const O = org.user.id;
    const exclusions = [
      [O, A],
      [O, B],
      [T, A],
      [T, B],
      [A, B],
    ];
    // Cada persona conserva ≥ 2 receptores posibles, así que pasa la validación actual.
    expect(
      (
        await h.call('PUT', `/v1/groups/${groupId}/exclusions`, {
          token: org.accessToken,
          body: { exclusions },
        })
      ).status,
    ).toBe(200);

    // Con estas exclusiones el algoritmo puro siempre daría O → T (y T → O):
    // la guarda realOptions lo detecta y el servidor se niega a sortear.
    const people = [O, ...members.map((m) => m.user.id)];
    const options = realOptions(people, exclusions as [string, string][]);
    expect(options.asGiver.get(O)).toBe(1);
    const r = draw(people, exclusions as [string, string][], cryptoRandom);
    expect(r.ok && r.pairs.find((p) => p.giverId === O)?.receiverId).toBe(T);

    // Comportamiento esperado: el sorteo se rechaza porque alguien queda con una sola opción REAL.
    const d = await h.call('POST', `/v1/groups/${groupId}/draw`, { token: org.accessToken });
    expect(d.status).toBe(409);
  });

  it('PT-03: alguien expulsado no debe poder volver a entrar con el mismo código', async () => {
    const { h, groupId, org, members, code } = await group(3);
    const expelled = members[0]!;
    const rm = await h.call('DELETE', `/v1/groups/${groupId}/members/${expelled.user.id}`, {
      token: org.accessToken,
    });
    expect(rm.status).toBe(200);
    const back = await h.call('POST', '/v1/groups/join', {
      token: expelled.accessToken,
      body: { code },
    });
    expect(back.status).not.toBe(200);
  });

  it('PT-04: reutilizar un refresh token robado debe revocar la familia aunque haya rotado 2 veces', async () => {
    const h = harness();
    const victim = await h.login('victima');
    const stolen = victim.refreshToken;
    // El atacante usa el token robado y rota dos veces.
    const a1 = await h.call('POST', '/v1/auth/refresh', { body: { refreshToken: stolen } });
    const a2 = await h.call('POST', '/v1/auth/refresh', {
      body: { refreshToken: a1.json.refreshToken },
    });
    expect(a2.status).toBe(200);
    // Pasa la ventana de gracia y la víctima intenta usar su token (el original).
    for (const s of h.sessions.data.values()) s.rotatedAt = new Date(Date.now() - 60_000);
    expect(
      (await h.call('POST', '/v1/auth/refresh', { body: { refreshToken: stolen } })).status,
    ).toBe(401);
    // Esperado: reutilización detectada → la sesión del atacante muere.
    expect((await h.call('GET', '/v1/me', { token: a2.json.accessToken })).status).toBe(401);
  });

  it('PT-05: debe existir un tope duro de miembros por grupo aunque el límite gratis esté apagado', async () => {
    const h = harness();
    const org = await h.login('org');
    const created = await h.call('POST', '/v1/groups', {
      token: org.accessToken,
      body: { name: 'Masivo', deliveryDate: day(20), budgetCop: null },
    });
    const code = created.json.inviteCode as string;
    let last = 0;
    for (let i = 0; i < 101; i++) {
      if (i % 15 === 0) h.deps.clock.current = new Date(h.deps.clock.current.getTime() + 61_000);
      const ip = { 'cf-connecting-ip': `10.0.${Math.floor(i / 200)}.${i % 200}` };
      const s = await h.call('POST', '/v1/auth/google', {
        body: { idToken: `google-test-token:bot${i}:Bot` },
        headers: ip,
      });
      last = (
        await h.call('POST', '/v1/groups/join', {
          token: s.json.accessToken,
          body: { code },
          headers: ip,
        })
      ).status;
    }
    // 102 miembros hoy; documento de Mongo sin límite (16 MB) y sorteo/detalle O(n).
    expect(last).toBe(409);
  });

  it('PT-06: los nombres no deben aceptar caracteres de control ni de dirección (suplantación)', async () => {
    const h = harness();
    const u = await h.login('u');
    const r = await h.call('PATCH', '/v1/me', {
      token: u.accessToken,
      body: { name: 'Tu amigo secreto‮' },
    });
    expect(r.status).toBe(400);
  });
});
