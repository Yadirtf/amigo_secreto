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

- Identidad visual "Sobremesa", guía de estilo, tokens, flujos y checklist de fricción (`docs/ux/`).
- API Hono sobre Workers: todos los endpoints de `docs/API.md`, Google Sign-In, JWT de 15 min con refresh rotativo, rate limiting en MongoDB, asignaciones cifradas en reposo, landing de invitación, App Links, OpenAPI en `/v1/openapi.json`, cron diario (cuenta regresiva, revelación automática, purga). 20 tests de API (incluye IDOR en cada endpoint) + tests de integración con MongoDB real en CI.
- Workflow de despliegue (`deploy-api.yml`) y guía `docs/DEPLOY.md`.

- Red team ronda 2 (`docs/seguridad/informe-pentest.md`): 2 altos y 4 medios encontrados; **todos los altos corregidos**, 0 críticos/altos abiertos. 30 tests de regresión de seguridad en CI.

## En curso
- App móvil Expo (pantallas v1, sistema de diseño).

## Falta
- App móvil, push, deep links, caché offline.
- Endurecimiento: red team, e2e Maestro, red lenta, revisión UX.
- Material de tiendas, política de privacidad, `docs/DEPLOY.md`.

## Bloqueado / espera al dueño
- Secretos en GitHub para el spike y los despliegues: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `MONGODB_URI_STAGING`, `MONGODB_URI_PRODUCTION`.
- 12 testers para la prueba cerrada de Google Play.
