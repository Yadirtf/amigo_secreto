import * as C from '@entre-nos/contracts';
import { z } from 'zod';

/** OpenAPI 3.1 document generated from the shared Zod contracts. */

type Route = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  summary: string;
  auth?: boolean;
  body?: z.ZodType;
  response?: z.ZodType;
  status?: number;
};

const routes: Route[] = [
  {
    method: 'post',
    path: '/v1/auth/google',
    summary: 'Iniciar sesión con Google',
    auth: false,
    body: C.GoogleSignInRequest,
    response: C.Session,
  },
  {
    method: 'post',
    path: '/v1/auth/refresh',
    summary: 'Renovar sesión (rota el refresh token)',
    auth: false,
    body: C.RefreshRequest,
    response: C.Session,
  },
  {
    method: 'post',
    path: '/v1/auth/logout',
    summary: 'Cerrar sesión',
    body: C.RefreshRequest,
    response: C.Ok,
  },
  { method: 'get', path: '/v1/me', summary: 'Mi perfil', response: C.Me },
  {
    method: 'patch',
    path: '/v1/me',
    summary: 'Editar perfil',
    body: C.UpdateMeRequest,
    response: C.Me,
  },
  { method: 'delete', path: '/v1/me', summary: 'Eliminar cuenta', response: C.Ok },
  {
    method: 'put',
    path: '/v1/me/push-token',
    summary: 'Registrar token push',
    body: C.PushTokenRequest,
    response: C.Ok,
  },
  { method: 'get', path: '/v1/groups', summary: 'Mis grupos', response: C.GroupList },
  {
    method: 'post',
    path: '/v1/groups',
    summary: 'Crear grupo',
    body: C.CreateGroupRequest,
    response: C.GroupDetail,
    status: 201,
  },
  {
    method: 'post',
    path: '/v1/groups/join',
    summary: 'Unirse con código',
    body: C.JoinRequest,
    response: C.GroupDetail,
  },
  {
    method: 'get',
    path: '/v1/invites/{code}',
    summary: 'Vista previa de una invitación',
    response: C.InvitePreview,
  },
  { method: 'get', path: '/v1/groups/{id}', summary: 'Detalle del grupo', response: C.GroupDetail },
  {
    method: 'patch',
    path: '/v1/groups/{id}',
    summary: 'Editar grupo (organizador)',
    body: C.UpdateGroupRequest,
    response: C.GroupDetail,
  },
  {
    method: 'delete',
    path: '/v1/groups/{id}',
    summary: 'Eliminar grupo (organizador)',
    response: C.Ok,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/invite/rotate',
    summary: 'Nuevo código (organizador)',
    response: C.GroupDetail,
  },
  {
    method: 'delete',
    path: '/v1/groups/{id}/members/{userId}',
    summary: 'Salir o quitar miembro',
    response: C.Ok,
  },
  {
    method: 'put',
    path: '/v1/groups/{id}/participation',
    summary: '"Solo organizo"',
    body: C.ParticipationRequest,
    response: C.GroupDetail,
  },
  {
    method: 'put',
    path: '/v1/groups/{id}/exclusions',
    summary: 'Exclusiones (organizador)',
    body: C.ExclusionsRequest,
    response: C.GroupDetail,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/draw',
    summary: 'Sortear (organizador)',
    response: C.GroupDetail,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/redraw',
    summary: 'Re-sortear (organizador)',
    body: C.ConfirmRequest,
    response: C.GroupDetail,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/reopen',
    summary: 'Reabrir grupo (organizador)',
    body: C.ConfirmRequest,
    response: C.GroupDetail,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/reveal',
    summary: 'Revelar (organizador, desde el día de entrega)',
    body: C.ConfirmRequest,
    response: C.GroupDetail,
  },
  {
    method: 'get',
    path: '/v1/groups/{id}/reveal',
    summary: 'Resultado de la revelación',
    response: C.Reveal,
  },
  {
    method: 'get',
    path: '/v1/groups/{id}/assignment',
    summary: 'A quién me tocó',
    response: C.MyAssignment,
  },
  {
    method: 'get',
    path: '/v1/groups/{id}/wishlist',
    summary: 'Mi lista de deseos',
    response: C.WishlistResponse,
  },
  {
    method: 'put',
    path: '/v1/groups/{id}/wishlist',
    summary: 'Guardar mi lista de deseos',
    body: C.PutWishlistRequest,
    response: C.WishlistResponse,
  },
  {
    method: 'get',
    path: '/v1/groups/{id}/chat/{side}',
    summary: 'Mensajes del chat anónimo',
    response: C.ChatThread,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/chat/{side}/messages',
    summary: 'Enviar mensaje',
    body: C.SendMessageRequest,
    response: C.ChatMessage,
    status: 201,
  },
  {
    method: 'put',
    path: '/v1/groups/{id}/chat/receiver/block',
    summary: 'Pausar a mi amigo secreto',
    body: C.BlockRequest,
    response: C.Ok,
  },
  {
    method: 'post',
    path: '/v1/groups/{id}/chat/{side}/report',
    summary: 'Reportar',
    body: C.ReportRequest,
    response: C.Ok,
  },
];

const schema = (s: z.ZodType) => z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' });

let cached: object | null = null;

export function openApiDocument(): object {
  if (cached) return cached;
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routes) {
    const params = [...r.path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    (paths[r.path] ??= {})[r.method] = {
      summary: r.summary,
      ...(r.auth === false ? { security: [] } : {}),
      ...(params.length ? { parameters: params } : {}),
      ...(r.body
        ? {
            requestBody: {
              required: true,
              content: { 'application/json': { schema: schema(r.body) } },
            },
          }
        : {}),
      responses: {
        [String(r.status ?? 200)]: {
          description: 'OK',
          ...(r.response
            ? {
                content: {
                  'application/json': {
                    schema: z.toJSONSchema(r.response, { io: 'output', unrepresentable: 'any' }),
                  },
                },
              }
            : {}),
        },
        default: {
          description: 'Error',
          content: { 'application/json': { schema: schema(C.ApiError) } },
        },
      },
    };
  }
  cached = {
    openapi: '3.1.0',
    info: {
      title: 'Entre Nos API',
      version: '1.0.0',
      description: 'API del amigo secreto Entre Nos. Ver docs/API.md.',
    },
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearer: [] }],
    paths,
  };
  return cached;
}
