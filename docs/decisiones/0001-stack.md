# ADR-0001 — Stack: Expo + Cloudflare Workers + MongoDB Atlas

**Fecha:** 2026-11-27 · **Estado:** Aceptada (pendiente del spike)

## Contexto
La ficha proponía Firebase. El dueño del producto decidió reemplazarlo por Cloudflare Workers + MongoDB Atlas M0, todo en capas gratuitas, con usuarios de baja conectividad en Colombia.

## Decisión
- App: React Native con Expo (SDK 58), TypeScript estricto, Expo Router, TanStack Query, Zustand.
- API: Cloudflare Workers + Hono, con `nodejs_compat` y el driver oficial `mongodb`.
- Contratos: Zod en `packages/contracts`, compartidos entre app y API.
- Push: Expo Push Notifications (FCM por debajo en Android).
- Plan B si el spike falla: la misma API Hono en Render (Node), sin tocar dominio ni contratos.

## Consecuencias
- El spike (workflow `spike-mongo.yml`) debe confirmar conexión, lectura/escritura y latencia antes de desplegar la API real.
- Estrategia de conexión: ~~un `MongoClient` por isolate reutilizado entre peticiones~~ **reemplazada por [ADR-0013](0013-conexion-mongo-por-peticion.md)**: un cliente por petición, `maxPoolSize` 1, timeouts cortos (connect 5 s, serverSelection 5 s).
