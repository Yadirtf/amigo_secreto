# Identidad visual — Entre Nos – amigo secreto

Versión 1.0 · 27 nov 2026 · Rol: UX/UI
Archivos relacionados: [`guia-de-estilo.md`](guia-de-estilo.md) (tokens y componentes), [`tokens.json`](tokens.json), [`logo-regalo.png`](logo-regalo.png), [`flujos.md`](flujos.md), [`checklist-friccion.md`](checklist-friccion.md).

## 1. Qué tiene que transmitir la marca

| Necesidad del producto | Sensación que buscamos | Implicación visual |
|---|---|---|
| Es una fiesta de diciembre entre gente cercana | Calidez, alegría, "parche" | Colores cálidos, formas redondeadas, tono cercano |
| El sorteo tiene que ser justo y nadie puede hacer trampa | Confianza, calma, seriedad sin frialdad | Un color de confianza estable para sorteo y privacidad |
| Hay momentos especiales: el "¿a quién te tocó?", la revelación, el Premium | Sorpresa, valor, premio | Un acento escaso y luminoso reservado a esos momentos |
| Usuarios de 12 a 70 años, muchos en Android de gama media, al sol o en la oficina | Legibilidad, cero esfuerzo | Fondos claros limpios, contraste AA verificado, texto grande |
| Diferenciarse de las mil apps navideñas genéricas | Propio, colombiano, no "plantilla" | Evitar el rojo/verde saturados de Navidad y los clichés (Papá Noel, pinos, nieve) |

Regla de oro: **coral = acción y celebración, verde = confianza y justicia, dorado = momento especial**. Cada color tiene un trabajo; no se intercambian.

## 2. Tres direcciones exploradas

### Dirección A — "Sobremesa" (cálida, cercana, confiable)

La sensación de la sobremesa en diciembre: la mesa con mantel claro, la gente conversando, el regalo envuelto esperando.

- **Fondo:** crema cálido `#FFF8F3` (no blanco clínico); tarjetas blancas `#FFFFFF`.
- **Primario:** coral ladrillo `#C2453A` (botones, acción principal). En ilustraciones y confeti se permite el coral luminoso `#F26B5B` (decorativo, nunca para texto).
- **Secundario:** verde confianza profundo `#1F6F5C` (sorteo, privacidad, estados "todo en orden").
- **Acento:** dorado `#D9A23A` (revelación, cuenta regresiva del día, Premium).
- **Texto:** cacao `#2B1E1A` en vez de negro puro; más suave y cálido, contraste 15,3:1.
- **Formas:** radios generosos (14–28 dp), globos de conversación, confeti geométrico simple.

Psicología del color:
- **Coral:** conserva la energía y la sociabilidad del rojo (fiesta, cariño, ganas de actuar) pero sin su lectura de alarma o de error, y sin el rojo navideño de catálogo. Es el color de "dale, hagámoslo".
- **Verde profundo azulado:** el verde comunica equilibrio y "esto está bien"; al llevarlo hacia el azul y oscurecerlo gana seriedad y confianza (bancos, salud) sin volverse frío. Lo usamos exactamente donde el usuario necesita creer: "el sorteo es justo", "nadie ve tu asignación".
- **Dorado:** asociado a premio, valor y ocasión especial. Si se usa poco, conserva el significado: cuando aparece, algo especial está pasando.
- **Crema:** hogareño, reduce el brillo frente al blanco puro (mejor para pantallas de gama media con brillo alto) y hace que el blanco de las tarjetas "flote" sin necesitar sombras fuertes.

Riesgos: el coral puede confundirse con error si se usa mal → el rojo de error (`danger #B3261E`) es más oscuro y frío, y los errores siempre llevan ícono + texto.

### Dirección B — "Papel de regalo" (artesanal, kraft)

- **Fondo:** papel kraft `#EAD9C0` con textura sutil.
- **Primario:** terracota `#B4532A`; **secundario:** oliva `#5E6B2E`; **acento:** mostaza `#D4A017`.
- **Formas:** cintas, sellos, tipografía tipo sello de caucho.

Psicología: lo hecho a mano, lo cercano, lo "detallito". Muy coherente con el dulce abrigo (v2).
Por qué no: el fondo kraft baja el contraste de todo el texto secundario (difícil llegar a AA con grises cálidos sobre `#EAD9C0`), las texturas pesan en datos y en gama baja, el oliva comunica menos confianza que un verde profundo, y la estética envejece rápido ("rústico de 2016"). Para 70 años y luz de oficina es peor.

### Dirección C — "Noche de velitas" (mágica, oscura primero)

Inspirada en el 7 de diciembre: cielo nocturno y faroles.

- **Fondo:** azul noche `#141A33`; **primario:** coral claro `#FF8A7A`; **secundario:** turquesa `#4FC3B5`; **acento:** dorado vela `#F5C451` con brillos.
- **Formas:** destellos, luces difusas, degradados.

Psicología: misterio, magia, emoción; ideal para el momento del sorteo y la revelación proyectada en la fiesta.
Por qué no como base: una app oscura de entrada se lee como "de juegos" o "nocturna", cansa en uso diurno y de oficina (que es donde se organiza), los degradados y brillos complican la accesibilidad y el rendimiento, y contradice el pedido de fondos claros y limpios. **Su esencia se conserva**: el tema oscuro de "Sobremesa" toma la calidez de esta noche, y la pantalla de revelación usa un fondo profundo con dorado. Además queda como candidata a **tema Premium "Velitas"** en v2.

## 3. Decisión: Dirección A — "Sobremesa"

Elegida por el equipo de UX (el usuario delegó la decisión). Motivos, en orden:

1. **Confianza + fiesta en un solo sistema.** Es la única dirección donde el color de confianza (verde profundo) tiene un rol claro y separado del color de celebración. El riesgo número uno del producto es la privacidad del sorteo; el usuario tiene que sentir "esto es serio" en el momento del sorteo y "esto es divertido" el resto del tiempo.
2. **Accesibilidad verificada.** Todas las combinaciones de texto cumplen WCAG AA en claro y oscuro (ver tabla en la guía de estilo; la más baja de texto es 4,75:1, el enlace coral sobre el fondo crema). Las direcciones B y C exigían excepciones.
3. **Diferencial sin cliché.** Coral + verde profundo + dorado evoca diciembre (rojo, verde, dorado) sin parecer una tarjeta navideña genérica. Funciona igual para la oficina, la familia y el salón de clase.
4. **Barata de implementar.** Colores planos, sin texturas ni degradados obligatorios; las sombras son suaves y opcionales. Funciona en Android de gama media.
5. **Escalable a Premium.** El dorado está reservado; los temas visuales Premium (v2) pueden cambiar el fondo y las ilustraciones sin romper los roles.

### Proporción de uso (regla 60-30-10)

- ~60 % fondos y superficies (crema, blanco).
- ~30 % texto y estructura (cacao, gris cálido, bordes).
- ~10 % color de marca: coral para la acción principal (máximo **un** botón primario por pantalla), verde para confianza, dorado solo para momentos especiales (≤ 1 elemento dorado por pantalla fuera de la revelación).

## 4. Tipografía

Ambas fuentes son gratuitas (Google Fonts, licencia OFL) y se instalan con `@expo-google-fonts`.

| Rol | Fuente | Pesos | Paquete | Por qué |
|---|---|---|---|---|
| Display / títulos | **Fredoka** | 600 SemiBold, 700 Bold | `@expo-google-fonts/fredoka` | Redondeada, amable, festiva sin ser infantil. Muy buena en tamaños grandes (nombre revelado, cuenta regresiva). |
| Cuerpo / interfaz | **Nunito** | 400, 600, 700, 800 | `@expo-google-fonts/nunito` | Terminales redondeadas que combinan con Fredoka, altura x generosa, números claros, excelente legibilidad a 14–16 sp. Soporta tildes y ñ. |

Reglas:
- Fredoka solo para títulos (≥ 18 sp) y números grandes. Nunca para párrafos ni campos de texto.
- Nunito para todo lo demás, incluidos botones (800 ExtraBold a 16 sp).
- Números de dinero y cuenta regresiva con `fontVariant: ['tabular-nums']` para que no "bailen".
- Carga: `useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold })` y mantener el splash (`expo-splash-screen`) hasta que carguen. Si fallan, usar las de respaldo del sistema (no bloquear el arranque).
- Escala y soporte de texto grande: ver [`guia-de-estilo.md` §3](guia-de-estilo.md#3-tipografía).

## 5. Iconografía

- **Librería:** `lucide-react-native` (requiere `react-native-svg`, ya incluido en Expo). Estilo de línea, terminales redondeadas, coherente con Nunito.
- **Trazo:** `strokeWidth={2}` (1,75 en 20 dp). **Tamaños:** 20 dp (dentro de chips y campos), 24 dp (por defecto), 32 dp (estados vacíos y acciones grandes).
- **Color:** hereda el del texto que acompaña (`textPrimary` o `textSecondary`); en botones, el mismo color del texto del botón.
- **Nunca solo ícono** para acciones importantes: siempre ícono + texto, salvo acciones universales en la barra superior (atrás, cerrar, más opciones), que llevan `accessibilityLabel`.
- **Mapa de íconos (nombres de Lucide):**

| Concepto | Ícono | Concepto | Ícono |
|---|---|---|---|
| Grupo | `users` | Sorteo | `shuffle` |
| Crear grupo | `plus` | Revelación / regalo | `gift` |
| Unirse con código | `ticket` | Lista de deseos | `list-checks` |
| Invitar / compartir | `share-2` (WhatsApp usa su marca solo en el botón de compartir) | Chat secreto | `message-circle` |
| Fecha de entrega | `calendar-days` | Presupuesto | `wallet` |
| Exclusiones | `user-x` | Privacidad / solo tú lo ves | `lock` |
| Talla | `shirt` | Enlace | `link` |
| Ocultar / mostrar | `eye-off` / `eye` | Reportar | `flag` |
| Bloquear | `ban` | Ajustes | `settings` |
| Foto | `camera` | Éxito | `check-circle-2` |
| Advertencia | `alert-triangle` | Error | `alert-circle` |
| Sin conexión | `wifi-off` | Más opciones | `more-vertical` |

## 6. Logo

**Mascota: el regalo con antifaz (desde 2026-11-27, elegida por el dueño).** Un regalo rojo con moño dorado, antifaz azul noche y el dedo sobre la boca pidiendo silencio: es el secreto "entre nos" hecho personaje. Reemplaza a la marca anterior de dos globos (`logo.svg` / `icon.svg` quedan solo como histórico).

- **Fuente:** [`logo-regalo-original.jpg`](logo-regalo-original.jpg). [`logo-regalo.png`](logo-regalo.png) es el recorte sin fondo y [`logo-regalo-silueta.png`](logo-regalo-silueta.png) la silueta blanca con el antifaz calado. Ambos salen de `apps/mobile/scripts/cutout-logo.py`.
- **Fondo del ícono:** degradado pastel lavanda `#D9C6FF` → `#EDE3FF` → menta `#B8E9D6`, con un halo mantequilla `#FFF4D6` detrás del regalo, confeti pastel (coral, mantequilla, menta, lavanda) y destellos blancos. El verde menta y la lavanda son los contrarios fríos del rojo y el dorado, así que el regalo resalta sin gritar. La sombra suave en el piso le da volumen.
- **Versión monocroma** (ícono de notificación, ícono temático de Android 13): silueta del regalo con el antifaz calado.
- **En la app:** `BrandMark` muestra la mascota sin fondo (`assets/logo-mascota.png`), que se lee bien en claro y en oscuro.
- **No:** recolorear el regalo, recortar el moño ni ponerle gorro de Papá Noel.

### Ícono de la app

Todo se genera con `pnpm -F @entre-nos/mobile assets` (`apps/mobile/scripts/generate-assets.mjs`):
- `icon.png`: fondo + mascota, 1024 × 1024. También `docs/tienda/graficos/icono-512.png` para Play.
- Ícono adaptativo de Android: **fondo** = `adaptive-icon-background.png` (degradado y confeti); **primer plano** = `adaptive-icon.png` (mascota dentro del círculo seguro de 66/108); `monochromeImage` = silueta.
- Splash: la mascota a 200 dp sobre `#FFF7F2` (claro) / `#18141F` (oscuro).
- Ícono de notificación: silueta blanca, `color: "#FF7F6B"`.

## 7. Ilustración, fotos y confeti

- Ilustraciones planas con las tres formas de la marca (círculo, globo, destello) y colores de la paleta; sin caras detalladas (todos se ven representados).
- Fotos de grupo y avatar: recortadas en círculo (avatar) o con radio `lg` (portada de grupo); si no hay foto, iniciales sobre un color derivado del nombre (ver Avatar en la guía).
- **Confeti:** 40 partículas como máximo, formas: círculo, rectángulo redondeado y destello; colores `confettiCoral`, `confettiGreen`, `confettiGold`; 1,8 s; desactivado si el sistema pide reducir movimiento.

## 8. Voz y tono (resumen)

- Tuteo colombiano cercano: "te tocó", "dale", "listo", "¡qué nervios!". Sin regionalismos que no entienda alguien de otra ciudad ("parce" solo en mensajes muy informales, nunca en errores).
- Frases cortas; verbo primero en botones ("Crear grupo", "Unirme", "Hacer el sorteo").
- Los errores dicen **qué pasó y qué hacer**, sin culpar ("Ese código no existe. Revisa que esté bien escrito…").
- Nunca revelar en notificaciones ni en vistas previas quién le regala a quién.
- Microcopia completa en [`flujos.md`](flujos.md).
