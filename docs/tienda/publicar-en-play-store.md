# Publicar Entre Nos en Google Play, paso a paso

Esta guía sirve para una cuenta **personal** de Play Console. Lleva unos 30 minutos de configuración y luego **14 días de prueba cerrada** antes de poder salir a producción. Todo es gratis: la cuota de USD 25 de Play Console ya la pagaste al crear la cuenta.

Los pasos 1, 2 y 3 se hacen **una sola vez**.

---

## 1. Crea la llave de subida
Es la llave con que firmas cada versión que subes a Play. Google guarda aparte la llave final de la app (*Firma de apps de Play*). Si pierdes la de subida se puede reponer con el soporte de Play, pero es un trámite lento: **guárdala bien**.

1. En Windows, abre PowerShell en una carpeta segura, por ejemplo `Documentos\entre-nos-llaves`.
2. Ejecuta el comando de abajo. `keytool` viene con Android Studio; si no lo tienes, instala el JDK 17 de https://adoptium.net.
   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
     -keystore entrenos-upload.jks -alias entrenos -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Te pide:
   - Una contraseña: invéntala y guárdala.
   - Tu nombre y país: basta con `CO`. El resto se puede dejar en blanco.
4. Convierte la llave a texto y cópiala al portapapeles:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("entrenos-upload.jks")) | Set-Clipboard
   ```
5. En GitHub, ve a **Settings → Secrets and variables → Actions → New repository secret** y crea estos cuatro secretos:

   | Secreto | Valor |
   |---|---|
   | `ANDROID_UPLOAD_KEYSTORE_BASE64` | Lo que copiaste en el paso 4 |
   | `ANDROID_UPLOAD_STORE_PASSWORD` | La contraseña del paso 3 |
   | `ANDROID_UPLOAD_KEY_ALIAS` | `entrenos` |
   | `ANDROID_UPLOAD_KEY_PASSWORD` | La misma contraseña del paso 3 |

6. **Respaldo:** guarda `entrenos-upload.jks` y la contraseña en dos sitios, por ejemplo un gestor de contraseñas y una memoria USB. Nunca los subas al repositorio.

## 2. Publica la pantalla de consentimiento de Google
Mientras esté en modo *Prueba*, solo entran con Google los correos de la lista de usuarios de prueba. Los revisores de Play y tus testers no podrían entrar.

1. Entra a https://console.cloud.google.com → proyecto *Entre Nos*.
2. Ve a **Google Auth Platform → Público** y haz clic en **Publicar app**. Confirma.
3. La app solo pide nombre, correo y foto (`openid`, `email`, `profile`), así que Google **no exige verificación**. Queda activa de inmediato.

## 3. Crea la app en Play Console
1. https://play.google.com/console → **Crear app**.
   - Nombre: `Entre Nos – amigo secreto`
   - Idioma predeterminado: Español (Latinoamérica) – es-419
   - Tipo: App · Gratis
   - Acepta las declaraciones.
2. En **Panel → Configura tu app**, completa cada tarea con estos datos:

   | Tarea | Qué poner |
   |---|---|
   | Política de privacidad | `https://entre-nos-api.panter.workers.dev/privacidad` |
   | Acceso a la app | "Se requiere acceso" → instrucciones: *Inicia sesión con cualquier cuenta de Google. No hace falta nada más.* |
   | Anuncios | No contiene anuncios |
   | Clasificación de contenido | Respuestas en [clasificacion-contenido.md](clasificacion-contenido.md) |
   | Público objetivo | 13–15, 16–17 y 18+ (no menores de 13) |
   | Seguridad de los datos | Respuestas en [seguridad-de-datos.md](seguridad-de-datos.md) |
   | Apps gubernamentales, financieras y de salud | No |
   | Categoría y contacto | Estilo de vida · tu correo de contacto |

3. Ve a **Ficha de Play Store principal**:
   - Textos: descripción corta y larga de [ficha-play-store.md](ficha-play-store.md).
   - Ícono: [graficos/icono-512.png](graficos/icono-512.png).
   - Gráfico de funciones: [graficos/grafico-funciones-1024x500.png](graficos/grafico-funciones-1024x500.png).
   - Capturas de teléfono: entre 4 y 8, desde la carpeta [graficos/](graficos/).

## 4. Genera el AAB (cada vez que publiques una versión)
1. En GitHub ve a **Actions → Release Android (AAB para Play) → Run workflow → Run workflow**.
2. Tarda entre 15 y 25 minutos.
3. Abre la corrida y, en **Artifacts**, descarga:
   - `entre-nos-aab-N`: el archivo `.aab` que se sube a Play.
   - `entre-nos-mapping-N`: el `mapping.txt`, que sirve para leer los reportes de errores.

El número de versión (`versionCode`) sube solo en cada corrida.

## 5. Prueba cerrada: 14 días con 12 testers
Es obligatoria para cuentas personales antes de salir a producción.

1. **Pruebas → Prueba cerrada → Crear pista**, con el nombre "Testers".
2. **Testers**: crea una lista con los **12 correos de Gmail** (o más) y guarda. Copia el **enlace de inscripción**.
3. **Crear versión** y sube el `.aab`.
   - La primera vez, Play te ofrece la **Firma de apps de Play**: acéptala.
   - Notas de la versión: "Primera versión de prueba".
4. **Revisar versión → Iniciar lanzamiento**. La primera revisión tarda de unas horas a unos días.
5. Comparte el enlace de inscripción con los 12. Cada uno se inscribe e instala la app desde Play.
6. Durante **14 días seguidos** deben mantenerla instalada y usarla de vez en cuando. Lo más fácil es armar un grupo de prueba entre ellos.

### Justo después de la primera subida (importante)
Play firma la app con su propia llave. Para que **Continuar con Google** y los **enlaces de invitación** funcionen con esa firma:

1. En Play Console ve a **Prueba y lanzamiento → Configuración → Integridad de la app → Firma de apps**. Copia el **SHA-1** y el **SHA-256** de la *Clave de firma de apps*.
2. En Google Cloud → **Clientes → Crear cliente → Android**:
   - Paquete `com.entrenos.amigosecreto`.
   - El **SHA-1** de Play.

   Es un cliente más; no borres el de staging.
3. Pásame el **SHA-256**: lo agrego a `ANDROID_CERT_FINGERPRINTS` para los App Links y redespliego la API.

## 6. Solicita el acceso a producción
1. Pasados los 14 días, en el **Panel** aparece **Solicitar acceso a producción**.
2. Responde el cuestionario sobre cómo fue la prueba: cuántos testers hubo, qué comentarios dejaron y qué cambiaste. Normalmente lo aprueban en unos 7 días.
3. Luego ve a **Producción → Crear versión**. Sube un AAB nuevo (paso 4) o promueve el de la prueba cerrada.
4. Elige países (Colombia u otros) → **Iniciar lanzamiento**.

## 7. Actualizaciones
1. Fusiona los cambios en `main`.
2. Corre el workflow del paso 4.
3. Sube el `.aab` a la pista que quieras: prueba cerrada o producción.

La API se despliega sola en staging al fusionar. Producción se despliega a mano: **Actions → Deploy API → Run workflow → production**.

---

### Sobre la protección del APK/AAB
- **R8** (minificación y ofuscación) está activo en las versiones de lanzamiento:
  - Renombra y elimina el código Java/Kotlin que no se usa.
  - **Reducción de recursos** quita imágenes y textos sin uso.
- El código de la app va compilado a **bytecode de Hermes**, no como JavaScript legible.
- El **AAB** hace que cada teléfono descargue solo lo suyo: su arquitectura y su densidad de pantalla. La descarga desde Play es mucho más liviana que un APK universal.
- La ofuscación dificulta la ingeniería inversa, pero ninguna app es imposible de descompilar. La protección real es que **ningún secreto vive en la app**:
  - El sorteo, el cifrado de las asignaciones y las llaves están solo en el servidor.
  - Aunque alguien descompile la app, no puede ver a quién le tocó quién.
