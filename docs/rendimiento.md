# Rendimiento, red lenta y consumo de datos

_Medido el 27 de noviembre de 2026._

## Consumo de datos de la API
Grupo de 15 personas, lista de 5 ideas y 30 mensajes (medido sobre las respuestas reales de la API; Cloudflare comprime con gzip cuando el celular lo pide, y Android lo pide siempre).

| Petición | Sin comprimir | Con gzip |
| --- | --- | --- |
| `GET /v1/me` | 83 B | 99 B |
| `GET /v1/groups` (lista) | 160 B | 150 B |
| `GET /v1/groups/:id` (detalle, 15 miembros) | 2,0 KB | 0,4 KB |
| `GET /v1/groups/:id/assignment` | 142 B | 140 B |
| `GET /v1/groups/:id/wishlist` (5 ideas) | 571 B | 168 B |
| `GET /v1/groups/:id/chat/giver` (30 mensajes) | 2,6 KB | 0,3 KB |

**Estimado:** abrir la app y entrar a un grupo cuesta menos de 1 KB comprimido. Una temporada completa de amigo secreto (unas 50 aperturas, chat incluido) queda por debajo de 1 MB. Las fotos son la única pieza pesada y están limitadas a 60 KB cada una (ADR-0009).

## Tamaño de la app
- APK de prueba (solo x86_64, compilación release con minificación): 31 MB. En Google Play se descarga por arquitectura desde el AAB, normalmente algo menos.

## Red lenta y sin conexión
- **Diseño:** timeout de 15 s por petición, un solo refresh de sesión en paralelo, caché en el celular por 7 días (TanStack Query persistido), interfaz optimista en lista de deseos y chat, y aviso "Sin conexión" con los datos guardados.
- **Prueba automática (e2e en emulador de gama baja, 2 GB de RAM):**
  - `04-offline`: con modo avión, la app abre con los grupos en caché y muestra el aviso de sin conexión.
  - Unirse con código (`03-join-errors`) se repite con la red del emulador en velocidad **EDGE** y latencia **GPRS**.
- Las capturas de pantalla de estas corridas (claro, oscuro, red lenta y sin conexión) salen en el log del workflow _E2E Android (Maestro)_.
