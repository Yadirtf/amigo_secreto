# API v1 — Entre Nos

Base: `https://entre-nos-api-staging.<cuenta>.workers.dev` (staging) / `https://entre-nos-api.<cuenta>.workers.dev` (producción).
Todos los cuerpos y respuestas usan los esquemas de `packages/contracts` (nombre entre paréntesis).
Autenticación: `Authorization: Bearer <accessToken>` salvo donde se indica. La especificación OpenAPI se sirve en `GET /v1/openapi.json`.

## Errores

Siempre `{ "error": { "code", "message", "details?" } }` (`ApiError`). `message` ya viene en español colombiano listo para mostrar.

| HTTP | code |
|---|---|
| 400 | INVALID_INPUT |
| 401 | UNAUTHORIZED (la app intenta `refresh` una vez y si falla cierra sesión) |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND, INVITE_INVALID |
| 409 | CONFLICT, GROUP_LOCKED, GROUP_FULL, ALREADY_MEMBER, NOT_ENOUGH_PARTICIPANTS, DRAW_IMPOSSIBLE (`details.blocking`: ids de miembros), DRAW_NOT_DONE, REDRAW_LIMIT, NOT_REVEALED, CHAT_BLOCKED |
| 429 | RATE_LIMITED (`Retry-After`) |
| 500 | INTERNAL |

## Endpoints

| Método | Ruta | Auth | Cuerpo | Respuesta |
|---|---|---|---|---|
| POST | `/v1/auth/google` | no | `GoogleSignInRequest` | `Session` |
| POST | `/v1/auth/dev` | no (solo staging con `DEV_LOGIN_KEY`) | `{ key, name }` | `Session` |
| POST | `/v1/auth/refresh` | no | `RefreshRequest` | `Session` |
| POST | `/v1/auth/logout` | sí | `RefreshRequest` | `Ok` |
| GET | `/v1/me` | sí | — | `Me` |
| PATCH | `/v1/me` | sí | `UpdateMeRequest` | `Me` |
| DELETE | `/v1/me` | sí | — | `Ok` |
| PUT | `/v1/me/push-token` | sí | `PushTokenRequest` | `Ok` |
| GET | `/v1/groups` | sí | — | `GroupList` |
| POST | `/v1/groups` | sí | `CreateGroupRequest` | `GroupDetail` (201) |
| GET | `/v1/groups/:id` | sí | — | `GroupDetail` |
| PATCH | `/v1/groups/:id` | sí (organizador) | `UpdateGroupRequest` | `GroupDetail` |
| DELETE | `/v1/groups/:id` | sí (organizador) | — | `Ok` |
| GET | `/v1/invites/:code` | sí | — | `InvitePreview` |
| POST | `/v1/groups/join` | sí | `JoinRequest` | `GroupDetail` |
| POST | `/v1/groups/:id/invite/rotate` | sí (organizador) | — | `GroupDetail` |
| DELETE | `/v1/groups/:id/members/:userId` | sí (uno mismo u organizador) | — | `Ok` |
| PUT | `/v1/groups/:id/participation` | sí (organizador) | `ParticipationRequest` | `GroupDetail` |
| PUT | `/v1/groups/:id/exclusions` | sí (organizador) | `ExclusionsRequest` | `GroupDetail` |
| POST | `/v1/groups/:id/draw` | sí (organizador) | — | `GroupDetail` |
| POST | `/v1/groups/:id/redraw` | sí (organizador) | `ConfirmRequest` | `GroupDetail` |
| POST | `/v1/groups/:id/reopen` | sí (organizador) | `ConfirmRequest` | `GroupDetail` |
| GET | `/v1/groups/:id/assignment` | sí | — | `MyAssignment` |
| GET | `/v1/groups/:id/wishlist` | sí | — | `WishlistResponse` (la mía) |
| PUT | `/v1/groups/:id/wishlist` | sí | `PutWishlistRequest` | `WishlistResponse` |
| GET | `/v1/groups/:id/chat/:side` | sí | query `ChatQuery` | `ChatThread` |
| POST | `/v1/groups/:id/chat/:side/messages` | sí | `SendMessageRequest` | `ChatMessage` (201) |
| PUT | `/v1/groups/:id/chat/receiver/block` | sí | `BlockRequest` | `Ok` |
| POST | `/v1/groups/:id/chat/:side/report` | sí | `ReportRequest` | `Ok` |
| POST | `/v1/groups/:id/reveal` | sí (organizador) | `ConfirmRequest` | `GroupDetail` |
| GET | `/v1/groups/:id/reveal` | sí | — | `Reveal` |
| GET | `/i/:code` | no | — | Página HTML liviana: abre la app o lleva a Play Store, muestra el código |
| GET | `/.well-known/assetlinks.json` | no | — | Android App Links |
| GET | `/health` | no | — | `{ ok: true }` |

`:side` es `giver` (le escribo a quien le regalo) o `receiver` (hablo con mi amigo secreto anónimo).

## Notificaciones push (`data` del payload)

`{ type: 'draw_done' | 'group_reopened' | 'new_message' | 'revealed' | 'countdown' | 'member_joined', groupId, side? }`.
La app navega según `type`: `new_message` → chat del `side` indicado; `draw_done` → "¿A quién te tocó?"; `revealed` → Revelación; resto → detalle del grupo.
