import type { NotificationEvent, NotificationService, UserId } from '@entre-nos/domain';
import type { PushTokenStore } from './platform.js';

/**
 * Expo Push adapter. Texts follow docs/ux/flujos.md §Notificaciones. Payloads
 * carry only the event type, group id and chat side: never names from an
 * assignment, never message content.
 */

interface PushMessage {
  to: string;
  title: string;
  body: string;
  channelId: string;
  sound: 'default';
  priority: 'high' | 'default' | 'normal';
  data: { type: NotificationEvent['type']; groupId: string; side?: 'giver' | 'receiver' };
}

export function renderNotification(event: NotificationEvent): Omit<PushMessage, 'to' | 'sound'> {
  const g = event.groupName;
  const base = { groupId: event.groupId, type: event.type };
  switch (event.type) {
    case 'draw_done':
      return event.redraw
        ? {
            title: `Hubo un nuevo sorteo en ${g}`,
            body: 'Tu amigo secreto cambió. Entra a ver a quién te tocó ahora.',
            channelId: 'sorteo',
            priority: 'high',
            data: base,
          }
        : {
            title: '¡Ya hicieron el sorteo!',
            body: `Entra a ver a quién te tocó en ${g}. Que nadie te vea la pantalla.`,
            channelId: 'sorteo',
            priority: 'high',
            data: base,
          };
    case 'group_reopened':
      return {
        title: `${g} se abrió de nuevo`,
        body: 'El organizador está ajustando el grupo. Te avisamos cuando haya nuevo sorteo.',
        channelId: 'grupo',
        priority: 'normal',
        data: base,
      };
    case 'new_message':
      return event.side === 'receiver'
        ? {
            title: 'Tu amigo secreto te escribió',
            body: `Tienes un mensaje nuevo en ${g}.`,
            channelId: 'mensajes',
            priority: 'high',
            data: { ...base, side: 'receiver' },
          }
        : {
            title: 'Tienes una respuesta',
            body: `Te respondieron en ${g}.`,
            channelId: 'mensajes',
            priority: 'high',
            data: { ...base, side: 'giver' },
          };
    case 'revealed':
      return {
        title: '¡Llegó la revelación!',
        body: `Mira quién te regaló en ${g}.`,
        channelId: 'sorteo',
        priority: 'high',
        data: base,
      };
    case 'countdown': {
      const copy: Record<number, [string, string]> = {
        7: [`Falta una semana para ${g}`, '¿Ya tienes el regalo? Revisa su lista de deseos.'],
        3: [
          'Faltan 3 días para la entrega',
          `${g}: todavía estás a tiempo de conseguir el regalo.`,
        ],
        1: ['¡Mañana es la entrega!', `${g}: no se te olvide el regalo.`],
        0: ['¡Hoy es el amigo secreto!', `${g}: lleva tu regalo y prepárate para la revelación.`],
      };
      const [title, body] = copy[event.daysLeft] ?? [
        `Faltan ${event.daysLeft} días para ${g}`,
        'Revisa la lista de deseos de tu amigo secreto.',
      ];
      return { title, body, channelId: 'recordatorios', priority: 'default', data: base };
    }
    case 'member_joined':
      return {
        title: `${event.memberName} se unió a ${g}`,
        body: 'Cuando estén todos, haz el sorteo.',
        channelId: 'grupo',
        priority: 'normal',
        data: base,
      };
  }
}

export class ExpoPushService implements NotificationService {
  constructor(
    private readonly tokens: PushTokenStore,
    private readonly accessToken: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async notify(userIds: readonly UserId[], event: NotificationEvent): Promise<void> {
    try {
      const targets = await this.tokens.listForUsers([...new Set(userIds)]);
      if (targets.length === 0) return;
      const rendered = renderNotification(event);
      const messages: PushMessage[] = targets.map((t) => ({
        to: t.token,
        sound: 'default',
        ...rendered,
      }));
      const invalid: string[] = [];
      for (let i = 0; i < messages.length; i += 100) {
        const chunk = messages.slice(i, i + 100);
        const res = await this.fetchImpl('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
          },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) continue;
        const json = (await res.json()) as {
          data?: { status: string; details?: { error?: string } }[];
        };
        json.data?.forEach((r, j) => {
          if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') {
            invalid.push((chunk[j] as PushMessage).to);
          }
        });
      }
      await this.tokens.remove(invalid);
    } catch {
      // Push is best effort; never fail the user's request (and never log payloads).
    }
  }
}
