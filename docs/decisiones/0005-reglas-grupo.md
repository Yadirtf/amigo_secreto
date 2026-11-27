# ADR-0005 — Reglas del grupo, re-sorteo y revelación

**Fecha:** 2026-11-27 · **Estado:** Aceptada

- El organizador define exclusiones y participa por defecto ("solo organizo" es opcional). Nunca ve asignaciones ajenas.
- Las exclusiones son **visibles para todos los miembros** (transparencia, recomendación del red team).
- El presupuesto lo escribe el organizador (acordado con el grupo); nunca está fijo en el código.
- Tras el sorteo el grupo se cierra: nadie entra ni sale. Para cambiar miembros, el organizador **reabre** el grupo (borra asignaciones y chats) y vuelve a sortear.
- **Re-sorteo** explícito con confirmación: máximo 2 re-sorteos (3 sorteos en total), todos los miembros reciben aviso y `drawCount` es visible para todos.
- Tras el sorteo la fecha de entrega solo puede moverse hacia adelante.
- **Revelación** v1 (sencilla): la activa el organizador desde el día de entrega (hora de Colombia) o se activa sola al día siguiente. Después todos ven todas las parejas. La revelación animada para proyectar queda para v2/Premium.
- Límite de 10 personas del plan gratuito: interruptor `maxMembersFree` en el servidor, **apagado** en v1 porque Premium aún no se puede pagar.
