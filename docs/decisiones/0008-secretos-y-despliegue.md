# ADR-0008 — Secretos y despliegue desde GitHub Actions

**Fecha:** 2026-11-27 · **Estado:** Aceptada

- El entorno de desarrollo en la nube no alcanza Cloudflare, Atlas ni Expo. Todo despliegue corre en GitHub Actions.
- Los secretos solo viven en GitHub Secrets y en Cloudflare (`wrangler secret`). Nunca en el repo ni en el bundle de la app.
- Dos entornos: `staging` (Worker `entre-nos-api-staging`, base `entrenos_staging`) y `production` (Worker `entre-nos-api`, base `entrenos_prod`), cada uno con su propio usuario de base de datos de mínimo privilegio.
- Merge a `main` despliega a staging; producción se despliega con el workflow manual o con un tag `v*`.
- El repo es público, así que los minutos de Actions son gratis.
