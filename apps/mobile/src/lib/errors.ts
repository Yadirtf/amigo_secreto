/**
 * Error code → warm Colombian-Spanish copy (docs/ux/flujos.md). The server
 * message is already human, but local copies win where the flow defines an
 * exact text, and they are the only option offline.
 */
import { isApiError, type ClientErrorCode } from '../api/client';

export type ErrorContext =
  | 'generic'
  | 'load'
  | 'login'
  | 'join'
  | 'createGroup'
  | 'saveGroup'
  | 'draw'
  | 'assignment'
  | 'wishlist'
  | 'chat'
  | 'exclusions';

export interface ErrorVars {
  organizer?: string;
  memberCount?: number;
  missing?: number;
  blockingName?: string;
  limit?: number;
}

export const OFFLINE_MESSAGE =
  'Parece que no tienes señal. Revisa tus datos o el wifi y vuelve a intentar.';
export const OFFLINE_CACHED_MESSAGE = 'Sin conexión. Te mostramos lo último guardado.';
export const SERVER_MESSAGE = 'Algo falló de nuestro lado. Intenta de nuevo en un momento.';
export const SESSION_CLOSED_MESSAGE = 'Tu sesión se cerró. Vuelve a entrar con Google.';

const NETWORK_BY_CONTEXT: Partial<Record<ErrorContext, string>> = {
  login: 'No hay conexión. Revisa tus datos o el wifi y vuelve a intentar.',
  createGroup: 'No se pudo crear el grupo. Revisa tu conexión y toca Crear grupo otra vez.',
  draw: 'El sorteo no se completó. No te preocupes: no quedó nada a medias. Vuelve a intentar.',
  assignment: 'No pudimos abrir tu regalo. Revisa tu conexión y vuelve a intentar.',
  wishlist: 'No se guardó la idea. Revisa tu conexión y vuelve a intentar.',
  chat: 'No se envió. Toca para reintentar.',
};

function codeMessage(code: ClientErrorCode, ctx: ErrorContext, v: ErrorVars): string | null {
  switch (code) {
    case 'NETWORK':
      return NETWORK_BY_CONTEXT[ctx] ?? OFFLINE_MESSAGE;
    case 'TIMEOUT':
      return (
        NETWORK_BY_CONTEXT[ctx] ?? 'La conexión está muy lenta. Vuelve a intentar en un momento.'
      );
    case 'INTERNAL':
    case 'INVALID_RESPONSE':
      return ctx === 'draw' ? (NETWORK_BY_CONTEXT.draw ?? SERVER_MESSAGE) : SERVER_MESSAGE;
    case 'UNAUTHORIZED':
      return SESSION_CLOSED_MESSAGE;
    case 'FORBIDDEN':
      return 'No tienes acceso a este grupo. Puede que te hayan quitado o que el grupo ya no exista.';
    case 'NOT_FOUND':
      return ctx === 'join'
        ? 'Ese código no existe. Revisa que esté bien escrito o pide el enlace de nuevo.'
        : 'Este grupo ya no existe.';
    case 'INVITE_INVALID':
      return 'Ese código no existe. Revisa que esté bien escrito o pide el enlace de nuevo.';
    case 'RATE_LIMITED':
      return ctx === 'join'
        ? 'Hiciste muchos intentos seguidos. Espera un minuto y vuelve a probar.'
        : 'Vas muy rápido. Espera un momento y vuelve a intentar.';
    case 'GROUP_LOCKED':
      if (ctx === 'join') {
        return `Este grupo ya hizo el sorteo. Pídele a ${v.organizer ?? 'quien organiza'} que te agregue: tendrá que sortear de nuevo.`;
      }
      return 'El sorteo ya está hecho, así que esto no se puede cambiar ahora.';
    case 'GROUP_FULL':
      return `Este grupo ya tiene ${v.limit ?? v.memberCount ?? 10} personas, el máximo del plan gratis. ${v.organizer ?? 'Quien organiza'} puede pasarlo a Premium para que entren más.`;
    case 'ALREADY_MEMBER':
      return 'Ya estás en este grupo.';
    case 'NOT_ENOUGH_PARTICIPANTS': {
      const k = v.missing ?? 1;
      return `Necesitan al menos 3 personas para el sorteo. Invita a ${k} más.`;
    }
    case 'DRAW_IMPOSSIBLE':
      return v.blockingName
        ? `No se pudo hacer el sorteo: con las exclusiones actuales, ${v.blockingName} no tiene a quién regalarle. Ve a Exclusiones y quítale alguna, o invita a más personas.`
        : `Hay demasiadas exclusiones para un grupo de ${v.memberCount ?? 'pocas'} personas. Quita algunas en Exclusiones e intenta de nuevo.`;
    case 'CONFLICT':
      return ctx === 'draw'
        ? `El grupo cambió mientras sorteabas${v.memberCount ? ` (${v.memberCount} personas ahora)` : ''}. Revisa la lista y vuelve a intentar.`
        : 'Alguien hizo un cambio al mismo tiempo. Revisa y vuelve a intentar.';
    case 'REDRAW_LIMIT':
      return 'Ya no se puede sortear de nuevo: este grupo usó todos los re-sorteos.';
    case 'DRAW_NOT_DONE':
      return 'Todavía no han hecho el sorteo. Te avisamos cuando lo hagan.';
    case 'NOT_REVEALED':
      return 'La revelación todavía no ha pasado.';
    case 'CHAT_BLOCKED':
      return 'Este chat está pausado, así que no se pueden enviar mensajes.';
    case 'INVALID_INPUT':
      return null; // prefer the server's specific message
  }
}

/** Human message for any thrown value. */
export function errorMessage(
  error: unknown,
  ctx: ErrorContext = 'generic',
  vars: ErrorVars = {},
): string {
  if (isApiError(error)) {
    const local = codeMessage(error.code, ctx, vars);
    if (local) return local;
    if (error.serverMessage) return error.serverMessage;
    return 'Revisa los datos e intenta otra vez.';
  }
  return SERVER_MESSAGE;
}

export function errorCode(error: unknown): ClientErrorCode | null {
  return isApiError(error) ? error.code : null;
}

/** Errors that mean "you can't see this group anymore". */
export function isGoneError(error: unknown): boolean {
  const c = errorCode(error);
  return c === 'NOT_FOUND' || c === 'FORBIDDEN';
}

/** Whether a failed request is worth retrying automatically. */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return error.isNetwork || error.code === 'INTERNAL' || error.code === 'RATE_LIMITED';
}
