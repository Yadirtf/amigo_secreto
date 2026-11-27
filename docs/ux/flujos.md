# Flujos, wireframes y microcopia — Entre Nos v1

Versión 1.0 · 27 nov 2026 · Rol: UX/UI
Tokens y componentes: [`guia-de-estilo.md`](guia-de-estilo.md). Criterios de aprobación: [`checklist-friccion.md`](checklist-friccion.md).

Convenciones de este documento:
- `[ Botón ]` = botón primario, `[[ Botón ]]` = secundario verde (confianza), `( Botón )` = outline/ghost, `{ chip }` = chip, `[__campo__]` = TextField, `▢` = casilla, `◯━` = interruptor, `▓▓▓` = Skeleton.
- Los textos entre comillas son **la copia exacta**. `{variable}` se reemplaza en tiempo de ejecución.
- Rutas sugeridas para `expo-router` entre corchetes, p. ej. `[app/(app)/index.tsx]`.
- Todos los montos en COP con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → "$ 50.000". Fechas cortas "18 dic", largas "viernes 18 de diciembre".

## 0. Mapa de flujos

```
                     ┌──────────────────────────┐
  Abrir app ───────▶ │ ¿Sesión activa?          │
                     └───────┬──────────┬───────┘
                          no │          │ sí
                             ▼          ▼
                     S1 Bienvenida   ¿Llegó por enlace de invitación?
                     + Google           │ sí ───────────────▶ S4b Invitación (1 toque: "Unirme")
                             │          │ no                          │
                             └────▶ S2 Mis grupos ◀──────────────────┘
                                     │    │    │
                     ┌───────────────┘    │    └─────────────┐
                     ▼                    ▼                  ▼
             S3 Crear grupo        S4 Unirse con código   S12 Perfil
                     │                    │
                     └────────▶ S5 Detalle del grupo ◀──────┘
                                │   │   │   │
        ┌───────────────────────┘   │   │   └──────────────────────┐
        ▼                           ▼   ▼                          ▼
  S6 Exclusiones (org.)   S7 Sorteo   S9 Mi lista de deseos   Compartir (WhatsApp)
                              │
                              ▼  (todos reciben push)
                     S8 "¿A quién te tocó?" (suspenso)
                              │
                              ▼
                     S10 Mi amigo secreto ─── S10b Chat secreto (con quien te regala / con tu amigo secreto)
                              │
                              ▼  (organizador revela o día siguiente a la entrega)
                     S11 Revelación final
```

Estados del grupo (el servidor es la fuente de verdad):

| Estado | Significa | Qué se puede hacer |
|---|---|---|
| `abierto` | Recibiendo gente | Unirse, salir, editar datos, exclusiones, sortear (≥ 3 personas que participan) |
| `sorteado` | Hay asignaciones; el grupo está cerrado | Ver a quién te tocó, lista, chat. Organizador: "Agregar o quitar personas" (anula el sorteo, vuelve a `abierto`) o "Sortear de nuevo" |
| `revelado` | Se mostró quién le regaló a quién | Ver revelación, leer chats (solo lectura) |
| `terminado` | Pasaron 60 días de la entrega | Datos borrados; el grupo desaparece de "Mis grupos" |

Reglas transversales:
- **Mínimo 3 personas que participan** para sortear (con 2, cada uno sabría quién le tocó al otro).
- **Exclusiones mutuas**: si Ana no le regala a Beto, Beto tampoco le regala a Ana (parejas, misma casa). Es el modelo mental de la gente; un solo toque.
- **Nunca** se muestra en pantallas compartidas, notificaciones ni vistas previas quién le regala a quién.
- Todo lo que se pueda mostrar desde caché se muestra al instante; la red actualiza en silencio.
- Pantallas con formulario: botón principal **fijo abajo**, encima del teclado.

---

## S1. Bienvenida + inicio de sesión con Google `[app/(auth)/bienvenida.tsx]`

Objetivo: entrar en 1 toque. Sin carrusel de onboarding.

```
┌───────────────────────────────────┐
│                                   │
│          (marca 96 dp)            │
│                                   │
│   El amigo secreto,               │  title1
│   sin papelitos ni enredos        │
│                                   │
│  ✓ Sorteo justo: nadie se saca    │  body, íconos check-circle-2 en secondary
│    a sí mismo                     │
│  ✓ Lista de deseos para atinarle  │
│    al regalo                      │
│  ✓ Pregúntale cosas en secreto    │
│                                   │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ (G)  Continuar con Google     │ │  botón oficial de Google (fondo blanco,
│ └───────────────────────────────┘ │  borde borderStrong, logo G), 52 dp
│  Al continuar aceptas los         │  caption, enlaces subrayados
│  Términos y la Política de        │
│  privacidad.                      │
└───────────────────────────────────┘
```

Microcopia:
- Título: "El amigo secreto, sin papelitos ni enredos"
- Viñetas: "Sorteo justo: nadie se saca a sí mismo" · "Lista de deseos para atinarle al regalo" · "Pregúntale cosas en secreto"
- Botón: "Continuar con Google" (loading: "Entrando…")
- Legal: "Al continuar aceptas los **Términos** y la **Política de privacidad**."
- Si llegó por enlace de invitación, encima del botón aparece una tarjeta: "**{organizador}** te invitó a **{grupo}**" (con foto del grupo si existe), y el título cambia a "Entra para unirte a {grupo}".

Comportamiento:
- El usuario cancela el selector de cuentas de Google → no se muestra error; vuelve a la pantalla.
- Tras entrar por primera vez: si Google trae nombre y foto, se usan sin preguntar (se editan en Perfil). No hay pantalla de "completa tu perfil".
- Tras entrar: si hay invitación pendiente → S4b; si no → S2.

Errores:
- Sin red: Banner error "No hay conexión. Revisa tus datos o el wifi y vuelve a intentar." + botón queda activo.
- Falla Google/servidor: Toast "No pudimos entrar con Google. Intenta otra vez en un momento."
- Google Play Services desactualizado: "Para entrar necesitas actualizar Servicios de Google Play." + ghost "Abrir Play Store".

---

## S2. Mis grupos `[app/(app)/index.tsx]`

```
┌───────────────────────────────────┐
│ Mis grupos                (avatar)│  title1; avatar 40 abre Perfil
│                                   │
│ ┌───────────────────────────────┐ │  GroupCard
│ │ [foto] Oficina 2026  {Faltan  │ │
│ │        12 personas    21 días}│ │
│ │        Entrega 18 dic         │ │
│ │        {🔒 Sorteo hecho}      │ │
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │
│ │ [ F ]  Familia Gómez  {¡Hoy!} │ │
│ │        8 personas · 24 dic    │ │
│ │        {Esperando gente}      │ │
│ └───────────────────────────────┘ │
│                                   │
│ ┌──────────────┐┌───────────────┐ │  barra fija abajo
│ │ + Crear grupo││ (Unirme con   │ │  primary + outline, mitad y mitad
│ └──────────────┘│   código)     │ │
│                 └───────────────┘ │
└───────────────────────────────────┘
```

- Orden: primero los que tienen acción pendiente ("¡Hoy!", "Ver a quién te tocó" sin abrir), luego por fecha de entrega más cercana. Terminados al final con chip "Terminado".
- Si en un grupo sorteado **aún no has visto a quién te tocó**, la tarjeta muestra una franja `accent` abajo: "🎁 Ver a quién te tocó" → lleva directo a S8 (1 toque). (El emoji puede ir como ícono `gift`.)
- Deslizar hacia abajo refresca (`RefreshControl` color `primary`).
- Carga: 3 tarjetas Skeleton (solo si no hay caché).

Estado vacío (primera vez):
```
│          ( ícono gift )           │
│   Arma tu primer amigo secreto    │  title2
│   Crea un grupo e invita a tu     │  body
│   gente por WhatsApp. O únete     │
│   con el código que te mandaron.  │
│        [ Crear grupo ]            │
│      ( Tengo un código )          │
```
- Título: "Arma tu primer amigo secreto"
- Texto: "Crea un grupo e invita a tu gente por WhatsApp. O únete con el código que te mandaron."
- Botones: "Crear grupo" · "Tengo un código"

Error de carga sin caché: EmptyState error — "No pudimos cargar tus grupos" / "Revisa tu conexión y vuelve a intentar." / [ Reintentar ].
Con caché y sin red: lista en caché + Banner error "Sin conexión. Te mostramos lo último guardado."

---

## S3. Crear grupo `[app/(app)/grupos/nuevo.tsx]` — meta ≤ 30 s

Una sola pantalla, 4 campos, 2 obligatorios por escribir (nombre y presupuesto). La fecha ya viene puesta.

```
┌───────────────────────────────────┐
│ ←  Nuevo grupo                    │
│                                   │
│      ( ○ cámara )  Agregar foto   │  opcional, avatarXl 96 + ghost
│                                   │
│ Nombre del grupo                  │
│ [ Ej: Oficina 2026_____________ ] │  autoFocus
│                                   │
│ Fecha de entrega                  │
│ {✓ Jue 24 dic} {Vie 18 dic}       │  chips de fecha rápida
│ {📅 Otra fecha}                   │
│                                   │
│ Presupuesto por regalo            │
│ [ $ |50.000___________________ ]  │  money, number-pad
│ Lo que acordaron entre todos.     │  caption
│                                   │
│ Solo organizo, no participo  ◯━   │  Switch, apagado por defecto
│ Activa esto si no vas a dar ni    │  caption
│ recibir regalo.                   │
│                                   │
│ ┌───────────────────────────────┐ │
│ │        Crear grupo            │ │  fijo abajo, sobre el teclado
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

Campos:
| Campo | Detalle |
|---|---|
| Foto (opcional) | Toca → hoja: "Tomar foto" / "Elegir de la galería" / (si hay) "Quitar foto". `expo-image-picker` con recorte cuadrado; se comprime en el teléfono (~30 KB, 512 px, JPEG 0,7) antes de subir. Sube en segundo plano: no bloquea "Crear grupo". |
| Nombre | `autoFocus`, `autoCapitalize="sentences"`, `maxLength={40}`, `returnKeyType="next"` (pasa a presupuesto). Placeholder: "Ej: Oficina 2026, Familia Gómez". |
| Fecha de entrega | **Por defecto inteligente** (ver abajo). Chips: el 24 de diciembre y el último viernes antes del 24 (típico de fiestas de oficina). "Otra fecha" abre el `DateTimePicker` nativo en modo fecha, mínimo mañana. Al elegir otra, aparece como chip seleccionado "Sáb 12 dic". |
| Presupuesto | Obligatorio. `keyboardType="number-pad"`, prefijo fijo "$", formato con punto de miles **mientras escribe** ("50000" → "50.000"), se guarda como entero de pesos. Sin valor por defecto ni sugerencias fijas (lo acuerda el grupo). Placeholder: "Ej: 50.000". |
| Solo organizo | `Switch`, apagado. |

Por defecto inteligente de la fecha (zona `America/Bogota`):
```ts
const hoy = inicioDelDia(ahora);
let fecha = new Date(hoy.getFullYear(), 11, 24);           // 24 dic de este año
if (diasEntre(hoy, fecha) < 3) fecha = sumarDias(hoy, 7);   // ya pasó o está muy cerca
// chip extra: último viernes antes del 24 dic, solo si faltan ≥ 3 días para él
```
Hoy (27 nov 2026) → seleccionado "Jue 24 dic", chip extra "Vie 18 dic".

Botón: "Crear grupo" (loading: "Creando…"). Activo siempre; al tocar valida y enfoca el primer campo con error.

Validaciones (mensajes exactos):
- Nombre vacío: "Ponle un nombre al grupo para que todos lo reconozcan."
- Presupuesto vacío: "Escribe el presupuesto por regalo, por ejemplo 50.000."
- Presupuesto < 1.000: "El presupuesto tiene que ser de al menos $ 1.000."
- Presupuesto > 10.000.000: "Ese presupuesto parece muy alto. Revisa que no sobren ceros."
- Fecha pasada (si llega del servidor): "La fecha de entrega tiene que ser de mañana en adelante."
- Foto no se pudo usar: Toast "No pudimos usar esa foto. Prueba con otra." (el grupo se crea igual).
- Error de red al crear: Banner "No se pudo crear el grupo. Revisa tu conexión y toca Crear grupo otra vez." (los datos escritos se conservan).

Tras crear → S5 del grupo nuevo con la hoja "Invita a tu gente" abierta automáticamente (ver S5 Invitar) y Toast "¡Listo! Tu grupo está creado." Después de la primera creación se pide permiso de notificaciones (ver §Notificaciones).

Toques: escribir nombre → escribir presupuesto → "Crear grupo" = **1 toque** + 2 escrituras.

---

## S4. Unirse con código `[app/(app)/unirse.tsx]`

```
┌───────────────────────────────────┐
│ ←  Unirme a un grupo              │
│                                   │
│ Escribe el código que te          │  body
│ mandaron                          │
│ ┌───────────────────────────────┐ │
│ │      A B C 2 3 4              │ │  TextField variante code
│ └───────────────────────────────┘ │
│ Son 6 letras y números.  (Pegar)  │  caption + ghost "Pegar"
│                                   │
│ ┌───────────────────────────────┐ │  aparece al validar el código:
│ │ [foto] Oficina 2026           │ │  tarjeta de vista previa
│ │ Organiza: Laura · 12 personas │ │
│ │ Entrega 18 dic · $ 50.000     │ │
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │
│ │      Unirme a este grupo      │ │  fijo abajo
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

- Campo: `autoFocus`, `autoCapitalize="characters"`, `autoCorrect={false}`, `keyboardType="visible-password"` en Android (evita sugerencias), `maxLength={6}`, filtra espacios y guiones al pegar, convierte a mayúsculas.
- Código de 10 caracteres mostrado como `XXXXX-XXXXX`, alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L, U): `23456789ABCDEFGHJKMNPQRSTVWXYZ` (definido en `packages/domain`, ~49 bits; ADR-0005 y modelo de amenazas).
- Al completar los 10 caracteres → busca automáticamente (loading en el campo: "Buscando el grupo…") y muestra la tarjeta de vista previa. **No** se une hasta tocar el botón (el usuario confirma que es el grupo correcto).
- "Pegar": lee el portapapeles **solo al tocar** (no al abrir la pantalla). Si el texto pegado es un enlace de invitación, extrae el código.
- Botón: "Unirme a este grupo" (loading: "Uniéndote…"). Deshabilitado hasta que haya vista previa válida (la razón es evidente: falta el código).

Errores:
- Código no existe: "Ese código no existe. Revisa que esté bien escrito o pide el enlace de nuevo."
- Grupo ya sorteado: "Este grupo ya hizo el sorteo. Pídele a {organizador} que te agregue: tendrá que sortear de nuevo."
- Grupo terminado: "Este amigo secreto ya terminó. Si quieren hacer otro, que alguien cree un grupo nuevo."
- Ya eres miembro: no es error → navega a S5 con Toast "Ya estás en este grupo."
- Grupo lleno (interruptor Premium, hoy apagado): "Este grupo ya tiene {n} personas, el máximo del plan gratis. {organizador} puede pasarlo a Premium para que entren más."
- Demasiados intentos (límite del servidor): "Hiciste muchos intentos seguidos. Espera un minuto y vuelve a probar."

Tras unirse → S5 con Toast "¡Entraste a {grupo}!" y Banner en S5: "Agrega tu lista de deseos para que te atinen al regalo." [ Agregar ideas ]. Luego permiso de notificaciones si no se ha pedido.

### S4b. Invitación por enlace (1 toque) `[app/i/[codigo].tsx]`

Enlaces: App Link `https://{api}.workers.dev/i/{CODIGO}` (abre la app si está instalada; si no, una página que lleva a Play Store y **muestra el código grande** para escribirlo después) y esquema `entrenos://i/{CODIGO}`.

```
┌───────────────────────────────────┐
│                               ✕   │
│          [foto del grupo 96]      │
│   Laura te invitó a               │  body textSecondary
│   Oficina 2026                    │  title1
│                                   │
│   📅 Entrega: viernes 18 de dic.  │  filas con íconos
│   💰 Presupuesto: $ 50.000        │
│   👥 12 personas ya están         │  pila de avatares
│                                   │
│ ┌───────────────────────────────┐ │
│ │     Unirte a este grupo       │ │  primary, fijo abajo
│ └───────────────────────────────┘ │
│          ( Ahora no )             │
└───────────────────────────────────┘
```
- Copia: "{organizador} te invitó a" / "{grupo}" / "Entrega: {fecha larga}" / "Presupuesto: {monto}" / "{n} personas ya están" / botón "Unirte a este grupo" / ghost "Ahora no".
- Sin sesión: S1 primero (con la tarjeta de invitación) y al entrar vuelve aquí **sin perder el código**; si el usuario ya había dado su intención, se puede unir automáticamente tras el login → para evitar sorpresas, se muestra esta pantalla y el toque es el mismo (total: Google + 1 toque).
- Mismos errores que S4.

---

## S5. Detalle del grupo `[app/(app)/grupo/[id]/index.tsx]`

Una pantalla con secciones; cambia según el estado y el rol.

### S5a. Estado `abierto`, vista del organizador

```
┌───────────────────────────────────┐
│ ←  Oficina 2026               ⋮   │  ⋮ = Editar grupo, Eliminar grupo
│ ┌───────────────────────────────┐ │
│ │ 📅 Vie 18 dic   {Faltan 21 d.}│ │  InfoCard: fecha, presupuesto
│ │ 💰 $ 50.000 por regalo        │ │
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │  Banner privacidad (secondarySoft)
│ │ 🔒 El sorteo lo hace la app.  │ │
│ │ Ni tú como organizador vas a  │ │
│ │ saber a quién le tocó quién.  │ │
│ └───────────────────────────────┘ │
│                                   │
│ MIEMBROS (5)          ( Invitar ) │  overline + ghost
│ (L) Laura  {Organizas tú}         │
│ (C) Carlos           ⊘ 1 exclusión│  ⋮ por fila: Quitar del grupo
│ (A) Ana              ⊘ 1 exclusión│
│ (J) Juan                          │
│ (M) Marta                         │
│                                   │
│ ( ⊘ Exclusiones: parejas o misma  │  fila tocable → S6
│     casa )                        │
│ ┌───────────────────────────────┐ │
│ │ Comparte el código: ABC234 ⧉  │ │  tarjeta código, copiar
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │
│ │ [[  Hacer el sorteo  ]]       │ │  secondary, fijo abajo
│ └───────────────────────────────┘ │
│  Cuando estén todos. Faltan…      │  caption bajo el botón
└───────────────────────────────────┘
```

Copia:
- Banner privacidad (organizador): "El sorteo lo hace la app. Ni tú como organizador vas a saber a quién le tocó quién."
- Banner privacidad (miembro): "El sorteo lo hace la app. Nadie, ni el organizador, puede ver a quién le tocó quién."
- Sección: "MIEMBROS ({n})"; chip del organizador: "Organiza" (en su propia vista: "Organizas tú"); si el organizador eligió solo organizar: "Organiza · no participa".
- Fila de exclusiones: "Exclusiones" + detalle "Parejas o gente de la misma casa que no se regalan entre sí" + contador "{n} activas".
- Tarjeta código: "Código del grupo" / "{CODIGO}" / ícono copiar (Toast "Código copiado").
- Botón: "Hacer el sorteo". Texto de apoyo bajo el botón: "Hazlo cuando estén todos. Después, para entrar o salir, hay que sortear de nuevo."
- Con < 3 participantes, el botón sigue activo; al tocar: Toast/Banner "Necesitan al menos 3 personas para el sorteo. Invita a {3-n} más." + abre la hoja de invitar.

**Invitar** (hoja inferior, se abre sola al crear el grupo):
```
│ Invita a tu gente                 │  title2
│ Mándales el enlace: con un toque  │
│ entran al grupo.                  │
│ [  Compartir por WhatsApp  ]      │  primary con ícono WhatsApp
│ ( Compartir de otra forma )       │  Share API nativo
│ ( Copiar enlace )                 │
│ Código: ABC234                    │  code
```
- WhatsApp: `Linking.openURL('whatsapp://send?text=' + encodeURIComponent(msg))`; si WhatsApp no está instalado, cae a `Share.share`.
- Mensaje de WhatsApp (exacto):
  > ¡Hola! Te invito al amigo secreto *{grupo}* 🎁
  > Entrega: {fecha larga} · Presupuesto: {monto}
  > Únete aquí: {enlace}
  > Si te pide el código: *{CODIGO}*

**Quitar del grupo** (⋮ en la fila, solo organizador, estado abierto): diálogo "¿Quitar a {nombre} del grupo?" / "Ya no va a participar en el sorteo. Puede volver a entrar con el código." / [Quitar del grupo] (destructive) / (Cancelar).

### S5b. Vista del miembro, estado `abierto`
Igual sin exclusiones editables (ve el texto "{organizador} definió {n} exclusiones"), sin botón de sorteo. Barra fija abajo: [ Mi lista de deseos ] (primary). Texto: "Cuando {organizador} haga el sorteo te avisamos." ⋮ = "Salir del grupo" → diálogo "¿Salir de {grupo}?" / "Ya no vas a participar en este amigo secreto." / [Salir del grupo] / (Cancelar).

### S5c. Estado `sorteado` (todos)
```
│ ┌───────────────────────────────┐ │  SecretCard
│ │ 🔒 Tu amigo secreto           │ │
│ │ (?)  Toca para ver a quién    │ │  si no lo ha visto → S8
│ │      te tocó                  │ │  si ya lo vio → nombre oculto
│ │ (avatar) ••••••  👁 Mostrar   │ │  (ver S10) y toca → S10
│ └───────────────────────────────┘ │
│ [ Mi lista de deseos ] (outline)  │
│ ( 💬 Mensajes de quien te regala )│  con contador de no leídos
│ MIEMBROS (12)  {🔒 Sorteo hecho}  │
```
Organizador, ⋮ además: "Agregar o quitar personas" y "Sortear de nuevo"; desde el día de entrega: botón [ Revelar quién le regaló a quién ] (accent).
- Agregar o quitar personas → diálogo: "¿Abrir el grupo otra vez?" / "El sorteo actual se anula para que puedan entrar o salir personas. Después tendrás que sortear de nuevo y a todos les puede tocar otra persona." / [Abrir el grupo] / (Cancelar).
- Sortear de nuevo → diálogo: "¿Sortear de nuevo?" / "A todos les va a tocar otra persona y se borran los mensajes secretos. Avisaremos a todo el grupo." / [Sortear de nuevo] / (Cancelar).
- Revelar → diálogo (no destructivo pero irreversible): "¿Revelar quién le regaló a quién?" / "Todos van a ver la lista completa. Hazlo cuando ya hayan entregado los regalos." / [Revelar ahora] (primary) / (Todavía no).

### Editar grupo (⋮ → "Editar grupo")
Misma pantalla de S3 con datos cargados y botón "Guardar cambios". Fecha y presupuesto se pueden editar incluso después del sorteo (Toast al resto: no; push "Cambió la fecha de entrega" sí, ver notificaciones).

### Eliminar grupo (⋮, solo organizador)
Diálogo: "¿Eliminar {grupo}?" / "Se borran el sorteo, las listas y los mensajes de todos. No se puede deshacer." / [Eliminar grupo] / (Cancelar).

---

## S6. Editor de exclusiones (organizador) `[app/(app)/grupo/[id]/exclusiones.tsx]`

```
┌───────────────────────────────────┐
│ ←  Exclusiones                    │
│ Marca quiénes NO se pueden        │  body
│ regalar entre sí (parejas, gente  │
│ de la misma casa). Funciona en    │
│ los dos sentidos.                 │
│                                   │
│ (C) Carlos          ⊘ Ana      >  │  fila → hoja de esa persona
│ (A) Ana             ⊘ Carlos   >  │
│ (J) Juan            Ninguna    >  │
│ (M) Marta           Ninguna    >  │
│                                   │
│  ✓ El sorteo es posible           │  estado en vivo (success)
└───────────────────────────────────┘
```
Hoja de una persona:
```
│ ¿A quién no le puede regalar      │  title2
│ Carlos?                           │
│ ▣ Ana                             │  checkbox, fila completa 56 dp
│ ▢ Juan                            │
│ ▢ Marta                           │
│ [ Listo ]                         │
```
- Se guarda al tocar "Listo" (y al cerrar la hoja, se guarda igual: no hay "¿descartar?"). Háptico `selection` en cada casilla.
- **Verificación en vivo** (misma función del paquete `domain` que usa el servidor, ejecutada en el teléfono): debajo de la lista muestra
  - ✓ "El sorteo es posible" (success), o
  - ⚠ "Con estas exclusiones no se puede sortear: {nombre} no tiene a quién regalarle. Quítale alguna exclusión o invita a más personas." (warning, ícono + texto).
- No impide guardar (puede seguir invitando gente), pero el sorteo fallará con el mismo mensaje.

---

## S7. Sorteo (animación) `[app/(app)/grupo/[id]/sorteo.tsx]`

Disparo: "Hacer el sorteo" → diálogo de confirmación **no** destructivo pero importante (el grupo se cierra):
- "¿Hacer el sorteo ya?" / "Son {n} personas. Después del sorteo, para que alguien entre o salga, hay que sortear de nuevo." / [[ Sortear ]] (secondary) / (Todavía no).

Animación (pantalla completa, fondo `background`):
```
│                                   │
│      (L) (C) (A) (J) (M) (P)      │  avatares en círculo que giran y
│        ↻   barajando   ↻          │  se cruzan (Reanimated)
│                                   │
│        Barajando nombres…         │  title2
│   La app hace el sorteo. Nadie    │  body textSecondary
│   puede ver los resultados.       │
```
- Avatares en anillo que rotan (`withRepeat`, `drawLoop` 900 ms) y se barajan; duración mínima `drawMin` 1.800 ms aunque el servidor responda antes. Si tarda más, sigue girando; a los 15 s → error.
- Éxito: los avatares se juntan en un destello `accent`, háptico `success`, `announceForAccessibility("Sorteo hecho")`, texto "¡Listo! El sorteo quedó hecho." + "Ya les avisamos a todos." + botón [ Ver a quién me tocó ] (→ S8) o, si solo organiza, [ Volver al grupo ].
- Movimiento reducido: sin giro; indicador + texto, luego fundido al resultado.

Errores (vuelve a S5 con Banner error y deja el botón activo):
- Exclusiones imposibles: "No se pudo hacer el sorteo: con las exclusiones actuales, {nombre} no tiene a quién regalarle. Ve a Exclusiones y quítale alguna, o invita a más personas." + botón ghost "Revisar exclusiones" (→ S6). Si el servidor no da nombre: "Hay demasiadas exclusiones para un grupo de {n} personas. Quita algunas en Exclusiones e intenta de nuevo."
- Menos de 3: "Necesitan al menos 3 personas para el sorteo. Invita a {k} más."
- Alguien entró o salió mientras tanto: "El grupo cambió mientras sorteabas ({n} personas ahora). Revisa la lista y vuelve a intentar."
- Red/servidor/timeout: "El sorteo no se completó. No te preocupes: no quedó nada a medias. Vuelve a intentar." (el servidor garantiza atomicidad.)

---

## S8. "¿A quién te tocó?" (suspenso) `[app/(app)/grupo/[id]/revelar.tsx]`

Pantalla completa que **siempre usa los tokens del tema oscuro** (fondo `#1A1412`, texto `#F7EDE7`, primario `#FF8A7A` con texto `#2B1E1A`, nombre en `accent` `#E8B54A` = 9,66:1), aunque el teléfono esté en claro: es un "momento".

Paso 1 — privacidad:
```
│            ( 👁 ojo )             │
│   Antes de abrir…                 │  title1
│   Asegúrate de que nadie esté     │
│   mirando tu pantalla.            │
│   [ Listo, nadie me ve ]          │  primary con tokens del tema oscuro
```
- Copia: "Antes de abrir…" / "Asegúrate de que nadie esté mirando tu pantalla." / "Listo, nadie me ve".

Paso 2 — mantener presionado:
```
│       ┌───────────────┐           │
│       │   🎁 (regalo  │           │  tarjeta 240×300, radio xl, accent
│       │    cerrado)   │           │  con anillo de progreso alrededor
│       └───────────────┘           │
│  Mantén presionado para abrir     │  title3
```
- Gesto `LongPress`/`Pan` de Gesture Handler: mientras mantiene, el anillo de progreso se llena en `revealHold` 1.200 ms, la caja tiembla levemente (rotación ±2°) y crece hasta 1,06; háptico `tapLight` cada 200 ms, `tapMedium` en el último 40 %. Si suelta antes: el progreso vuelve a 0 en `fast` y aparece "¡Casi! Mantén un poquito más."
- Al completar: háptico `reveal` + `success` (150 ms después); la tarjeta gira (`revealFlip` 600 ms, `spring.bouncy`) y muestra:
```
│        Te tocó regalarle a        │  body
│        (avatar 96)                │
│        Ana María Rodríguez        │  display, color accent #E8B54A
│   Presupuesto: $ 50.000           │
│   Entrega: viernes 18 de dic.     │
│  [ Ver su lista de deseos ]       │  primary
│  ( Escribirle en secreto )        │  outline
│  ( Volver al grupo )              │  ghost
```
- Confeti sutil: 40 partículas, `confetti` 1.800 ms, colores de marca, cae solo una vez.
- Si su lista está vacía, en vez de "Ver su lista" se lee: "Ana todavía no ha escrito su lista. Pregúntale en secreto qué le gustaría." y el primario pasa a ser "Escribirle en secreto".
- Accesibilidad: TalkBack no puede mantener presionado cómodamente → la tarjeta expone `accessibilityActions=[{ name: 'activate', label: 'Abrir regalo' }]` y al activarse revela de una (con los mismos hápticos). `accessibilityLabel="Regalo cerrado. Toca dos veces para ver a quién te tocó."` Al revelar: anunciar "Te tocó regalarle a {nombre}".
- Movimiento reducido: sin temblor, sin giro, sin confeti; la tarjeta funde al resultado en `fast`.
- Si el sorteo se repitió después de ver: al entrar muestra "Hubo un nuevo sorteo. Tu amigo secreto cambió." antes del paso 1.
- Error al traer la asignación: "No pudimos abrir tu regalo. Revisa tu conexión y vuelve a intentar." [ Reintentar ].

---

## S9. Mi lista de deseos `[app/(app)/grupo/[id]/lista.tsx]`

La lista es **por grupo** (lo que pides en la oficina no es lo mismo que en la familia).

```
┌───────────────────────────────────┐
│ ←  Mi lista de deseos             │
│ Tu amigo secreto la ve. Ideas     │  caption
│ dentro de $ 50.000.               │
│ ┌───────────────────────────────┐ │
│ │ Termo para el café        ⋮   │ │  Card: idea title3
│ │ 👕 —   🔗 falabella.com.co    │ │  talla y dominio del enlace
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │
│ │ Camiseta del Nacional     ⋮   │ │
│ │ 👕 Talla M                    │ │
│ └───────────────────────────────┘ │
│ ┌───────────────────────────────┐ │
│ │     + Agregar idea            │ │  primary fijo abajo
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```
Hoja "Agregar idea":
```
│ Nueva idea                        │
│ ¿Qué te gustaría?                 │
│ [ Ej: Un libro de cocina_____ ]   │  autoFocus, maxLength 80
│ Talla (opcional)                  │
│ {XS}{S}{M}{L}{XL}{XXL}{Otra}      │  chips; "Otra" → campo corto (talla de zapato, etc.)
│ Enlace (opcional)                 │
│ [ https://____________________ ]  │  keyboardType="url"
│ [ Guardar idea ]                  │
```
- Idea: `autoCapitalize="sentences"`, `returnKeyType="next"`.
- Enlace: `keyboardType="url"`, `autoCapitalize="none"`, `autoCorrect={false}`, `textContentType="URL"`; si pega sin protocolo, se antepone `https://`.
- Guardar: "Guardar idea" (loading "Guardando…"). Después de guardar, la hoja **se queda abierta y limpia** con Toast "Idea guardada. ¿Otra?" para agregar varias seguidas; se cierra con "Listo" o deslizando.
- ⋮ de cada idea: "Editar" / "Eliminar" (eliminar **sin diálogo**: Toast "Idea eliminada" con "Deshacer" 6 s; no es destructivo grave).
- Mostrar del enlace solo el dominio ("falabella.com.co"); al tocar se abre en el navegador externo.

Estado vacío:
- Título: "Ayúdale a tu amigo secreto"
- Texto: "Agrega 2 o 3 ideas de lo que te gustaría. Así nadie te regala otra taza."
- Botón: "Agregar mi primera idea"

Errores:
- Idea vacía: "Escribe qué te gustaría, aunque sea una pista."
- Enlace inválido: "Ese enlace no parece válido. Cópialo completo desde el navegador o la app de la tienda."
- Red: "No se guardó la idea. Revisa tu conexión y vuelve a intentar." (lo escrito se conserva).

---

## S10. Mi amigo secreto `[app/(app)/grupo/[id]/amigo.tsx]`

```
┌───────────────────────────────────┐
│ ←  Tu amigo secreto           ⋮   │  ⋮ = Reportar, Bloquear chat
│ ┌───────────────────────────────┐ │  SecretCard
│ │ (avatar) ••••••••   👁 Mostrar│ │  nombre oculto por defecto
│ │ {Faltan 21 días} · $ 50.000   │ │
│ └───────────────────────────────┘ │
│ ┌──────────────┬────────────────┐ │  control segmentado
│ │ Su lista (3) │ Chat secreto ● │ │
│ └──────────────┴────────────────┘ │
│  Termo para el café               │  lista de solo lectura
│  🔗 falabella.com.co              │
│  Camiseta del Nacional · Talla M  │
│  …                                │
└───────────────────────────────────┘
```
- Nombre **oculto por defecto** cada vez que se entra (protege en la oficina): "••••••" + botón "Mostrar" (ícono `eye`); al tocar se muestra 10 s o hasta salir. Etiqueta TalkBack: "Nombre oculto. Toca dos veces para mostrarlo".
- Lista vacía: "Todavía no ha escrito su lista. Pregúntale en secreto qué le gustaría." [ Preguntarle ] → pestaña chat.

### S10b. Chat secreto
Hay **dos** chats por persona y grupo:
1. **Con tu amigo secreto** (S10, pestaña "Chat secreto"): tú eres anónimo; él te ve como "Tu amigo secreto" con avatar `gift`.
2. **Con quien te regala** (desde S5: "Mensajes de quien te regala"): el otro es anónimo; tú escribes con tu nombre (ya sabe quién eres).

```
│  🔒 Escribes en secreto: Ana no   │  Banner privacidad (en chat 1)
│  sabe que eres tú.                │
│            ┌──────────────────┐   │
│            │ ¿Qué talla de    │   │  burbuja propia (primary)
│            │ zapato usas?     │   │
│            └──────────────────┘   │
│ ┌───────────────┐                 │
│ │ 38 ¿por qué?  │                 │  recibida (surfaceAlt)
│ └───────────────┘                 │
│ [ Escribe tu pregunta…   ] (➤)    │  multiline, botón enviar 48
│                         412/500   │  contador desde 400
```
Copia:
- Banner chat 1: "Escribes en secreto: {nombre} no sabe que eres tú."
- Banner chat 2: "Quien te regala te escribe en secreto. Tú no sabes quién es."
- Placeholder: "Escribe tu pregunta…" (chat 1) / "Escribe tu respuesta…" (chat 2)
- Vacío chat 1: "Pregúntale algo para atinarle al regalo, por ejemplo: ¿te gusta más el dulce o lo salado?"
- Vacío chat 2: "Cuando quien te regala te escriba, lo verás aquí."
- Recordatorio discreto bajo el campo la primera vez: "Ojo: no firmes con tu nombre." (chat 1)
- Contador: aparece a los 400 caracteres "{n}/500"; a los 500 el campo no acepta más y el contador pasa a `danger` con "Máximo 500 caracteres."
- Envío fallido: burbuja con "No se envió. Toca para reintentar."
- Mantener presionado un mensaje recibido → hoja: "Copiar" / "Reportar mensaje".

Reportar (hoja): "¿Por qué lo reportas?" → opciones radio: "Es ofensivo o me hace sentir mal" / "Es acoso" / "Revela información privada" / "Otro motivo" + campo opcional → [ Enviar reporte ]. Luego: Toast "Gracias por avisar. Vamos a revisar el mensaje." y la burbuja queda como "Reportaste este mensaje". Pregunta extra al final: "¿Quieres bloquear también este chat?" (Bloquear chat) / (No, gracias).

Bloquear chat (⋮): diálogo "¿Bloquear este chat?" / "Ya no recibirás mensajes de esta persona en {grupo}. El sorteo sigue igual y nadie se entera de que bloqueaste." / [Bloquear chat] / (Cancelar). Bloqueado: campo reemplazado por "Bloqueaste este chat." + ghost "Desbloquear".

Después de la revelación: chats en solo lectura ("La revelación ya pasó. Los mensajes se borran el {fecha de borrado}.").

---

## S11. Revelación final `[app/(app)/grupo/[id]/revelacion.tsx]`

Se activa cuando el organizador toca "Revelar quién le regaló a quién" o automáticamente el día siguiente a la entrega (00:00 `America/Bogota`).

```
│        🎁                         │
│   ¡Llegó la revelación!           │  title1
│   Quien te regaló fue…            │  body
│        (avatar 96)                │
│        Carlos Pérez               │  display accent
│                                   │
│ ASÍ QUEDÓ EL SORTEO               │  overline
│ Laura   → Carlos                  │  lista simple: quién → a quién
│ Carlos  → Ana                     │  (tu fila resaltada surfaceAlt)
│ Ana     → Juan                    │
│ …                                 │
│ ( Compartir en el grupo )         │  outline: texto plano a WhatsApp
│ Los datos de este grupo se borran │  caption
│ el 16 feb 2027.                   │
```
- Copia: "¡Llegó la revelación!" / "Quien te regaló fue…" / "ASÍ QUEDÓ EL SORTEO" / "Compartir en el grupo" / "Los datos de este grupo se borran el {fecha}."
- Animación: el nombre entra con fundido + escala 0,9 → 1 (`spring.bouncy`), confeti 1 vez (sin confeti con movimiento reducido).
- Texto compartido: "¡Así quedó nuestro amigo secreto *{grupo}*! 🎁\n{lista}\nLo organizamos con Entre Nos."
- Si eras "solo organizo": título "¡Llegó la revelación!" y directamente la lista.

---

## S12. Perfil y ajustes `[app/(app)/perfil.tsx]`

```
┌───────────────────────────────────┐
│ ←  Tu perfil                      │
│        (avatar 96, cambiar foto)  │
│ Tu nombre                         │
│ [ Laura Gómez________________ ]   │  se guarda al salir del campo
│ Así te ven en tus grupos.         │
│                                   │
│ Cuenta: laura@gmail.com (Google)  │  caption
│ Tema: sigue la configuración de   │  fila informativa
│ tu teléfono                       │
│ Notificaciones              >     │  abre ajustes del sistema
│ Política de privacidad      >     │
│ Términos                    >     │
│ Ayuda y contacto            >     │
│                                   │
│ ( Cerrar sesión )                 │  outline
│ ( Eliminar mi cuenta )            │  destructiveGhost
│ Versión 1.0.0 (12)                │  caption
└───────────────────────────────────┘
```
- Nombre: `autoCapitalize="words"`, `maxLength={40}`, `textContentType="name"`; vacío → "Escribe tu nombre para que tu grupo sepa quién eres." Toast "Nombre guardado".
- Foto: hoja "Tomar foto" / "Elegir de la galería" / "Quitar foto"; misma compresión que el grupo.
- Tema: **sigue al sistema** (claro/oscuro), sin selector en v1.
- Cerrar sesión: sin diálogo (no es destructivo) → S1.
- Eliminar cuenta: diálogo
  - Sin grupos activos: "¿Eliminar tu cuenta?" / "Se borran tu perfil, tus listas y tus mensajes. No se puede deshacer." / [Eliminar mi cuenta] / (Cancelar).
  - Con grupos ya sorteados: "¿Eliminar tu cuenta?" / "Estás en {n} grupos ya sorteados. Si eliminas tu cuenta, a tu amigo secreto le faltará un regalo y el organizador tendrá que sortear de nuevo. Se borran tu perfil, tus listas y tus mensajes. No se puede deshacer." / [Eliminar mi cuenta] / (Cancelar).
  - Si organiza grupos: "Eres organizador de {grupo}. Si eliminas tu cuenta, el grupo también se elimina para todos." (añadido al texto).
  - Después: S1 con Toast "Tu cuenta se eliminó. ¡Gracias por usar Entre Nos!"

---

## Notificaciones

### Permiso (Android 13+, `POST_NOTIFICATIONS`)
Nunca al abrir la app. Se pide **en contexto** después de crear o unirse al primer grupo, con una hoja previa:
- Título: "¿Te avisamos cuando hagan el sorteo?"
- Texto: "También te recordamos la fecha de entrega y te avisamos si tu amigo secreto te escribe."
- Botones: [ Sí, avísame ] (→ diálogo del sistema) / ( Ahora no ). Si dice "Ahora no", se vuelve a ofrecer **una sola vez** al hacerse el sorteo (Banner en S5).

### Canales de Android
| Canal (id) | Nombre visible | Importancia |
|---|---|---|
| `sorteo` | "Sorteo y revelación" | Alta |
| `mensajes` | "Mensajes secretos" | Alta |
| `recordatorios` | "Recordatorios y fechas" | Por defecto |
| `grupo` | "Cambios en tus grupos" | Baja |

### Textos (regla: **ningún push revela nombres de asignaciones ni el contenido de los mensajes**)
| Evento | Destinatarios | Título | Cuerpo | Abre |
|---|---|---|---|---|
| Sorteo realizado | Todos los participantes | "¡Ya hicieron el sorteo!" | "Entra a ver a quién te tocó en {grupo}. Que nadie te vea la pantalla." | S8 |
| Sorteo realizado | Organizador que no participa | "Sorteo hecho en {grupo}" | "Ya les avisamos a todos. Tú tampoco sabes quién le tocó a quién." | S5 |
| Nuevo sorteo | Todos | "Hubo un nuevo sorteo en {grupo}" | "Tu amigo secreto cambió. Entra a ver a quién te tocó ahora." | S8 |
| Mensaje nuevo (de quien te regala) | Receptor | "Tu amigo secreto te escribió" | "Tienes un mensaje nuevo en {grupo}." | S10b chat 2 |
| Mensaje nuevo (respuesta de tu amigo secreto) | Quien regala | "Tienes una respuesta" | "Te respondieron en {grupo}." | S10b chat 1 |
| Cuenta regresiva 7 días | Participantes | "Falta una semana para {grupo}" | "¿Ya tienes el regalo? Revisa su lista de deseos." | S10 |
| Cuenta regresiva 3 días | Participantes | "Faltan 3 días para la entrega" | "{grupo}: todavía estás a tiempo de conseguir el regalo." | S10 |
| Cuenta regresiva 1 día | Participantes | "¡Mañana es la entrega!" | "{grupo}: no se te olvide el regalo. Presupuesto: {monto}." | S10 |
| Fecha de entrega (día, 8:00 a. m.) | Todos | "¡Hoy es el amigo secreto!" | "{grupo}: lleva tu regalo y prepárate para la revelación." | S5 |
| Revelación | Todos | "¡Llegó la revelación!" | "Mira quién te regaló en {grupo}." | S11 |
| Alguien se unió | Organizador (agrupadas) | "{nombre} se unió a {grupo}" | "Ya son {n}. Cuando estén todos, haz el sorteo." | S5 |
| Grupo reabierto | Miembros | "{grupo} se abrió de nuevo" | "El organizador está ajustando el grupo. Te avisamos cuando haya nuevo sorteo." | S5 |
| Cambió fecha o presupuesto | Miembros | "Cambios en {grupo}" | "Nueva fecha de entrega: {fecha}." / "Nuevo presupuesto: {monto}." | S5 |
| Lista vacía (3 días tras el sorteo, una vez) | Quien no tiene ideas | "Tu lista de deseos está vacía" | "Ayúdale a tu amigo secreto: agrega una idea en 10 segundos." | S9 |

Horario: los recordatorios se envían a las 9:00 a. m. (`America/Bogota`); nunca entre 9:00 p. m. y 7:00 a. m., salvo mensajes del chat.

---

## Mensajes de error y estados globales

| Situación | Mensaje | Acción |
|---|---|---|
| Sin conexión (con caché) | Banner: "Sin conexión. Te mostramos lo último guardado." | Se quita solo al volver la red |
| Sin conexión (sin caché) | EmptyState: "No hay conexión" / "Revisa tus datos o el wifi y vuelve a intentar." | [ Reintentar ] |
| Error del servidor (5xx) | "Algo falló de nuestro lado. Intenta de nuevo en un momento." | [ Reintentar ] |
| Sesión vencida (refresh falló) | Toast: "Tu sesión se cerró. Vuelve a entrar con Google." | → S1, conserva a dónde iba |
| Sin permiso (403) | "No tienes acceso a este grupo. Puede que te hayan quitado o que el grupo ya no exista." | ( Ir a Mis grupos ) |
| Grupo no existe (404) | "Este grupo ya no existe." | ( Ir a Mis grupos ) |
| Límite de peticiones (429) | "Vas muy rápido. Espera un momento y vuelve a intentar." | — |
| Actualización obligatoria | "Hay una versión nueva de Entre Nos. Actualízala para seguir." | [ Actualizar ] → Play Store |
| Cámara/galería denegada | "Para elegir una foto, permite el acceso en los ajustes del teléfono." | ( Abrir ajustes ) |

Toasts de éxito estándar: "¡Listo! Tu grupo está creado." · "¡Entraste a {grupo}!" · "Código copiado" · "Enlace copiado" · "Idea guardada. ¿Otra?" · "Cambios guardados" · "Nombre guardado".

---

## Resumen de toques de las acciones principales

| Acción | Camino | Toques |
|---|---|---|
| Entrar | S1 → Google → cuenta | 2 (incluye elegir la cuenta) |
| Crear grupo | S2 "Crear grupo" → escribir nombre y presupuesto → "Crear grupo" | 2 + escribir |
| Invitar por WhatsApp | (hoja ya abierta) "Compartir por WhatsApp" → chat → enviar | 3 |
| Unirse por enlace | Enlace → "Unirte a este grupo" | 1 (+ login la primera vez) |
| Unirse por código | "Unirme con código" → pegar/escribir → "Unirme a este grupo" | 2–3 + escribir |
| Hacer el sorteo | S5 "Hacer el sorteo" → "Sortear" | 2 |
| Ver a quién te tocó | Push/tarjeta → "Listo, nadie me ve" → mantener | 3 |
| Agregar deseo | "Agregar idea" → escribir → "Guardar idea" | 2 + escribir |
| Escribir al amigo secreto | S5 tarjeta → "Chat secreto" → escribir → enviar | 3 + escribir |
