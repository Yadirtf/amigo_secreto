# Guía de estilo y sistema de diseño — Entre Nos

Versión 1.0 · 27 nov 2026 · Dirección elegida: **"Sobremesa"** (ver [`identidad-visual.md`](identidad-visual.md)).
Fuente de verdad legible por máquina: [`tokens.json`](tokens.json). Si este documento y `tokens.json` difieren, **manda `tokens.json`** y se corrige este documento.

Convenciones: todas las medidas en dp (tamaños de letra en sp). Los nombres en `monoespaciado` son los nombres exactos de los tokens.

## 0. Cómo implementarlo en React Native

- Paquete `ui` del monorepo: `theme.ts` importa `tokens.json` y expone `useTheme()` que devuelve `{ color, ...resto }` según `useColorScheme()` (el tema **sigue al sistema**; no hay selector en v1).
- `StatusBar` con `style="auto"`; `NavigationBar` de Android (`expo-navigation-bar`) con el color `background` del tema activo.
- Todo `Text` pasa por un componente `<Text variant="body">` del paquete `ui`; ningún `fontSize` ni color suelto en pantallas.
- Easing: `Easing.bezier(...tokens.easing.standard)`; resortes: `withSpring(v, tokens.spring.gentle)`.
- Movimiento reducido: `useReducedMotion()` de Reanimated. Si es `true`: sin confeti, sin rebotes, transiciones = fundido de `duration.fast`; los hápticos se mantienen.
- Hápticos: `expo-haptics`, solo en los eventos del §8.3. Nunca en cada toque.

## 1. Color

### 1.1 Paleta clara (por defecto)

| Token | Hex | Uso |
|---|---|---|
| `background` | `#FFF8F3` | Fondo de todas las pantallas |
| `surface` | `#FFFFFF` | Tarjetas, hojas inferiores, campos |
| `surfaceAlt` | `#FBEDE4` | Secciones agrupadas, burbuja de chat recibida, filas destacadas |
| `textPrimary` | `#2B1E1A` | Texto principal, títulos |
| `textSecondary` | `#6B5A53` | Texto de apoyo, ayudas, metadatos |
| `textDisabled` | `#8C7A72` | Texto de controles deshabilitados |
| `primary` | `#C2453A` | Botón primario, enlaces, acción principal (coral) |
| `primaryPressed` | `#A8362D` | Primario presionado |
| `textOnPrimary` | `#FFFFFF` | Texto/ícono sobre `primary` |
| `primarySoft` | `#FCE3DE` | Fondo de chips seleccionados, banner informativo cálido |
| `textOnPrimarySoft` | `#8C2F27` | Texto sobre `primarySoft` |
| `secondary` | `#1F6F5C` | Confianza: botón "Hacer el sorteo", candados, estado "sorteado" |
| `secondaryPressed` | `#175546` | Secundario presionado |
| `textOnSecondary` | `#FFFFFF` | Texto sobre `secondary` |
| `secondarySoft` | `#DDEFE9` | Banner de privacidad, chip "Sorteo hecho" |
| `textOnSecondarySoft` | `#14473B` | Texto sobre `secondarySoft` |
| `accent` | `#D9A23A` | Dorado: revelación, insignia "¡Hoy!", Premium (relleno) |
| `accentPressed` | `#C28D2A` | Dorado presionado |
| `textOnAccent` | `#2B1E1A` | Texto sobre `accent` (nunca blanco) |
| `accentText` | `#7A5810` | Texto dorado sobre fondos claros |
| `success` | `#2E7D4F` | Texto/ícono de éxito |
| `warning` | `#9A6200` | Texto/ícono de advertencia |
| `danger` | `#B3261E` | Error, acción destructiva |
| `dangerPressed` | `#8F1E18` | Destructivo presionado |
| `textOnDanger` | `#FFFFFF` | Texto sobre `danger` |
| `dangerSoft` | `#FBE4E2` | Fondo de banner de error |
| `border` | `#E8D9D0` | Divisores y bordes decorativos (no informativos) |
| `borderStrong` | `#8C7A72` | Borde de campos, casillas, interruptores apagados (≥ 3:1) |
| `focus` | `#1F6F5C` | Anillo de foco (teclado/lector de pantalla) |
| `overlay` | `rgba(43,30,26,0.55)` | Velo detrás de hojas inferiores y diálogos |
| `skeleton` | `#F1E4DC` | Base del esqueleto de carga |
| `skeletonHighlight` | `#FAF1EB` | Brillo del esqueleto |
| `disabledBg` | `#EDE3DD` | Fondo de botones deshabilitados |
| `confettiCoral` / `confettiGreen` / `confettiGold` | `#F26B5B` / `#3FA488` / `#E8B54A` | Solo decorativo (confeti, ilustraciones) |

### 1.2 Paleta oscura (cuando el sistema está en oscuro)

| Token | Hex | Nota |
|---|---|---|
| `background` | `#1A1412` | Cacao casi negro, cálido (no `#000`) |
| `surface` | `#241C19` | |
| `surfaceAlt` | `#2F2521` | |
| `textPrimary` | `#F7EDE7` | |
| `textSecondary` | `#C4B3AB` | |
| `textDisabled` | `#8A7870` | |
| `primary` | `#FF8A7A` | Coral claro; **el texto encima es oscuro** |
| `primaryPressed` | `#F07565` | |
| `textOnPrimary` | `#2B1E1A` | |
| `primarySoft` | `#4A2420` | |
| `textOnPrimarySoft` | `#FFC9C0` | |
| `secondary` | `#5FC2A6` | |
| `secondaryPressed` | `#4AAE92` | |
| `textOnSecondary` | `#10241E` | |
| `secondarySoft` | `#1D3A32` | |
| `textOnSecondarySoft` | `#A8E3D2` | |
| `accent` | `#E8B54A` | |
| `accentPressed` | `#D6A23A` | |
| `textOnAccent` | `#2B1E1A` | |
| `accentText` | `#F0C66A` | |
| `success` | `#6FCF97` | |
| `warning` | `#F2C14E` | |
| `danger` | `#FF8A80` | |
| `dangerPressed` | `#F26D62` | |
| `textOnDanger` | `#2B1E1A` | |
| `dangerSoft` | `#4A2220` | |
| `border` | `#3D312C` | |
| `borderStrong` | `#8A7870` | |
| `focus` | `#5FC2A6` | |
| `overlay` | `rgba(0,0,0,0.60)` | |
| `skeleton` | `#2F2521` | |
| `skeletonHighlight` | `#3A2E29` | |
| `disabledBg` | `#2F2521` | |
| `confettiCoral` / `confettiGreen` / `confettiGold` | `#FF8A7A` / `#5FC2A6` / `#E8B54A` | |

Notas importantes:
- En oscuro, **coral y danger se parecen** (`#FF8A7A` vs `#FF8A80`). Por eso un error **nunca** se comunica solo con color: siempre ícono `alert-circle` + texto. El botón destructivo además dice la acción ("Eliminar cuenta").
- `border` es decorativo (no llega a 3:1 a propósito). Cualquier borde que el usuario **necesite ver** para entender un control usa `borderStrong`.
- Los colores `confetti*` y el coral del logo (`#EE6352`) no se usan para texto.

### 1.3 Contraste WCAG verificado

Calculado con la fórmula de luminancia relativa de WCAG 2.1 (script de verificación en el anexo A). Mínimos: **4,5:1** texto normal (1.4.3), **3:1** componentes y gráficos que transmiten información (1.4.11). Todas las parejas que la app usa están aquí; si una pantalla necesita una pareja que no está en la tabla, **hay que agregarla y verificarla antes de usarla**.

### Tema claro

| Uso | Texto | Fondo | Ratio | Mínimo | Resultado |
|---|---|---|---|---|---|
| Texto principal sobre fondo | `textPrimary` #2B1E1A | `background` #FFF8F3 | 15.32:1 | 4.5:1 | Cumple |
| Texto principal sobre tarjeta | `textPrimary` #2B1E1A | `surface` #FFFFFF | 16.11:1 | 4.5:1 | Cumple |
| Texto principal sobre superficie alterna | `textPrimary` #2B1E1A | `surfaceAlt` #FBEDE4 | 14.07:1 | 4.5:1 | Cumple |
| Texto secundario sobre fondo | `textSecondary` #6B5A53 | `background` #FFF8F3 | 6.22:1 | 4.5:1 | Cumple |
| Texto secundario sobre tarjeta | `textSecondary` #6B5A53 | `surface` #FFFFFF | 6.54:1 | 4.5:1 | Cumple |
| Texto secundario sobre superficie alterna | `textSecondary` #6B5A53 | `surfaceAlt` #FBEDE4 | 5.71:1 | 4.5:1 | Cumple |
| Botón primario | `textOnPrimary` #FFFFFF | `primary` #C2453A | 4.99:1 | 4.5:1 | Cumple |
| Botón primario presionado | `textOnPrimary` #FFFFFF | `primaryPressed` #A8362D | 6.50:1 | 4.5:1 | Cumple |
| Chip/banner coral suave | `textOnPrimarySoft` #8C2F27 | `primarySoft` #FCE3DE | 6.74:1 | 4.5:1 | Cumple |
| Botón secundario (verde) | `textOnSecondary` #FFFFFF | `secondary` #1F6F5C | 6.02:1 | 4.5:1 | Cumple |
| Botón secundario presionado | `textOnSecondary` #FFFFFF | `secondaryPressed` #175546 | 8.66:1 | 4.5:1 | Cumple |
| Chip/banner verde suave | `textOnSecondarySoft` #14473B | `secondarySoft` #DDEFE9 | 8.82:1 | 4.5:1 | Cumple |
| Badge dorado / revelación | `textOnAccent` #2B1E1A | `accent` #D9A23A | 7.04:1 | 4.5:1 | Cumple |
| Badge dorado presionado | `textOnAccent` #2B1E1A | `accentPressed` #C28D2A | 5.48:1 | 4.5:1 | Cumple |
| Texto dorado sobre fondo | `accentText` #7A5810 | `background` #FFF8F3 | 6.18:1 | 4.5:1 | Cumple |
| Texto dorado sobre tarjeta | `accentText` #7A5810 | `surface` #FFFFFF | 6.50:1 | 4.5:1 | Cumple |
| Botón ghost / enlace coral sobre fondo | `primary` #C2453A | `background` #FFF8F3 | 4.75:1 | 4.5:1 | Cumple |
| Botón ghost / enlace coral sobre tarjeta | `primary` #C2453A | `surface` #FFFFFF | 4.99:1 | 4.5:1 | Cumple |
| Texto verde sobre fondo | `secondary` #1F6F5C | `background` #FFF8F3 | 5.73:1 | 4.5:1 | Cumple |
| Texto verde sobre tarjeta | `secondary` #1F6F5C | `surface` #FFFFFF | 6.02:1 | 4.5:1 | Cumple |
| Texto éxito | `success` #2E7D4F | `surface` #FFFFFF | 5.05:1 | 4.5:1 | Cumple |
| Texto advertencia | `warning` #9A6200 | `surface` #FFFFFF | 5.10:1 | 4.5:1 | Cumple |
| Texto error / ghost destructivo | `danger` #B3261E | `surface` #FFFFFF | 6.54:1 | 4.5:1 | Cumple |
| Texto error sobre fondo | `danger` #B3261E | `background` #FFF8F3 | 6.22:1 | 4.5:1 | Cumple |
| Banner de error | `danger` #B3261E | `dangerSoft` #FBE4E2 | 5.38:1 | 4.5:1 | Cumple |
| Botón destructivo | `textOnDanger` #FFFFFF | `danger` #B3261E | 6.54:1 | 4.5:1 | Cumple |
| Botón destructivo presionado | `textOnDanger` #FFFFFF | `dangerPressed` #8F1E18 | 8.87:1 | 4.5:1 | Cumple |
| Texto deshabilitado (exento WCAG; meta 3:1) | `textDisabled` #8C7A72 | `disabledBg` #EDE3DD | 3.23:1 | 3:1 | Cumple |
| Borde de campo de texto (no texto, 1.4.11) | `borderStrong` #8C7A72 | `surface` #FFFFFF | 4.08:1 | 3:1 | Cumple |
| Borde de campo sobre fondo (1.4.11) | `borderStrong` #8C7A72 | `background` #FFF8F3 | 3.88:1 | 3:1 | Cumple |
| Anillo de foco sobre fondo (1.4.11) | `focus` #1F6F5C | `background` #FFF8F3 | 5.73:1 | 3:1 | Cumple |
| Anillo de foco sobre tarjeta (1.4.11) | `focus` #1F6F5C | `surface` #FFFFFF | 6.02:1 | 3:1 | Cumple |
| Contorno de botón primario vs fondo (1.4.11) | `primary` #C2453A | `background` #FFF8F3 | 4.75:1 | 3:1 | Cumple |
| Borde de campo con error (1.4.11) | `danger` #B3261E | `surface` #FFFFFF | 6.54:1 | 3:1 | Cumple |

### Tema oscuro

| Uso | Texto | Fondo | Ratio | Mínimo | Resultado |
|---|---|---|---|---|---|
| Texto principal sobre fondo | `textPrimary` #F7EDE7 | `background` #1A1412 | 15.81:1 | 4.5:1 | Cumple |
| Texto principal sobre tarjeta | `textPrimary` #F7EDE7 | `surface` #241C19 | 14.52:1 | 4.5:1 | Cumple |
| Texto principal sobre superficie alterna | `textPrimary` #F7EDE7 | `surfaceAlt` #2F2521 | 12.95:1 | 4.5:1 | Cumple |
| Texto secundario sobre fondo | `textSecondary` #C4B3AB | `background` #1A1412 | 9.01:1 | 4.5:1 | Cumple |
| Texto secundario sobre tarjeta | `textSecondary` #C4B3AB | `surface` #241C19 | 8.27:1 | 4.5:1 | Cumple |
| Texto secundario sobre superficie alterna | `textSecondary` #C4B3AB | `surfaceAlt` #2F2521 | 7.38:1 | 4.5:1 | Cumple |
| Botón primario | `textOnPrimary` #2B1E1A | `primary` #FF8A7A | 7.03:1 | 4.5:1 | Cumple |
| Botón primario presionado | `textOnPrimary` #2B1E1A | `primaryPressed` #F07565 | 5.71:1 | 4.5:1 | Cumple |
| Chip/banner coral suave | `textOnPrimarySoft` #FFC9C0 | `primarySoft` #4A2420 | 9.18:1 | 4.5:1 | Cumple |
| Botón secundario (verde) | `textOnSecondary` #10241E | `secondary` #5FC2A6 | 7.54:1 | 4.5:1 | Cumple |
| Botón secundario presionado | `textOnSecondary` #10241E | `secondaryPressed` #4AAE92 | 6.00:1 | 4.5:1 | Cumple |
| Chip/banner verde suave | `textOnSecondarySoft` #A8E3D2 | `secondarySoft` #1D3A32 | 8.56:1 | 4.5:1 | Cumple |
| Badge dorado / revelación | `textOnAccent` #2B1E1A | `accent` #E8B54A | 8.55:1 | 4.5:1 | Cumple |
| Badge dorado presionado | `textOnAccent` #2B1E1A | `accentPressed` #D6A23A | 6.97:1 | 4.5:1 | Cumple |
| Texto dorado sobre fondo | `accentText` #F0C66A | `background` #1A1412 | 11.27:1 | 4.5:1 | Cumple |
| Texto dorado sobre tarjeta | `accentText` #F0C66A | `surface` #241C19 | 10.35:1 | 4.5:1 | Cumple |
| Botón ghost / enlace coral sobre fondo | `primary` #FF8A7A | `background` #1A1412 | 7.95:1 | 4.5:1 | Cumple |
| Botón ghost / enlace coral sobre tarjeta | `primary` #FF8A7A | `surface` #241C19 | 7.30:1 | 4.5:1 | Cumple |
| Texto verde sobre fondo | `secondary` #5FC2A6 | `background` #1A1412 | 8.46:1 | 4.5:1 | Cumple |
| Texto verde sobre tarjeta | `secondary` #5FC2A6 | `surface` #241C19 | 7.77:1 | 4.5:1 | Cumple |
| Texto éxito | `success` #6FCF97 | `surface` #241C19 | 8.80:1 | 4.5:1 | Cumple |
| Texto advertencia | `warning` #F2C14E | `surface` #241C19 | 9.97:1 | 4.5:1 | Cumple |
| Texto error / ghost destructivo | `danger` #FF8A80 | `surface` #241C19 | 7.33:1 | 4.5:1 | Cumple |
| Texto error sobre fondo | `danger` #FF8A80 | `background` #1A1412 | 7.98:1 | 4.5:1 | Cumple |
| Banner de error | `danger` #FF8A80 | `dangerSoft` #4A2220 | 5.97:1 | 4.5:1 | Cumple |
| Botón destructivo | `textOnDanger` #2B1E1A | `danger` #FF8A80 | 7.06:1 | 4.5:1 | Cumple |
| Botón destructivo presionado | `textOnDanger` #2B1E1A | `dangerPressed` #F26D62 | 5.48:1 | 4.5:1 | Cumple |
| Texto deshabilitado (exento WCAG; meta 3:1) | `textDisabled` #8A7870 | `disabledBg` #2F2521 | 3.55:1 | 3:1 | Cumple |
| Borde de campo de texto (no texto, 1.4.11) | `borderStrong` #8A7870 | `surface` #241C19 | 3.98:1 | 3:1 | Cumple |
| Borde de campo sobre fondo (1.4.11) | `borderStrong` #8A7870 | `background` #1A1412 | 4.34:1 | 3:1 | Cumple |
| Anillo de foco sobre fondo (1.4.11) | `focus` #5FC2A6 | `background` #1A1412 | 8.46:1 | 3:1 | Cumple |
| Anillo de foco sobre tarjeta (1.4.11) | `focus` #5FC2A6 | `surface` #241C19 | 7.77:1 | 3:1 | Cumple |
| Contorno de botón primario vs fondo (1.4.11) | `primary` #FF8A7A | `background` #1A1412 | 7.95:1 | 3:1 | Cumple |
| Borde de campo con error (1.4.11) | `danger` #FF8A80 | `surface` #241C19 | 7.33:1 | 3:1 | Cumple |


### Parejas adicionales de componentes

| Uso | Texto / elemento | Fondo | Ratio | Mínimo | Resultado |
|---|---|---|---|---|---|
| Toast claro: texto | `surface` #FFFFFF | `textPrimary` #2B1E1A | 16.11:1 | 4.5:1 | Cumple |
| Toast claro: acción | #FFC9C0 | `textPrimary` #2B1E1A | 11.02:1 | 4.5:1 | Cumple |
| Toast oscuro: texto | `textPrimary` #F7EDE7 | `surfaceAlt` #2F2521 | 12.95:1 | 4.5:1 | Cumple |
| Toast oscuro: acción | `accent` #E8B54A | `surfaceAlt` #2F2521 | 7.91:1 | 4.5:1 | Cumple |
| Ícono advertencia en banner (claro) | `warning` #9A6200 | `surfaceAlt` #FBEDE4 | 4.45:1 | 3:1 | Cumple |
| Ícono advertencia en banner (oscuro) | `warning` #F2C14E | `surfaceAlt` #2F2521 | 8.89:1 | 3:1 | Cumple |
| Chip "Esperando gente" (oscuro) | `textSecondary` #C4B3AB | `surfaceAlt` #2F2521 | 7.38:1 | 4.5:1 | Cumple |
| Interruptor encendido vs tarjeta (claro) | `secondary` #1F6F5C | `surface` #FFFFFF | 6.02:1 | 3:1 | Cumple |
| Interruptor encendido vs tarjeta (oscuro) | `secondary` #5FC2A6 | `surface` #241C19 | 7.77:1 | 3:1 | Cumple |
| Casilla marcada vs tarjeta (claro) | `primary` #C2453A | `surface` #FFFFFF | 4.99:1 | 3:1 | Cumple |
| Casilla marcada vs tarjeta (oscuro) | `primary` #FF8A7A | `surface` #241C19 | 7.30:1 | 3:1 | Cumple |
| Avatar iniciales (claro) | `textPrimary` #2B1E1A | #FCE3DE | 13.18:1 | 7:1 | Cumple |
| Avatar iniciales (claro) | `textPrimary` #2B1E1A | #DDEFE9 | 13.50:1 | 7:1 | Cumple |
| Avatar iniciales (claro) | `textPrimary` #2B1E1A | #F7E7C4 | 13.18:1 | 7:1 | Cumple |
| Avatar iniciales (claro) | `textPrimary` #2B1E1A | #E6E0F5 | 12.54:1 | 7:1 | Cumple |
| Avatar iniciales (claro) | `textPrimary` #2B1E1A | #DCEAF7 | 13.16:1 | 7:1 | Cumple |
| Avatar iniciales (claro) | `textPrimary` #2B1E1A | #F1E4DC | 12.94:1 | 7:1 | Cumple |
| Avatar iniciales (oscuro) | `textPrimary` #F7EDE7 | #4A2420 | 11.65:1 | 7:1 | Cumple |
| Avatar iniciales (oscuro) | `textPrimary` #F7EDE7 | #1D3A32 | 10.70:1 | 7:1 | Cumple |
| Avatar iniciales (oscuro) | `textPrimary` #F7EDE7 | #4A3A16 | 9.55:1 | 7:1 | Cumple |
| Avatar iniciales (oscuro) | `textPrimary` #F7EDE7 | #332B4A | 11.50:1 | 7:1 | Cumple |
| Avatar iniciales (oscuro) | `textPrimary` #F7EDE7 | #1E3247 | 11.37:1 | 7:1 | Cumple |
| Avatar iniciales (oscuro) | `textPrimary` #F7EDE7 | #3A2E29 | 11.37:1 | 7:1 | Cumple |


Resultado: **0 parejas fallan**. La pareja de texto más baja es el enlace coral sobre el fondo crema (4,75:1), por eso el texto coral siempre es ≥ 14 sp en peso 700.

Parejas **prohibidas** (no cumplen y no se deben usar): texto blanco sobre `accent`; `textSecondary` sobre `primarySoft`/`secondarySoft`; `border` como único indicador de un campo; `confetti*` como color de texto; texto sobre fotos sin velo (si hay texto sobre la foto de portada, poner un degradado `overlay` de abajo hacia arriba de al menos 50 %).

## 2. Accesibilidad base (aplica a todo)

- **Objetivo táctil ≥ 48 × 48 dp** (`size.minTouchTarget`). Si el elemento visible es menor (íconos de 24 dp), usar `hitSlop` o `minHeight/minWidth: 48`. Separación mínima entre objetivos: 8 dp.
- **Texto grande:** `allowFontScaling` siempre activo (nunca `false`). Cada variante define `maxFontSizeMultiplier` (§3). Las pantallas deben funcionar con la escala de fuente del sistema al **200 %**: nada de alturas fijas en contenedores de texto (usar `minHeight`), las filas pasan a dos líneas, los botones crecen en alto, todo dentro de `ScrollView`.
- **No solo color:** estados (error, sorteado, seleccionado, excluido) siempre con ícono y/o texto además del color.
- **Lector de pantalla (TalkBack):** todo control con `accessibilityRole` y `accessibilityLabel` en español; estados con `accessibilityState` (`disabled`, `selected`, `checked`, `busy`, `expanded`). Cambios importantes anunciados con `AccessibilityInfo.announceForAccessibility` (p. ej. "Sorteo hecho").
- **Orden de foco** = orden visual. Al abrir una hoja inferior o diálogo, el foco va a su título; al cerrar, vuelve al control que la abrió.
- **Foco visible:** anillo de 2 dp `focus` con 2 dp de separación en controles enfocados por teclado/D-pad.
- **Movimiento reducido** respetado (ver §0).
- Idioma: `lang`/textos en `es-CO`. Fechas con `Intl.DateTimeFormat('es-CO')`; dinero con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })` → "$ 50.000".

## 3. Tipografía

Fuentes: **Fredoka** (display) y **Nunito** (cuerpo). Ver `font` en `tokens.json`.

| Variante | Fuente (token `font`) | Tamaño / interlineado (sp) | `maxFontSizeMultiplier` | Uso |
|---|---|---|---|---|
| `display` | Fredoka 600 (`display`) | 34 / 40 | 1,5 | Nombre revelado, número grande |
| `title1` | Fredoka 600 | 28 / 34 | 1,6 | Título de pantalla principal |
| `title2` | Fredoka 600 | 22 / 28 | 1,8 | Título de sección, título de hoja |
| `title3` | Nunito 700 (`bodyBold`) | 18 / 24 | 2,0 | Título de tarjeta |
| `body` | Nunito 400 | 16 / 24 | 2,0 | Texto general, campos |
| `bodyStrong` | Nunito 700 | 16 / 24 | 2,0 | Énfasis, nombres en listas |
| `label` | Nunito 700 | 14 / 20 | 2,0 | Etiquetas de campo, chips |
| `button` | Nunito 800 | 16 / 20 | 1,8 | Botones |
| `caption` | Nunito 600 | 13 / 18 | 2,0 | Ayudas, metadatos, contador de caracteres |
| `overline` | Nunito 800, mayúsculas, espaciado 0,8 | 12 / 16 | 1,8 | Encabezados de grupo de lista ("MIEMBROS") |
| `countdown` | Fredoka 600, `tabular-nums` | 40 / 44 | 1,4 | Días que faltan |
| `code` | Nunito 800, espaciado 4 | 28 / 34 | 1,5 | Código de invitación |

Reglas: tamaño mínimo absoluto 12 sp; máximo 2 tamaños de display por pantalla; títulos máximo 2 líneas con `numberOfLines={2}` **solo** en tarjetas de lista (en detalle, sin límite); nunca texto en mayúsculas sostenidas salvo `overline`; párrafos ≤ 70 caracteres por línea (en tablets, `maxContentWidth` 560 centrado).

## 4. Espaciado

Base 4 dp. Tokens `space`:

| Token | dp | Uso típico |
|---|---|---|
| `none` | 0 | |
| `xxs` | 2 | Ajustes ópticos |
| `xs` | 4 | Ícono ↔ texto pequeño |
| `sm` | 8 | Ícono ↔ texto, separación mínima entre objetivos táctiles |
| `md` | 12 | Padding interno de chips, entre etiqueta y campo |
| `lg` | 16 | Padding de tarjetas, entre campos de formulario |
| `xl` | 20 | |
| `gutter` | 20 | **Margen lateral de pantalla** |
| `xxl` | 24 | Entre secciones |
| `xxxl` | 32 | Antes del botón principal, arriba de estados vacíos |
| `huge` | 48 | Separación de bloques grandes (revelación) |
| `giant` | 64 | Margen superior de bienvenida |

El botón primario de cada pantalla va **fijo abajo** (zona del pulgar) cuando la pantalla es un formulario o tiene una acción dominante: contenedor con `paddingHorizontal: gutter`, `paddingTop: md`, `paddingBottom: max(insets.bottom, lg)`, fondo `background` y borde superior `border` solo cuando el contenido hace scroll por debajo.

## 5. Radios

| Token | dp | Uso |
|---|---|---|
| `xs` | 6 | Esqueletos de texto, insignias pequeñas |
| `sm` | 10 | Campos de texto, miniaturas |
| `md` | 14 | Botones, toasts |
| `lg` | 20 | Tarjetas, portada de grupo |
| `xl` | 28 | Esquinas superiores de hojas inferiores, tarjeta de revelación |
| `full` | 9999 | Avatares, chips, insignias de cuenta regresiva, burbujas de chat (con una esquina `xs` hacia el emisor) |

## 6. Sombras y elevación

Android usa `elevation`; iOS usa `shadow*`. Aplicar ambos (objeto `shadow.*` de `tokens.json`).

| Token | elevation | iOS (color, opacidad, radio, offset Y) | Uso |
|---|---|---|---|
| `none` | 0 | — | Elementos planos sobre `surface` |
| `sm` | 1 | `#2B1E1A`, 0,06, 3, 1 | Tarjetas en listas |
| `md` | 3 | `#2B1E1A`, 0,10, 8, 3 | Barra inferior fija, botón flotante, tarjeta de revelación |
| `lg` | 8 | `#2B1E1A`, 0,16, 20, 8 | Hojas inferiores, toasts, diálogos |

En oscuro las sombras apenas se ven: la jerarquía la dan `surface` (nivel 1) y `surfaceAlt` (nivel 2) más un borde `border` de 1 dp en tarjetas.

## 7. Movimiento

| Token `duration` | ms | Uso |
|---|---|---|
| `instant` | 100 | Estado presionado (escala/color) |
| `fast` | 150 | Fundidos, cambio de estado, versión con movimiento reducido |
| `normal` | 250 | Entrada de toasts, expandir/colapsar, navegación |
| `slow` | 400 | Hoja inferior, tarjetas que entran en lista |
| `skeletonPulse` | 1200 | Ciclo del brillo del esqueleto |
| `toast` / `toastWithAction` | 4000 / 6000 | Tiempo visible del toast |
| `drawMin` / `drawLoop` | 1800 / 900 | Animación del sorteo: duración mínima y ciclo de espera |
| `revealHold` | 1200 | Tiempo de "mantén presionado" para abrir el regalo |
| `revealFlip` | 600 | Giro de la tarjeta al revelar |
| `confetti` | 1800 | Lluvia de confeti |
| `countUp` | 500 | Números que cuentan (miembros, días) |

| Token `easing` | Curva | Uso |
|---|---|---|
| `standard` | `bezier(0.2, 0, 0, 1)` | Casi todo |
| `decelerate` | `bezier(0, 0, 0, 1)` | Elementos que entran |
| `accelerate` | `bezier(0.3, 0, 1, 1)` | Elementos que salen |
| `linear` | `bezier(0, 0, 1, 1)` | Barras de progreso, esqueleto |

| Token `spring` | damping / stiffness / mass | Uso |
|---|---|---|
| `gentle` | 18 / 180 / 1 | Hojas inferiores, tarjetas |
| `bouncy` | 12 / 200 / 1 | Revelación, insignia "¡Hoy!" (solo momentos especiales) |
| `snappy` | 22 / 320 / 1 | Interruptores, chips |

Estado presionado estándar: `scale` 1 → 0,97 en `instant` con `standard`, y cambio de color al token `*Pressed`. Android además usa `android_ripple={{ color: 'rgba(255,255,255,0.2)' }}` en botones rellenos y `rgba(43,30,26,0.08)` en fantasma/tarjetas.

## 8. Componentes

Formato de cada ficha: anatomía → medidas → estados → accesibilidad. Estados posibles: **default**, **pressed**, **disabled**, **loading**, **error** (y otros cuando aplica). Todos usan `Pressable` de React Native (o `GestureDetector` si hay gesto).

### 8.1 Button

Anatomía: [ícono opcional 20 dp] + texto (`button`). Ancho: `fullWidth` (por defecto en barras inferiores) o ajustado al contenido con mínimo 120 dp. Alto `size.buttonHeight` 52 (pequeño 40 visible + `hitSlop` hasta 48). Padding horizontal 20; separación ícono-texto 8. Radio `md` 14. El texto nunca se corta: con fuente grande el botón crece en alto (`minHeight`).

| Variante | Default | Pressed | Disabled | Loading | Error |
|---|---|---|---|---|---|
| **primary** | fondo `primary`, texto `textOnPrimary` | fondo `primaryPressed`, escala 0,97 | fondo `disabledBg`, texto `textDisabled`, sin sombra | fondo `primary`, `ActivityIndicator` color `textOnPrimary` 20 dp en lugar del ícono, texto cambia a gerundio ("Creando…"), ancho fijo (no salta) | No existe "botón en error": el botón vuelve a default y el error se muestra en el campo o en Banner. Háptico `error`. |
| **secondary** (confianza) | fondo `secondary`, texto `textOnSecondary` | `secondaryPressed` | igual que primary disabled | igual, indicador `textOnSecondary` | igual |
| **ghost** | sin fondo, texto `primary` (700), sin borde | fondo `primarySoft` | texto `textDisabled` | indicador `primary` | igual |
| **outline** (variante de ghost para acciones secundarias de igual peso) | borde 1,5 `borderStrong`, texto `textPrimary` | fondo `surfaceAlt` | borde y texto `textDisabled` | indicador `textPrimary` | igual |
| **destructive** | fondo `danger`, texto `textOnDanger` | `dangerPressed` | igual que primary disabled | indicador `textOnDanger` | igual |
| **destructiveGhost** | texto `danger`, sin fondo | fondo `dangerSoft` | `textDisabled` | indicador `danger` | igual |

Reglas:
- Máximo **un** `primary` por pantalla. "Hacer el sorteo" usa `secondary` (verde = justicia) porque es el momento de confianza.
- `destructive` relleno solo dentro de diálogos de confirmación; en pantallas se usa `destructiveGhost`.
- Mientras `loading`, el botón no acepta toques (`disabled` interno) y `accessibilityState={{ busy: true }}`.
- Disabled solo si es evidente por qué; si no, dejarlo activo y explicar al tocar (p. ej. "Necesitan al menos 3 personas").
- A11y: `accessibilityRole="button"`, `accessibilityLabel` = texto visible (más contexto si hace falta: "Compartir invitación por WhatsApp").

### 8.2 TextField

Anatomía: etiqueta (`label`, `textPrimary`) arriba, siempre visible (no usar el placeholder como etiqueta) → caja → texto de ayuda o error (`caption`) → contador opcional a la derecha.
Medidas: caja `minHeight` 56, padding horizontal 16, radio `sm` 10, fondo `surface`, texto `body`. Ícono a la izquierda opcional 20 dp `textSecondary`; botón de limpiar (`x`) a la derecha cuando hay texto (objetivo 48).
Variantes: `multiline` (crece hasta 5 líneas, luego scroll), `money` (prefijo "$" fijo, `keyboardType="number-pad"`, formatea miles con punto mientras escribe, guarda entero), `code` (variante `code`, mayúsculas, centrado), `url`.

| Estado | Borde | Fondo | Texto de ayuda | Otros |
|---|---|---|---|---|
| default | 1,5 `borderStrong` | `surface` | `textSecondary` | placeholder `textSecondary` |
| focused | 2 `secondary` | `surface` | `textSecondary` | cursor `primary` (`selectionColor`) |
| filled | 1,5 `borderStrong` | `surface` | | |
| disabled | 1,5 `border` | `disabledBg` | `textDisabled` | `editable={false}` |
| loading (validando, p. ej. código) | 1,5 `borderStrong` | `surface` | "Buscando el grupo…" | `ActivityIndicator` 20 dp a la derecha |
| error | 2 `danger` | `surface` | ícono `alert-circle` 16 + mensaje en `danger` | háptico `error`; el foco vuelve al campo; `accessibilityLiveRegion="polite"` en el mensaje |
| success (opcional) | 1,5 `borderStrong` | `surface` | ícono `check-circle-2` `success` + texto | |

Reglas: validar al salir del campo o al enviar, **nunca mientras escribe** (excepto el contador y el formato de miles). El error dice qué hacer. `returnKeyType` = "next" entre campos y "done"/"send" en el último; `blurOnSubmit` según el caso. A11y: `accessibilityLabel` = etiqueta; `accessibilityHint` = ayuda; en error, `accessibilityLabel` = "{etiqueta}, error: {mensaje}".

### 8.3 Hápticos (tabla de uso obligatorio)

| Evento | Háptico |
|---|---|
| Cambiar un interruptor, seleccionar chip, marcar exclusión | `selection` |
| Copiar código | `tapLight` |
| Sorteo terminado con éxito | `success` |
| Revelación: cada 200 ms mientras mantiene presionado | `tapLight` (sube a `tapMedium` en el último 40 %) |
| Revelación: se abre el regalo | `reveal` + `success` 150 ms después |
| Error de validación o de servidor | `error` |
| Abrir diálogo de confirmación destructiva | `warning` |

### 8.4 Card

Fondo `surface`, radio `lg` 20, padding `lg` 16, sombra `sm` (claro) / borde 1 `border` (oscuro). Separación entre tarjetas 12.
Variantes: **GroupCard** (foto 56 dp radio `sm` o inicial, título `title3`, metadatos `caption`: "12 personas · Entrega 18 dic", a la derecha `CountdownBadge`, debajo chip de estado), **InfoCard** (ícono 24 + título + texto), **SecretCard** (la de "Mi amigo secreto": fondo `surface` con borde 1,5 `accent` **decorativo** —2,3:1, no transmite información—; la tarjeta se identifica por su título y el ícono `lock`).

| Estado | Visual |
|---|---|
| default | como arriba |
| pressed (si es tocable) | fondo `surfaceAlt`, escala 0,98 |
| disabled (grupo archivado) | opacidad del contenido 0,6, chip "Terminado" |
| loading | Skeleton con la misma forma (ver 8.8) |
| error | contenido reemplazado por fila: ícono `wifi-off` + "No pudimos cargar esto." + ghost "Reintentar" |

A11y: tarjeta tocable = un solo elemento (`accessible`, `accessibilityRole="button"`), etiqueta compuesta: "Oficina 2026, 12 personas, entrega el 18 de diciembre, faltan 21 días, sorteo hecho".

### 8.5 Avatar

Tamaños `avatarSm` 32, `avatarMd` 40, `avatarLg` 56, `avatarXl` 96. Círculo (`full`).
- Con foto: `Image` con `resizeMode="cover"`, borde 2 `surface` cuando se superponen (pila de avatares, desplazamiento -8).
- Sin foto: iniciales (máx. 2, `bodyExtraBold`, 40 % del tamaño) sobre un fondo de esta lista elegido por `hash(userId) % 6`: claro `#FCE3DE`, `#DDEFE9`, `#F7E7C4`, `#E6E0F5`, `#DCEAF7`, `#F1E4DC` con texto `textPrimary`; oscuro `#4A2420`, `#1D3A32`, `#4A3A16`, `#332B4A`, `#1E3247`, `#3A2E29` con el `textPrimary` del tema oscuro (todas ≥ 9,5:1, ver §1.3).
- **Anónimo** (amigo secreto que te escribe): círculo `secondarySoft` con ícono `gift` `textOnSecondarySoft`. Nunca iniciales.
- Insignia opcional abajo a la derecha (organizador: corona no; usar chip "Organiza" en la fila, no ícono suelto).

| Estado | Visual |
|---|---|
| default | foto o iniciales |
| pressed (editable en perfil) | velo `overlay` + ícono `camera` blanco |
| disabled | opacidad 0,5 |
| loading (subiendo foto) | círculo `skeleton` + `ActivityIndicator` |
| error (foto no carga) | cae a iniciales sin mensaje |

A11y: decorativo cuando está junto al nombre (`accessible={false}`, `importantForAccessibility="no"`); editable: "Cambiar foto de perfil".

### 8.6 Chip

Alto visible 36 (`chipHeight`) con objetivo 48 (`hitSlop` 6 arriba/abajo), padding horizontal 14, radio `full`, texto `label`.

| Tipo / estado | Default | Pressed | Selected | Disabled | Error |
|---|---|---|---|---|---|
| **Filtro/selección** (fecha rápida, talla) | borde 1,5 `borderStrong`, texto `textPrimary` | fondo `surfaceAlt` | fondo `primarySoft`, borde `primary`, texto `textOnPrimarySoft`, ícono `check` 16 a la izquierda | borde `border`, texto `textDisabled` | n/a |
| **Estado** (no tocable) | ver lista abajo | — | — | — | — |

Chips de estado del grupo (siempre ícono + texto):
- "Esperando gente" — fondo `surfaceAlt`, texto `textSecondary`, ícono `users`.
- "Sorteo hecho" — `secondarySoft` / `textOnSecondarySoft`, ícono `lock`.
- "Revelado" — `accent` / `textOnAccent`, ícono `gift`.
- "Terminado" — `surfaceAlt` / `textSecondary`, ícono `check`.
- "Organizas tú" — `primarySoft` / `textOnPrimarySoft`.

A11y: selección `accessibilityRole="checkbox"` (múltiple) o `"radio"` (única) con `accessibilityState={{ checked }}`.

### 8.7 EmptyState

Centrado verticalmente en el espacio libre, ancho máx. 320. Ilustración o ícono 32 en círculo 72 `primarySoft` → título `title2` → texto `body` `textSecondary` (1–2 frases, qué es y por qué vale la pena) → botón `primary` → opcional `ghost` para la segunda acción.
Estados: **default**; **loading** no existe (se usa Skeleton, nunca un EmptyState mientras carga); **error** = variante con ícono `wifi-off` o `alert-circle`, título "No pudimos cargar tus grupos", texto que dice qué hacer, botón "Reintentar".
Regla: **ninguna pantalla en blanco**. Toda lista tiene su EmptyState con acción.

### 8.8 Skeleton

Bloques con fondo `skeleton`, radio `xs` (texto) o de la forma real (avatar círculo, tarjeta `lg`). Brillo: gradiente `skeletonHighlight` que se mueve de izquierda a derecha en `skeletonPulse` lineal (con movimiento reducido: opacidad 1 ↔ 0,6 sin desplazamiento). Mostrar solo si la carga tarda > 300 ms (evitar parpadeo); si hay datos en caché, **mostrar la caché** y actualizar en silencio. A11y: contenedor con `accessibilityLabel="Cargando"` y `accessibilityState={{ busy: true }}`; bloques internos ocultos al lector.

### 8.9 Toast y Banner

**Toast** (confirmaciones efímeras, no críticas): abajo, encima de la barra fija, margen 16, radio `md`, fondo `textPrimary` (claro) / `surfaceAlt` (oscuro), texto `surface` (claro) / `textPrimary` (oscuro) — contraste 15:1 / 13:1, ícono 20 a la izquierda, acción ghost opcional ("Deshacer") en `accent` (oscuro) o `#FFC9C0` (claro, 9:1 sobre `#2B1E1A`). Entra deslizando 16 dp + fundido en `normal`; dura `toast` (o `toastWithAction`); deslizar para descartar. Uno a la vez; el nuevo reemplaza al anterior. `accessibilityLiveRegion="polite"` + `announceForAccessibility`.

**Banner** (información persistente en la pantalla, arriba del contenido): radio `md`, padding 12/16, ícono 20 + texto `body`/`label` + acción opcional.

| Tipo | Fondo / texto | Ícono | Ejemplo |
|---|---|---|---|
| info | `surfaceAlt` / `textPrimary` | `info` | "Cuando estén todos, haz el sorteo." |
| privacidad | `secondarySoft` / `textOnSecondarySoft` | `lock` | "Solo tú ves a quién te tocó. Ni el organizador lo sabe." |
| warning | `surfaceAlt` / `textPrimary`, ícono `warning` | `alert-triangle` | "Faltan 2 días y tu lista está vacía." |
| error | `dangerSoft` / `textPrimary`, ícono `danger` | `alert-circle` | "No hay conexión. Te mostramos lo último guardado." |
| especial | `accent` / `textOnAccent` | `gift` | "¡Hoy es la entrega!" |

Estados del Banner: default; pressed (si toda la franja es tocable: escala 0,99 + fondo más oscuro 8 %); disabled n/a; loading (acción muestra indicador); error = tipo error. Banner de error de red se quita solo al volver la conexión (`@react-native-community/netinfo`).

### 8.10 BottomSheet

Para formularios cortos (agregar deseo, exclusiones de una persona, reportar), selecciones y confirmaciones no destructivas. Recomendado `@gorhom/bottom-sheet` (Reanimated + Gesture Handler).
Fondo `surface`, esquinas superiores `xl` 28, sombra `lg`, velo `overlay` (tocar el velo cierra, salvo que haya cambios sin guardar: en ese caso pregunta "¿Descartar los cambios?" [Seguir editando] [Descartar]). Agarradera 36 × 4 `borderStrong` centrada a 8 dp del borde. Título `title2` + botón cerrar `x` (48). Padding `gutter`. Acción principal fija abajo dentro de la hoja. Teclado: la hoja sube con el teclado (`keyboardBehavior="interactive"`), el campo enfocado queda visible. Altura: según contenido, máx. 90 % de la pantalla, luego scroll. Animación `spring.gentle`; con movimiento reducido, fundido `fast`. Botón atrás de Android cierra la hoja.

| Estado | Visual |
|---|---|
| default | abierta |
| pressed (agarradera) | agarradera `textSecondary` |
| disabled | n/a (los controles internos tienen el suyo) |
| loading | acción principal en loading; la hoja no se puede cerrar arrastrando mientras guarda |
| error | Banner error dentro de la hoja, arriba de la acción |

A11y: `accessibilityViewIsModal`, foco al título al abrir, "Cerrar" etiquetado; acción de cierre disponible sin gesto.

**Diálogo de confirmación** (solo acciones destructivas): `Modal` centrado, radio `xl`, padding 24, título `title2`, texto que explica la consecuencia en una frase, botones apilados en vertical (ancho completo): `destructive` arriba con el verbo exacto ("Sortear de nuevo"), `outline` "Cancelar" abajo. Háptico `warning` al abrir. Nunca "Sí/No" ni "Aceptar".

### 8.11 CountdownBadge

Insignia redonda (`full`) alto 28 (en tarjetas) o versión grande en detalle (número `countdown` + texto `label` debajo). Ícono `calendar-days` 16 + texto `label`.

| Condición | Texto | Estilo |
|---|---|---|
| > 7 días | "Faltan 21 días" | fondo `surfaceAlt`, texto `textPrimary` |
| 2–7 días | "Faltan 3 días" | fondo `primarySoft`, texto `textOnPrimarySoft` |
| 1 día | "¡Mañana!" | fondo `primarySoft`, texto `textOnPrimarySoft`, ícono `alarm-clock` |
| 0 días | "¡Hoy!" | fondo `accent`, texto `textOnAccent`, ícono `gift`, pulso suave (escala 1 → 1,05, 2 veces al aparecer, `spring.bouncy`; sin pulso con movimiento reducido) |
| pasó | "Entregado" | fondo `surfaceAlt`, texto `textSecondary`, ícono `check` |
| loading | Skeleton 96 × 28 | |
| error (sin fecha) | no se muestra | |

Cálculo: diferencia en días calendario en la zona horaria del teléfono (`America/Bogota` por defecto), no en horas. A11y: "Faltan 3 días para la entrega".

### 8.12 Otros controles usados

- **Switch** (interruptor): `Switch` nativo con `trackColor={{ false: borderStrong, true: secondary }}`, `thumbColor` `surface`. Fila completa tocable (48+), etiqueta a la izquierda y descripción `caption` debajo. `accessibilityRole="switch"`.
- **Checkbox de exclusión:** cuadrado 24 radio 6, borde 1,5 `borderStrong`; marcado: fondo `primary` + ícono `check` `textOnPrimary`. Fila completa tocable.
- **TopBar:** alto 56, título `title2` (o `title3` si es largo) alineado a la izquierda, botón atrás 48. Sin sombra; borde inferior `border` al hacer scroll.
- **ListRow:** `minHeight` 56 (64 con avatar), padding horizontal `gutter`, avatar 40 + nombre `bodyStrong` + detalle `caption`, acción a la derecha (ícono 24 en objetivo 48).
- **ChatBubble:** máx. 80 % del ancho, padding 12/14, radio `lg` con la esquina inferior del emisor en `xs`. Propia: fondo `primary`, texto `textOnPrimary`. Recibida: `surfaceAlt`, `textPrimary`. Hora `caption`. Estados: enviando (opacidad 0,7 + reloj), error (ícono `alert-circle` `danger` + "No se envió. Toca para reintentar."), reportado (texto reemplazado por "Reportaste este mensaje" en cursiva `textSecondary`).

## Anexo A — Script de verificación de contraste

Ejecutar con `node verificar-contraste.js` (lee los colores de `tokens.json`). El equipo móvil puede convertirlo en test de Vitest del paquete `ui` para que el CI falle si alguien cambia un color y rompe el contraste.

```js
// verificar-contraste.js — WCAG 2.1 contrast ratio
const T = require('./tokens.json').color;
const lum = (hex) => {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(1).substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
// [texto, fondo, mínimo]
const PAIRS = [
  ['textPrimary', 'background', 4.5], ['textPrimary', 'surface', 4.5], ['textPrimary', 'surfaceAlt', 4.5],
  ['textSecondary', 'background', 4.5], ['textSecondary', 'surface', 4.5], ['textSecondary', 'surfaceAlt', 4.5],
  ['textOnPrimary', 'primary', 4.5], ['textOnPrimary', 'primaryPressed', 4.5],
  ['textOnPrimarySoft', 'primarySoft', 4.5],
  ['textOnSecondary', 'secondary', 4.5], ['textOnSecondary', 'secondaryPressed', 4.5],
  ['textOnSecondarySoft', 'secondarySoft', 4.5],
  ['textOnAccent', 'accent', 4.5], ['textOnAccent', 'accentPressed', 4.5],
  ['accentText', 'background', 4.5], ['accentText', 'surface', 4.5],
  ['primary', 'background', 4.5], ['primary', 'surface', 4.5],
  ['secondary', 'background', 4.5], ['secondary', 'surface', 4.5],
  ['success', 'surface', 4.5], ['warning', 'surface', 4.5],
  ['danger', 'surface', 4.5], ['danger', 'background', 4.5], ['danger', 'dangerSoft', 4.5],
  ['textOnDanger', 'danger', 4.5], ['textOnDanger', 'dangerPressed', 4.5],
  ['textDisabled', 'disabledBg', 3], ['borderStrong', 'surface', 3], ['borderStrong', 'background', 3],
  ['focus', 'background', 3], ['focus', 'surface', 3], ['primary', 'background', 3], ['danger', 'surface', 3],
];
let fails = 0;
for (const theme of ['light', 'dark']) {
  for (const [fg, bg, min] of PAIRS) {
    const r = ratio(T[theme][fg], T[theme][bg]);
    if (r < min) { fails++; console.log(`FALLA ${theme} ${fg}/${bg}: ${r.toFixed(2)} < ${min}`); }
  }
}
console.log(fails ? `${fails} parejas fallan` : 'Todas las parejas cumplen');
process.exit(fails ? 1 : 0);
```
