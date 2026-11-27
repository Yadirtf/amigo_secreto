# Formulario "Seguridad de los datos" (Google Play)

| Pregunta | Respuesta |
|---|---|
| ¿La app recopila o comparte datos del usuario? | Sí, recopila. **No comparte** con terceros. |
| ¿Los datos se cifran en tránsito? | Sí (HTTPS/TLS en todas las conexiones). |
| ¿Los usuarios pueden pedir que se borren sus datos? | Sí: *Perfil → Eliminar mi cuenta* dentro de la app. Además los grupos se borran solos 60 días después de la entrega. |
| ¿Cumple la política de Familias? | No aplica (clasificación 13+). |

## Tipos de datos recopilados
| Categoría | Dato | ¿Obligatorio? | Uso |
|---|---|---|---|
| Información personal | Nombre | Sí | Funcionalidad de la app (mostrarte en tus grupos) |
| Información personal | Correo electrónico | Sí (lo entrega Google al iniciar sesión) | Gestión de la cuenta |
| Información personal | ID de usuario | Sí | Gestión de la cuenta |
| Fotos | Foto de perfil o de grupo | No (opcional) | Funcionalidad de la app |
| Mensajes | Mensajes del chat anónimo | No | Funcionalidad de la app |
| Contenido generado | Lista de deseos | No | Funcionalidad de la app |
| ID del dispositivo | Token de notificaciones push | No | Funcionalidad (avisos) |

No se recopilan: ubicación, contactos, datos financieros, salud, historial web, identificadores de publicidad. No hay analítica de terceros ni anuncios.
Procesado efímero: no. Los datos viven en MongoDB Atlas (EE. UU.) y la API en Cloudflare.
