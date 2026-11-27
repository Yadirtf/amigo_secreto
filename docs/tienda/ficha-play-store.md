# Ficha de Google Play — Entre Nos

## Datos básicos
- **Nombre de la app (≤ 30):** Entre Nos – amigo secreto
- **Paquete:** `com.entrenos.amigosecreto`
- **Categoría:** Estilo de vida (alternativa: Social)
- **Etiquetas:** Navidad, regalos, grupos, familia
- **Correo de contacto:** (el tuyo, obligatorio)
- **Política de privacidad:** `https://<api-produccion>.workers.dev/privacidad`
- **Precio:** Gratis. Sin anuncios. Sin compras dentro de la app en v1.

## Descripción corta (≤ 80)
Organiza el amigo secreto sin papelitos: sorteo justo, lista de deseos y chat 🎁

## Descripción larga (≤ 4.000)
¿Otra vez el papelito con tu propio nombre? ¿Nadie sabe qué regalar? Con **Entre Nos** el amigo secreto de la oficina, la familia o el salón queda listo en un minuto.

🎁 **Crea tu grupo en 30 segundos**
Ponle nombre, fecha de entrega y presupuesto en pesos. Invita por WhatsApp con un enlace o un código.

🎲 **Sorteo justo y secreto**
El sorteo lo hace el servidor, no un celular. Nadie se saca a sí mismo y puedes evitar parejas o personas de la misma casa. Ni siquiera quien organiza puede ver a quién le tocó a quién.

🤫 **¿A quién te tocó?**
Descúbrelo con suspenso, cuando nadie te esté viendo la pantalla.

📝 **Lista de deseos**
Anota ideas, tallas y enlaces para que te atinen al regalo. Tu amigo secreto la ve; los demás no.

💬 **Chat anónimo**
Pregúntale a tu amigo secreto su talla o su color favorito sin que sepa quién eres. Él te responde sin saber con quién habla.

⏰ **Recordatorios**
Cuenta regresiva y aviso el día de la entrega, para que a nadie se le olvide el regalo.

🎉 **Revelación**
El día de la fiesta, todos ven quién le regaló a quién.

Hecha en Colombia, liviana y pensada para gastar pocos datos. Funciona aunque la señal esté mala: tus grupos, tu amigo secreto y tu lista se ven sin conexión.

## Recursos gráficos
| Recurso | Tamaño | Fuente |
|---|---|---|
| Ícono | 512×512 PNG | `apps/mobile/assets/icon.png` (reexportar a 512) |
| Gráfico de funciones | 1024×500 | Fondo crema `#FFF8F3`, logo + "Organiza tu amigo secreto sin papelitos" |
| Capturas de teléfono | 4–8, 1080×1920 o más | Mis grupos · Crear grupo · Detalle con invitación · "¿A quién te tocó?" · Lista de deseos · Chat anónimo · Revelación |

Las capturas se toman del build de staging con datos de ejemplo (sin nombres reales).

## Prueba cerrada (obligatoria para cuentas personales)
1. *Pruebas → Prueba cerrada → Crear pista* ("Testers").
2. Sube el AAB (`eas build -p android --profile production`).
3. Agrega a los **12 testers** (lista de correos de Gmail) y comparte el enlace de inscripción.
4. Los 12 deben **instalar y mantener** la app 14 días seguidos. Pídeles que la abran varias veces (crear un grupo de prueba entre ellos sirve).
5. Después de 14 días: *Solicitar acceso a producción* y responder el cuestionario.
