# Plan de ejecución — Entre Nos (amigo secreto) v1

Fecha: 27 nov 2026. Alcance: Versión 1 de la ficha. La v2 queda en `docs/BACKLOG-v2.md`.

## Decisiones de la Fase 0 (resumen)

- Nombre: **Entre Nos – amigo secreto**. Paquete: `com.entrenos.amigosecreto` (ADR-0002).
- Plataforma de lanzamiento: **Android**. iOS se mantiene compilable (Expo), sin publicar: no hay cuenta Apple ni Mac.
- Inicio de sesión: **Google**. Apple queda preparado para cuando exista la cuenta de Apple Developer. Sin SMS, sin correo (no hay dominio).
- Dominio: `*.workers.dev` (API y archivos `.well-known` para App Links).
- El organizador define exclusiones, participa por defecto y nunca ve asignaciones.
- Tras el sorteo el grupo se cierra; entrar o salir exige re-sorteo explícito.
- Presupuesto: lo escribe el organizador (acordado con el grupo), nada fijo en código.
- Revelación v1: "¿A quién te tocó?" con suspenso y revelación final sencilla; la proyectable es v2/Premium.
- Chat solo texto (≤ 500 caracteres) con reportar y bloquear. Datos borrados 60 días después de la entrega. Clasificación 13+.
- Premium preparado pero apagado; el límite de 10 personas es un interruptor de servidor, apagado.
- Fotos comprimidas (~30 KB) en MongoDB.
- Secretos solo en GitHub Secrets / Cloudflare; todo despliega desde GitHub Actions (el repo es público: minutos ilimitados).

## Riesgo principal: Play Console personal

La cuenta personal exige **prueba cerrada con 12 testers durante 14 días** antes de producción.
Para llegar a mediados de diciembre hay que subir una primera versión a prueba cerrada **lo antes posible (meta: 2 dic)**
y que los 12 testers la instalen ese mismo día. Producción realista: ~16–17 dic.

## Equipo (subagentes)

| Rol | Responsabilidad principal |
|---|---|
| Arquitecto/backend | Monorepo, `domain`, `contracts`, API Hono, MongoDB, auth/JWT, OpenAPI |
| Móvil | App Expo, pantallas v1, deep links, push, caché offline |
| UX/UI | Identidad, tokens, flujos, checklist de fricción, revisión de pantallas |
| Seguridad (red team) | STRIDE, OWASP API/MASVS, tests de seguridad en CI, informe |
| QA | Vitest, integración Workers, Maestro e2e Android, red lenta |
| DevOps | GitHub Actions, despliegue staging/producción, Dependabot, `DEPLOY.md` |

## Fases

| # | Fase | Fechas meta | Entregables | Terminado cuando |
|---|---|---|---|---|
| 1 | Fundaciones | 27–28 nov | Monorepo pnpm, CI (lint, tipos, tests, audit, secretos, CodeQL), workflow del spike MongoDB-en-Workers, ADRs iniciales. En paralelo: identidad visual y flujos (UX), modelo de amenazas (seguridad) | CI verde en `main`; spike ejecutado con latencia medida (requiere secretos) |
| 2 | Dominio y API | 28 nov–1 dic | Entidades, sorteo con exclusiones (tests de propiedades), casos de uso, API Hono + Mongo, auth Google + JWT con refresh rotativo, OpenAPI | Cobertura dominio ≥ 90 %; integración verde; seguridad revisó la autorización |
| 3 | App móvil | 29 nov–4 dic | Sistema de diseño `ui`, todas las pantallas v1, deep links, push, caché offline, APK de prueba | Flujos críticos funcionan en Android contra staging |
| 3b | Prueba cerrada | 2 dic | AAB firmado subido a Play Console (lo subes tú) | 12 testers inscritos |
| 4 | Endurecimiento | 3–7 dic | Ataque red team + correcciones, Maestro e2e en CI, red lenta, revisión UX pantalla por pantalla | 0 hallazgos críticos/altos; UX aprobada claro/oscuro |
| 5 | Publicación | 7–9 dic | Íconos, splash, capturas, textos de tienda, política de privacidad, seguridad de datos, clasificación | Material listo; solo faltan tus pasos |
| 6 | Entrega final | ~9 dic | Resumen, cómo probar, ADRs, límites gratis, tus pasos, backlog v2 | — |

## Reglas de trabajo

Ramas por funcionalidad, PRs pequeños, CI verde antes de cada merge, Conventional Commits,
decisiones en `docs/decisiones/` (ADR), avance en `docs/PROGRESO.md`.
