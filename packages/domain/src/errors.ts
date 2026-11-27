/**
 * Domain errors carry a stable machine code. Presentation layers map codes to
 * HTTP statuses and to human, Colombian-Spanish messages.
 */
export type DomainErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'GROUP_LOCKED'
  | 'GROUP_FULL'
  | 'ALREADY_MEMBER'
  | 'INVITE_INVALID'
  | 'NOT_ENOUGH_PARTICIPANTS'
  | 'DRAW_IMPOSSIBLE'
  | 'DRAW_NOT_DONE'
  | 'REDRAW_LIMIT'
  | 'NOT_REVEALED'
  | 'CHAT_BLOCKED';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(code: DomainErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;
