# ADR-0011 — Identidad visual "Sobremesa"

**Fecha:** 2026-11-27 · **Estado:** Aceptada (el dueño delegó la elección)

- Dirección A "Sobremesa": fondos crema, coral para acciones y celebración (`#C2453A`), verde profundo de confianza para el sorteo y la privacidad (`#1F6F5C`) y dorado solo para momentos especiales (`#D9A23A`). Las otras dos direcciones quedan documentadas en `docs/ux/identidad-visual.md`.
- Tipografías Fredoka (títulos) y Nunito (texto), íconos `lucide-react-native`.
- Tema según el sistema, sin selector en v1. La pantalla "¿A quién te tocó?" siempre usa los tokens oscuros.
- `docs/ux/tokens.json` manda si hay diferencias con los documentos. Los 68 pares de texto/fondo pasan WCAG AA.
- Códigos de invitación: 10 caracteres (`XXXXX-XXXXX`), no 6 como proponía el borrador de UX, por seguridad ante enumeración. Enlace `https://<api>.workers.dev/i/<CODIGO>` y `entrenos://i/<CODIGO>`.
- Push sin nombres ni texto de mensajes; recordatorios a las 9:00 a. m. hora de Bogotá, nunca entre 9 p. m. y 7 a. m.
- La pantalla de asignación bloquea capturas y la vista previa de apps recientes (`expo-screen-capture`).
