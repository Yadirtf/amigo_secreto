# ADR-0013: Conexión a MongoDB, un cliente por petición

- **Estado:** Aceptada (27 de noviembre de 2026). Reemplaza la estrategia de conexión de [ADR-0001](0001-stack.md).
- **Contexto:** la primera corrida de los e2e levantó la API con `wrangler dev` (el mismo runtime `workerd` de producción) contra MongoDB. La primera petición funcionaba; las siguientes fallaban con `MongoNetworkError` y el aviso _"A promise was resolved or rejected from a different request context"_. En Workers, un socket TCP pertenece a la petición que lo abrió: no se puede reutilizar desde otra. Un `MongoClient` guardado por isolate (lo que proponía ADR-0001) queda inservible después de la primera petición.

## Decisión
- Cada petición (y cada corrida del cron) crea su propio `MongoClient` con `maxPoolSize: 1` y `serverMonitoringMode: 'poll'`.
- El cliente se conecta solo cuando hace falta: `/health`, `/i/<código>`, `/privacidad` y `assetlinks` no abren conexión.
- El middleware cierra el cliente con `waitUntil` **después** de la respuesta y de los envíos push de esa petición. Cada petición tiene su propia cola de trabajo en segundo plano (`BackgroundQueue`), así una petición nunca cierra la conexión de otra.
- La llave de cifrado de asignaciones (solo criptografía, sin I/O) sí se reutiliza dentro del isolate.

## Consecuencias
- **Costo:** cada petición paga el saludo TCP + TLS + autenticación con Atlas. En local son ~15 ms; contra Atlas se espera entre 100 y 400 ms según la región. El spike (`apps/spike`, workflow `spike-mongo.yml`) mide exactamente esta estrategia con 20 peticiones; el resultado se anota aquí cuando haya secretos.
- **Conexiones:** M0 permite 500 conexiones simultáneas. Con 1 conexión de trabajo más el monitoreo por petición, el límite queda lejos para el tráfico esperado de un amigo secreto.
- **Plan B:** si la latencia medida pasa de ~600 ms en p50, la API pasa a un servicio Node siempre encendido en Render (capa gratis) con un pool compartido, sin tocar el dominio ni los contratos.
- Hay una prueba de regresión que verifica que la conexión se cierra después del trabajo en segundo plano, y otra que valida el flujo completo contra MongoDB real en CI.
