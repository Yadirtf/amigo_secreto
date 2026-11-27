# ADR-0003 — Arquitectura limpia y monorepo

**Fecha:** 2026-11-27 · **Estado:** Aceptada

## Decisión
- Monorepo pnpm: `apps/mobile`, `apps/api`, `packages/domain`, `packages/contracts`, `packages/ui`.
- `packages/domain`: entidades, reglas (sorteo, códigos, validaciones), puertos y casos de uso. TypeScript puro. Una regla de ESLint (`no-restricted-imports`) prohíbe importar Hono, MongoDB, Expo, React, Zod o `node:*` desde el dominio.
- Los casos de uso reciben sus dependencias de forma explícita (`deps`) y devuelven *vistas* ya filtradas: el dominio decide qué datos ve cada actor, no la capa HTTP.
- `packages/domain/testing` trae adaptadores en memoria para pruebas.
- Concurrencia optimista: el grupo tiene `version`; los cambios se reintentan hasta 3 veces.
- Turborepo no se usa por ahora: con 5 paquetes `pnpm -r` basta.
