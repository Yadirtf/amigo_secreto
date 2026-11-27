# ADR-0009 — Fotos, retención y límites gratuitos

**Fecha:** 2026-11-27 · **Estado:** Aceptada

- Fotos de perfil y de grupo: la app las recorta a 256×256 y las comprime en WebP/JPEG (~30 KB). Se guardan como data URI en MongoDB (máx. 60 KB). Evita R2, que exige registrar tarjeta.
- Retención: grupos, asignaciones, chats y listas se borran **60 días** después de la fecha de entrega (cron diario del Worker).
- Ids aleatorios (UUID v4), nunca ObjectId de Mongo hacia afuera, porque los ObjectId tienen contador y marca de tiempo.
- Respuestas compactas, paginación en el chat (30 por página), sin imágenes en listas salvo miniaturas.
