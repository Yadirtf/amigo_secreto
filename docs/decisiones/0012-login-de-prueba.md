# ADR-0012 — Inicio de sesión de prueba (solo staging)

**Fecha:** 2026-11-27 · **Estado:** Aceptada

## Contexto
Google Sign-In exige crear clientes OAuth con la huella SHA-1 del certificado de firma, y no se puede automatizar en un emulador de CI. Además el dueño quiere probar la app hoy mismo.

## Decisión
- `POST /v1/auth/dev { key, name }` crea o recupera un usuario de prueba (`sub = dev:<nombre>`).
- Solo funciona si `APP_ENV != production` **y** existe el secreto `DEV_LOGIN_KEY`. En producción responde 404 aunque haya llave (test automatizado).
- La app solo muestra "Entrar de prueba" en builds con `EXPO_PUBLIC_DEV_LOGIN=1` (perfil `preview`), nunca en `production`.

## Consecuencias
- La llave queda dentro del APK de prueba; por eso solo sirve contra staging, cuyos datos son de prueba.
- Los e2e de Maestro corren contra una API local en CI con su propia llave.
