# ADR-0014: Staging y producción comparten un clúster de Atlas

- **Estado:** Aceptada (27 de noviembre de 2026).
- **Contexto:** el plan inicial pedía dos cadenas de conexión (`MONGODB_URI_STAGING` y `MONGODB_URI_PRODUCTION`). El Ing. Yadir tendrá solo la de producción. Atlas permite un único clúster M0 gratis por proyecto, así que un segundo clúster implicaría otro proyecto de Atlas o pagar.

## Decisión
- Staging y producción usan el mismo clúster y se separan por **base de datos**: `entrenos_staging` y `entrenos`.
- El nombre de la base va en la variable `MONGODB_DB` de `apps/api/wrangler.toml` (una por entorno) y tiene prioridad sobre la base que venga en la cadena. El script de índices y el workflow de despliegue usan el mismo nombre.
- Si en el futuro existe `MONGODB_URI_STAGING`, el despliegue de staging la usa automáticamente; sin ella, usa la de producción.
- El spike escribe en su propia base, `entrenos_spike`.

## Consecuencias
- **Aislamiento de datos:** cada entorno solo lee y escribe su base; los datos de prueba nunca se mezclan con los reales.
- **Límites compartidos:** los 512 MB de almacenamiento y las 500 conexiones de M0 se reparten entre los dos entornos. Para el tamaño de los datos ([rendimiento.md](../rendimiento.md)) sobra espacio, pero una prueba de carga en staging sí afecta a producción.
- **Credenciales:** el mismo usuario de base de datos ve ambas bases. Si se quiere aislamiento total, basta crear un usuario limitado a `entrenos_staging` y guardar su cadena en `MONGODB_URI_STAGING`, sin cambiar código.
