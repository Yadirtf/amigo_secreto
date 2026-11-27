# ADR-0007 — Autenticación

**Fecha:** 2026-11-27 · **Estado:** Aceptada

- v1: **Google** (sin SMS por costo, sin código por correo porque no hay dominio para enviar). Apple preparado para cuando exista la cuenta.
- La app obtiene un ID token de Google; la API verifica firma (JWKS), `iss`, `aud` (solo nuestros client IDs), `exp` y `email_verified`. La identidad es el `sub`, nunca el correo.
- La API emite un access token propio (JWT HS256, 15 min, `kid` fijo) y un refresh token opaco rotativo (30 días) guardado con hash SHA-256. Reusar un refresh ya rotado revoca toda la familia.
- En el celular los tokens viven en Expo SecureStore.
