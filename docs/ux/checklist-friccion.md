# Checklist de fricción y accesibilidad — revisión de pantallas

Versión 1.0 · 27 nov 2026 · Rol: UX/UI
Uso: en la Fase 4 (y en cada PR que toque una pantalla) UX revisa cada pantalla con esta lista, **en claro y en oscuro**, en un Android de gama media real o emulador (pantalla de 360 × 800 dp), con fuente del sistema al 100 % y al 200 %, y con TalkBack encendido.
Referencias: [`flujos.md`](flujos.md) (copia exacta y comportamiento), [`guia-de-estilo.md`](guia-de-estilo.md) (tokens y componentes).

## Cómo se decide

- **Bloqueante (B):** si falla, la pantalla se **rechaza**.
- **Importante (I):** si fallan 3 o más en una pantalla, se rechaza; si fallan 1–2, se aprueba con observaciones y se crea issue.
- **Deseable (D):** se anota, no bloquea.

Resultado por pantalla: **Aprobada** · **Aprobada con observaciones** (lista de issues) · **Rechazada** (lista de bloqueantes). Se deja como comentario en el PR con el formato del final.

## A. Criterios globales (aplican a todas las pantallas)

### A1. Fricción
| # | Criterio | Nivel | Cómo verificar |
|---|---|---|---|
| A1.1 | La acción principal de la pantalla se completa en **≤ 3 toques** desde que se llega (sin contar escribir) | B | Contar toques con la tabla "Resumen de toques" de `flujos.md` |
| A1.2 | Hay como máximo **un** botón `primary` visible | B | Inspección |
| A1.3 | La acción principal está en la zona del pulgar (fija abajo en formularios) y **no la tapa el teclado** | B | Abrir teclado en cada campo |
| A1.4 | Valores por defecto inteligentes donde aplica (fecha, nombre de Google, "solo organizo" apagado) | B | Comparar con `flujos.md` |
| A1.5 | El **teclado correcto** para cada campo (`number-pad` dinero, `url` enlaces, código sin autocorrección y en mayúsculas, `words` nombres) y `returnKeyType` lleva al siguiente campo | B | Tocar cada campo |
| A1.6 | **Nunca una pantalla en blanco**: carga con Skeleton (o caché), lista vacía con EmptyState y acción, error con mensaje + "Reintentar" | B | Modo avión, cuenta nueva, red lenta (3G simulado) |
| A1.7 | Se pide **confirmación solo para lo destructivo o irreversible** (sortear de nuevo, abrir grupo sorteado, quitar persona, salir, eliminar grupo/cuenta, bloquear, revelar, sortear). Nada más pide "¿Seguro?" | B | Recorrer todas las acciones |
| A1.8 | Los diálogos de confirmación dicen la consecuencia y el botón usa el verbo exacto (nunca "Sí/No/Aceptar") | B | Leer |
| A1.9 | Lo escrito **no se pierde** por un error de red, al rotar, al ir a otra app o al volver atrás por accidente | B | Escribir, activar modo avión, enviar; salir y volver |
| A1.10 | Los errores dicen **qué pasó y qué hacer**, con la copia de `flujos.md`, y el foco va al campo con error | B | Forzar cada error |
| A1.11 | Validación al enviar o al salir del campo, no mientras escribe | I | Escribir mal |
| A1.12 | Respuesta visual < 100 ms a cada toque (estado pressed); acciones de red muestran loading en el mismo botón | I | Inspección / red lenta |
| A1.13 | Los datos en caché aparecen al instante al abrir (sin spinner si ya hay datos) | I | Abrir la app en modo avión |
| A1.14 | No se piden permisos fuera de contexto (notificaciones tras crear/unirse; cámara al tocar "Tomar foto") | B | Instalación limpia |
| A1.15 | El botón atrás de Android hace lo esperado (cierra hoja → cierra diálogo → pantalla anterior); no saca de la app en mitad de un flujo | I | Probar |

### A2. Accesibilidad
| # | Criterio | Nivel | Cómo verificar |
|---|---|---|---|
| A2.1 | Todo objetivo táctil ≥ **48 × 48 dp** (incluye íconos de la barra, cerrar, copiar, enviar) y separados ≥ 8 dp | B | Ajustes de desarrollador → "Mostrar límites de diseño" / Accessibility Scanner |
| A2.2 | Todo control tiene `accessibilityLabel` en español claro, `accessibilityRole` y `accessibilityState` correctos | B | TalkBack: recorrer la pantalla completa |
| A2.3 | Con fuente al **200 %** nada se corta ni se superpone, todo es alcanzable con scroll, los botones crecen | B | Ajustes → Tamaño de fuente máximo + tamaño de pantalla grande |
| A2.4 | **Nada se comunica solo con color** (errores con ícono + texto, estados con chip con texto, selección con check) | B | Ver en escala de grises (Ajustes de desarrollador → Simular espacio de color → Monocromía) |
| A2.5 | Solo se usan parejas de color de la tabla de contraste verificada (§1.3 de la guía); ningún color "a mano" | B | Revisar código: no hay hex fuera de `tokens.json` |
| A2.6 | Funciona igual de bien en **oscuro** (sin textos invisibles, sin fondos blancos sueltos, imágenes con fondo transparente bien) | B | Cambiar tema del sistema |
| A2.7 | Orden de foco de TalkBack = orden visual; al abrir hoja o diálogo el foco va a su título y vuelve al cerrar | I | TalkBack |
| A2.8 | Cambios importantes se anuncian (sorteo hecho, error, toast) | I | TalkBack |
| A2.9 | Con "Quitar animaciones" activado: sin confeti, sin rebotes, sin giros; todo sigue funcionando | B | Ajustes → Accesibilidad → Quitar animaciones |
| A2.10 | Imágenes decorativas ocultas al lector; avatares junto al nombre no se leen dos veces | D | TalkBack |
| A2.11 | Todo gesto (mantener presionado, deslizar) tiene alternativa con un toque / acción de accesibilidad | B | TalkBack |

### A3. Consistencia visual y copia
| # | Criterio | Nivel |
|---|---|---|
| A3.1 | Solo componentes del paquete `ui`; textos con variantes de la guía; espaciados de la escala; sin `fontSize` ni colores sueltos | I |
| A3.2 | Copia **idéntica** a `flujos.md` (tuteo, tildes, signos de apertura ¿ ¡, "a. m."/"p. m.") | I |
| A3.3 | Dinero en formato "$ 50.000" y fechas en `es-CO` | B |
| A3.4 | Margen lateral `gutter` 20 dp; nada pegado a los bordes; respeta áreas seguras (notch, barra de gestos) | I |
| A3.5 | Hápticos solo en los eventos de la tabla §8.3 de la guía | D |
| A3.6 | Privacidad: en ninguna pantalla compartida, notificación, vista previa de tareas recientes ni toast aparece a quién le tocó quién (salvo S8/S10 al propio usuario y S11) | B |

## B. Criterios por pantalla

Además de los globales:

### S1 Bienvenida + Google
- [ ] B · Un solo botón "Continuar con Google" según la guía de marca de Google; entra en 2 toques.
- [ ] B · Cancelar el selector de Google no muestra error.
- [ ] B · Si llegó por invitación, se ve la tarjeta "{organizador} te invitó a {grupo}" y tras entrar sigue a S4b sin perder el código.
- [ ] I · Sin carrusel ni pantallas de onboarding adicionales; sin pedir nombre (viene de Google).
- [ ] I · Enlaces de Términos/Privacidad con objetivo ≥ 48 dp.

### S2 Mis grupos
- [ ] B · Cuenta nueva: EmptyState "Arma tu primer amigo secreto" con "Crear grupo" y "Tengo un código".
- [ ] B · "Crear grupo" y "Unirme con código" visibles sin scroll en todo momento.
- [ ] B · Grupo sorteado sin abrir muestra "Ver a quién te tocó" que lleva a S8 en 1 toque.
- [ ] I · Orden: pendientes primero, luego por fecha de entrega.
- [ ] I · Tarjeta legible por TalkBack como un solo elemento con nombre, personas, fecha, cuenta regresiva y estado.
- [ ] I · Deslizar para refrescar.

### S3 Crear grupo
- [ ] B · Se completa en **≤ 30 s** por alguien que lo usa por primera vez (prueba cronometrada con 3 personas, incluida una de 50+ años).
- [ ] B · El nombre tiene foco al entrar; "siguiente" del teclado pasa al presupuesto.
- [ ] B · Fecha preseleccionada con la regla del 24 dic (o hoy + 7); chips de fecha rápida; "Otra fecha" no permite fechas pasadas.
- [ ] B · Presupuesto con teclado numérico, "$" fijo, punto de miles en vivo; sin valor por defecto.
- [ ] B · "Solo organizo, no participo" apagado por defecto y explicado.
- [ ] B · La foto es opcional y no bloquea la creación.
- [ ] I · Al crear, abre S5 con la hoja "Invita a tu gente" ya abierta.

### S4 / S4b Unirse
- [ ] B · Por enlace: 1 toque ("Unirte a este grupo") con la vista previa del grupo.
- [ ] B · Por código: mayúsculas automáticas, sin autocorrección, acepta pegar un enlace completo, busca solo al completar los 10 caracteres (formato XXXXX-XXXXX, el guion se pone solo).
- [ ] B · Confirma el grupo con vista previa antes de unirse.
- [ ] B · Cada error de la tabla de S4 muestra su mensaje exacto (código inexistente, ya sorteado, terminado, ya eres miembro → navega sin error).
- [ ] I · El portapapeles solo se lee al tocar "Pegar".

### S5 Detalle del grupo
- [ ] B · Banner de privacidad visible antes del sorteo (versión organizador y miembro).
- [ ] B · Invitar por WhatsApp en ≤ 3 toques; si no hay WhatsApp, cae al compartir del sistema.
- [ ] B · "Hacer el sorteo" en verde (`secondary`), con confirmación; con < 3 personas explica cuántas faltan en vez de quedar gris sin razón.
- [ ] B · "Sortear de nuevo", "Agregar o quitar personas", "Quitar del grupo", "Salir", "Eliminar grupo" con diálogo destructivo y consecuencias.
- [ ] B · El organizador nunca ve asignaciones de otros en ninguna parte.
- [ ] I · Código del grupo copiable con 1 toque y toast "Código copiado".
- [ ] I · Vista del miembro no muestra controles del organizador (ni deshabilitados).

### S6 Exclusiones
- [ ] B · Exclusiones mutuas y explicadas ("Funciona en los dos sentidos").
- [ ] B · Verificación en vivo: "El sorteo es posible" o el mensaje que dice **quién** queda sin opciones y qué ajustar.
- [ ] B · Marcar una casilla = 1 toque en la fila completa (≥ 56 dp); estado con check, no solo color.
- [ ] I · Se guarda sin pedir confirmación.

### S7 Sorteo
- [ ] B · Confirmación previa que explica que el grupo se cierra.
- [ ] B · Animación con duración mínima 1,8 s y sin bloquear si el servidor tarda (timeout 15 s con mensaje).
- [ ] B · Error de exclusiones imposibles muestra el nombre (si el servidor lo da) y el atajo "Revisar exclusiones".
- [ ] B · Con "Quitar animaciones": indicador simple + resultado.
- [ ] I · Háptico de éxito y anuncio "Sorteo hecho".

### S8 ¿A quién te tocó?
- [ ] B · Paso de privacidad "Asegúrate de que nadie esté mirando tu pantalla".
- [ ] B · Mantener presionado 1,2 s con anillo de progreso y hápticos crecientes; soltar antes no revela.
- [ ] B · Alternativa accesible: acción "Abrir regalo" con TalkBack revela de una.
- [ ] B · Confeti sutil (≤ 40 partículas), una sola vez; ninguno con "Quitar animaciones".
- [ ] B · Usa los tokens del tema oscuro siempre; nombre en `accent` legible.
- [ ] I · Acciones siguientes claras: "Ver su lista de deseos" / "Escribirle en secreto" (o solo chat si la lista está vacía).
- [ ] I · La vista de tareas recientes no muestra el nombre (usar `expo-screen-capture` → `preventScreenCaptureAsync` o equivalente mientras está el nombre visible; decisión con seguridad).

### S9 Mi lista de deseos
- [ ] B · Agregar idea: 1 toque para abrir, escribir, 1 toque para guardar; la hoja queda lista para otra.
- [ ] B · Talla con chips (XS–XXL + Otra) y enlace con teclado `url` sin mayúsculas ni autocorrección.
- [ ] B · Eliminar sin diálogo, con "Deshacer".
- [ ] I · Enlace mostrado como dominio; abre en navegador externo.
- [ ] I · EmptyState "Ayúdale a tu amigo secreto" con botón.

### S10 / S10b Mi amigo secreto y chat
- [ ] B · Nombre oculto por defecto con "Mostrar" (TalkBack lo dice).
- [ ] B · El banner deja claro quién es anónimo en cada chat.
- [ ] B · Contador desde 400, tope 500, mensaje "Máximo 500 caracteres."
- [ ] B · Reportar (mantener presionado → "Reportar mensaje") y bloquear (⋮) a ≤ 2 toques; bloquear con confirmación; reportar sin culpa ni fricción extra.
- [ ] B · Mensaje fallido se reintenta con un toque; lo escrito no se pierde.
- [ ] I · El campo de texto sube con el teclado y la última burbuja queda visible.
- [ ] I · Burbujas propias vs recibidas distinguibles por posición **y** color.

### S11 Revelación final
- [ ] B · Muestra quién te regaló y la lista completa; tu fila resaltada con fondo **y** posición/negrita.
- [ ] B · Informa la fecha de borrado de datos.
- [ ] I · Compartir en WhatsApp como texto plano.

### S12 Perfil y ajustes
- [ ] B · "Eliminar mi cuenta" a ≤ 2 toques desde Perfil (exigencia de Play), con diálogo que explica consecuencias según el caso (grupos sorteados, organizador).
- [ ] B · El tema sigue al sistema y la pantalla lo explica.
- [ ] I · Nombre se guarda al salir del campo, sin botón "Guardar".
- [ ] I · Cerrar sesión sin confirmación.

### Notificaciones
- [ ] B · Ningún push contiene nombres de asignaciones ni el texto de los mensajes.
- [ ] B · Cada push abre la pantalla indicada en la tabla de `flujos.md`.
- [ ] B · Canales de Android creados con los nombres en español.
- [ ] I · Recordatorios no llegan entre 9:00 p. m. y 7:00 a. m.

## C. Formato del informe de revisión (comentario en el PR)

```
Revisión UX — {pantalla} — {fecha}
Dispositivo: {modelo/emulador}, Android {versión}
Resultado: Aprobada | Aprobada con observaciones | Rechazada

Claro 100 %: OK/Falla   Oscuro 100 %: OK/Falla   Fuente 200 %: OK/Falla   TalkBack: OK/Falla   Sin animaciones: OK/Falla
Toques acción principal: {n} (máx. 3)

Bloqueantes:
- [A2.3] El botón "Crear grupo" corta el texto con fuente 200 %. → usar minHeight en vez de height.
Importantes:
- ...
Deseables:
- ...
Capturas: {claro}, {oscuro}, {200 %}
```
