# ADR-0004 — Algoritmo del sorteo

**Fecha:** 2026-11-27 · **Estado:** Aceptada

## Decisión
1. Participantes únicos, mínimo 3. Las exclusiones son simétricas (pareja, misma casa).
2. Cada participante debe conservar al menos **2 posibles destinatarios** tras las exclusiones; si no, se rechaza y se nombra a quién ajustar. Evita que el organizador fuerce una pareja concreta.
3. Muestreo por rechazo: permutaciones uniformes (Fisher–Yates) hasta 300 intentos. Da una distribución uniforme entre los sorteos válidos en el caso común.
4. Si no sale (grupos muy restringidos), emparejamiento bipartito aleatorizado (caminos aumentantes). Siempre encuentra solución si existe.
5. Si es imposible, se devuelve un testigo de Hall (personas cuyo conjunto de opciones es menor que ellas mismas) para un mensaje que diga qué ajustar.
6. Aleatoriedad: `crypto.getRandomValues` con rechazo para evitar sesgo de módulo (adaptador en la API).
7. Pruebas basadas en propiedades (fast-check, más de 8.000 casos): validez, sin falsos "imposible" (fuerza bruta en grupos pequeños), testigo correcto y uniformidad aproximada.
