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

- App móvil Expo (`apps/mobile`) y sistema de diseño (`packages/ui`): todas las pantallas v1, deep links `/i/<código>`, push, caché offline (7 días), UI optimista, bloqueo de capturas en pantallas secretas. 108 tests de app + UI. Bundle Android de 5,5 MB.
- Workflow e2e Android con Maestro en emulador (API local + MongoDB) y APK de prueba que se genera tras cada despliegue a staging.
- Material de tiendas en `docs/tienda/` (ficha de Play, seguridad de datos, clasificación de contenido) y política de privacidad publicada por la API en `/privacidad`.

## En curso
- e2e en CI completo (flujos 01 a 04, modo oscuro, red lenta y sin conexión) en verde. La revisión UX de las capturas encontró y corrigió: viñetas sin texto en la bienvenida, chips apretados en la tarjeta de grupo y el chat vacío que se veía al revés en Android.
- Staging desplegado en https://entre-nos-api-staging.panter.workers.dev con todos los secretos (Google, login de prueba, contacto, push). Cada despliegue de staging publica un APK de prueba como artifact de *Deploy API*. Staging y producción comparten el clúster de Atlas con bases separadas (ADR-0014).
- Spike de latencia: ~1 s por petición si el Worker corre lejos de Atlas, 106 ms si corre a su lado. La API queda fijada en `us-east-1` (ADR-0013).

## Falta
- Capturas de tienda (salen de la revisión UX).

## Bloqueado / espera al dueño
- 12 testers para la prueba cerrada de Google Play.
