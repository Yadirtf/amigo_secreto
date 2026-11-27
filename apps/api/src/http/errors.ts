import type { ErrorCode } from '@entre-nos/contracts';
import { isDomainError } from '@entre-nos/domain';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** Human messages in Colombian Spanish (docs/ux/flujos.md). */
const MESSAGES: Record<ErrorCode, string> = {
  INVALID_INPUT: 'Revisa los datos: algo no quedó bien escrito.',
  UNAUTHORIZED: 'Tu sesión se cerró. Vuelve a entrar, por favor.',
  FORBIDDEN: 'Eso solo lo puede hacer quien organiza el grupo.',
  NOT_FOUND: 'No encontramos eso. Puede que ya no exista o que no hagas parte del grupo.',
  INVITE_INVALID: 'Ese código no existe o ya venció. Pídele uno nuevo a quien organiza.',
  CONFLICT: 'Algo cambió mientras tanto. Intenta de nuevo.',
  GROUP_LOCKED: 'El grupo ya está sorteado, así que eso no se puede cambiar ahora.',
  GROUP_FULL: 'Este grupo ya está lleno.',
  ALREADY_MEMBER: 'Ya haces parte de este grupo.',
  NOT_ENOUGH_PARTICIPANTS: 'Para sortear se necesitan mínimo 3 personas. ¡Invita a más gente!',
  DRAW_IMPOSSIBLE:
    'Con estas exclusiones no se puede hacer el sorteo. Quita alguna exclusión de las personas marcadas.',
  DRAW_NOT_DONE: 'Todavía no han hecho el sorteo. Te avisamos apenas pase.',
  REDRAW_LIMIT: 'Ya se usaron todos los re-sorteos de este grupo.',
  NOT_REVEALED: 'La revelación se abre el día de la entrega.',
  CHAT_BLOCKED: 'Tu amigo secreto pausó los mensajes por ahora.',
  RATE_LIMITED: 'Vas muy rápido. Espera un momentico y vuelve a intentar.',
  INTERNAL: 'Uy, algo falló de nuestro lado. Intenta de nuevo en un momento.',
};

const STATUS: Record<ErrorCode, ContentfulStatusCode> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVITE_INVALID: 404,
  CONFLICT: 409,
  GROUP_LOCKED: 409,
  GROUP_FULL: 409,
  ALREADY_MEMBER: 409,
  NOT_ENOUGH_PARTICIPANTS: 409,
  DRAW_IMPOSSIBLE: 409,
  DRAW_NOT_DONE: 409,
  REDRAW_LIMIT: 409,
  NOT_REVEALED: 409,
  CHAT_BLOCKED: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** Only these detail keys may leave the server. */
const SAFE_DETAILS = new Set([
  'field',
  'blocking',
  'limit',
  'min',
  'max',
  'status',
  'deliveryDate',
]);

export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function toErrorResponse(e: unknown): {
  status: ContentfulStatusCode;
  body: { error: { code: ErrorCode; message: string; details?: Record<string, unknown> } };
} {
  let code: ErrorCode = 'INTERNAL';
  let details: Record<string, unknown> | undefined;
  if (e instanceof HttpError) {
    code = e.code;
    details = e.details;
  } else if (isDomainError(e)) {
    code = e.code;
    details = e.details ? { ...e.details } : undefined;
  }
  const safe = details
    ? Object.fromEntries(Object.entries(details).filter(([k]) => SAFE_DETAILS.has(k)))
    : undefined;
  return {
    status: STATUS[code],
    body: {
      error: {
        code,
        message: MESSAGES[code],
        ...(safe && Object.keys(safe).length ? { details: safe } : {}),
      },
    },
  };
}
