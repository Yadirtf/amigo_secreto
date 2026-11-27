# ADR-0006 — Anonimato del chat

**Fecha:** 2026-11-27 · **Estado:** Aceptada

- Un hilo por asignación; el id del hilo es el id aleatorio de la asignación y nunca se devuelve al receptor.
- Los mensajes guardan `direction` (`from_giver` / `from_receiver`), no el id del remitente.
- Ambos lados reciben la misma forma `{ id, mine, text, createdAt }`; la hora se redondea al minuto.
- La API nunca expone ids de usuario en el lado del receptor. Hay pruebas que serializan la respuesta y buscan el id del que regala.
- Las notificaciones solo dicen "tienes un mensaje nuevo" y el grupo; nada del remitente ni del contenido.
- Sin indicadores de "escribiendo" ni confirmaciones de lectura en v1.
- El receptor puede pausar al que le regala y reportar. Los reportes los revisa el operador en la base, no el organizador (eso revelaría identidades).
- Un re-sorteo o reapertura borra los chats anteriores.
