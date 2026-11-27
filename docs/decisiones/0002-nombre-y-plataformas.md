# ADR-0002 — Nombre, paquete y plataformas de lanzamiento

**Fecha:** 2026-11-27 · **Estado:** Aceptada

## Contexto
El dueño eligió "Entre Nos – amigo secreto" (escribió "Etre Nos"; se interpreta como "Entre Nos"). No tiene cuenta de Apple Developer ni Mac. La cuenta de Play Console es personal.

## Decisión
- Nombre visible: **Entre Nos – amigo secreto**. Nombre corto en el ícono: **Entre Nos**.
- Identificador: `com.entrenos.amigosecreto` (Android `package` e iOS `bundleIdentifier`). Es definitivo solo al publicar la primera versión.
- Esquema de deep link: `entrenos://`. App Links sobre el dominio `*.workers.dev` de la API.
- Lanzamiento solo en **Android**. iOS se mantiene compilable con Expo pero no se publica.
- Por la cuenta personal de Play: prueba cerrada de 14 días con 12 testers antes de producción; se sube un AAB lo antes posible.

## Consecuencias
- "Iniciar sesión con Apple" queda preparado en el código pero desactivado hasta que exista la cuenta (es obligatorio en iOS si se ofrece Google).
