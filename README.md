# Entre Nos – amigo secreto

App para organizar el amigo secreto de diciembre sin papelitos ni enredos: sorteo justo, lista de deseos, chat anónimo y revelación.

- Ficha del producto: [`Amigo secreto — Ficha de proyecto.md`](./Amigo%20secreto%20—%20Ficha%20de%20proyecto.md)
- Plan de ejecución: [`docs/PLAN.md`](docs/PLAN.md) · Avance: [`docs/PROGRESO.md`](docs/PROGRESO.md)
- Decisiones: [`docs/decisiones/`](docs/decisiones/) · Seguridad: [`docs/seguridad/`](docs/seguridad/) · UX: [`docs/ux/`](docs/ux/)

## Estructura

```
apps/mobile        Expo (React Native) — Android primero
apps/api           Cloudflare Worker (Hono) + MongoDB Atlas
apps/spike         Prueba del driver de MongoDB en Workers
packages/domain    Entidades, reglas y casos de uso (TypeScript puro)
packages/contracts Esquemas Zod compartidos app ↔ API
packages/ui        Sistema de diseño (tokens y componentes)
```

## Desarrollo

```bash
corepack enable
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

Requiere Node 22+. Despliegue y builds: ver `docs/DEPLOY.md`.
