# Progreso — Entre Nos v1

Última actualización: 2026-11-27

## Listo
- Fase 0: preguntas, respuestas y plan (`docs/PLAN.md`).
- Monorepo pnpm, ESLint (con regla de arquitectura limpia), Prettier, TypeScript estricto.
- `packages/domain`: sorteo con exclusiones (tests de propiedades), casos de uso de usuarios, grupos, sorteo, re-sorteo, revelación, lista de deseos, chat anónimo y tareas programadas. 85 tests, cobertura 99 % de líneas.
- `packages/contracts`: esquemas Zod estrictos compartidos.
- 10 ADRs en `docs/decisiones/`.
- Modelo de amenazas en `docs/seguridad/modelo-de-amenazas.md`.
- CI: lint, tipos, tests con cobertura, `pnpm audit`, gitleaks, CodeQL, Dependabot.
- Workflow del spike MongoDB-en-Workers (`spike-mongo.yml`).

## En curso
- Identidad visual y flujos (UX).
- API Hono + adaptadores MongoDB + autenticación con Google.

## Falta
- App móvil, push, deep links, caché offline.
- Endurecimiento: red team, e2e Maestro, red lenta, revisión UX.
- Material de tiendas, política de privacidad, `docs/DEPLOY.md`.

## Bloqueado / espera al dueño
- Secretos en GitHub para el spike y los despliegues: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MONGODB_URI_STAGING`, `MONGODB_URI_PRODUCTION`.
- 12 testers para la prueba cerrada de Google Play.
