# Despliegue y builds desde cero

Todo corre en capas gratuitas. El despliegue de la API lo hace GitHub Actions; tú solo configuras cuentas y secretos una vez.

## 1. MongoDB Atlas (gratis, M0)
1. Crea un cluster **M0** (región más cercana: `us-east-1` / São Paulo).
2. **Database Access** → crea dos usuarios con contraseña larga (generada):
   - `entrenos_staging` con rol *readWrite* solo sobre la base `entrenos_staging`.
   - `entrenos_prod` con rol *readWrite* solo sobre la base `entrenos_prod`.
3. **Network Access** → `0.0.0.0/0` (los Workers no tienen IP fija; se compensa con usuarios de mínimo privilegio y TLS).
4. **Connect → Drivers** → copia la cadena y pon el nombre de la base antes del `?`:
   `mongodb+srv://entrenos_staging:<clave>@cluster0.xxxx.mongodb.net/entrenos_staging?retryWrites=true&w=majority`

## 2. Cloudflare (gratis)
1. *My Profile → API Tokens → Create Token* → plantilla **Edit Cloudflare Workers**.
2. Copia el **Account ID** (panel de Workers, a la derecha).
3. La primera vez que entres a Workers, Cloudflare te pide elegir un subdominio `*.workers.dev`.

## 3. Secretos en GitHub
`Settings → Secrets and variables → Actions → New repository secret`:

| Secreto | Obligatorio | Valor |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Sí | Token del paso 2 |
| `CLOUDFLARE_ACCOUNT_ID` | Sí | Account ID |
| `MONGODB_URI_STAGING` | Sí | Cadena de staging |
| `MONGODB_URI_PRODUCTION` | Sí | Cadena de producción |
| `DEV_LOGIN_KEY_STAGING` | Para probar sin Google | Texto aleatorio de 32+ caracteres |
| `GOOGLE_CLIENT_IDS` | Para Google Sign-In | Client IDs separados por coma (ver paso 5) |
| `EXPO_ACCESS_TOKEN` | Opcional | Token de expo.dev (mejora límites de push) |
| `EXPO_TOKEN` | Para builds en CI | Token de expo.dev |

`JWT_SECRET` y `ASSIGNMENT_KEY` **no** se crean a mano: el workflow los genera una sola vez y los guarda en Cloudflare.

## 4. Desplegar la API
- **Staging:** automático en cada merge a `main` (workflow *Deploy API*). La URL queda en el resumen del workflow: `https://entre-nos-api-staging.<subdominio>.workers.dev`.
- **Producción:** *Actions → Deploy API → Run workflow → production*.
- Verificación: `curl https://<url>/health` → `{"ok":true}`.

## 5. Google Sign-In (Google Cloud Console, gratis)
1. Crea un proyecto y la *pantalla de consentimiento OAuth* (externa, nombre "Entre Nos").
2. Crea un cliente OAuth tipo **Web** (su ID va en la app como `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).
3. Crea un cliente tipo **Android** con paquete `com.entrenos.amigosecreto` y la **SHA-1** del certificado (EAS: `eas credentials`; Play: *Integridad de la app → certificado de firma*). Crea uno por cada certificado (debug/EAS y Play).
4. Pon en `GOOGLE_CLIENT_IDS` el client ID **Web** (es el `aud` del token que verifica la API).

## 6. App Links (abrir la app desde el enlace de invitación)
En `apps/api/wrangler.toml` pon en `ANDROID_CERT_FINGERPRINTS` las huellas **SHA-256** de los certificados (EAS y Play App Signing), separadas por coma, y despliega. La API sirve `/.well-known/assetlinks.json`.

## 7. Builds de Android
### Con EAS (nube, gratis con límites)
```bash
npm i -g eas-cli
cd apps/mobile
eas login
eas init                       # vincula el proyecto a tu cuenta de Expo
eas build -p android --profile preview      # APK de prueba (staging, login de prueba)
eas build -p android --profile production   # AAB firmado para Play Store
```
### Local (sin límites, requiere Android Studio + JDK 17)
```bash
cd apps/mobile
npx expo prebuild -p android
cd android && ./gradlew bundleRelease   # AAB en app/build/outputs/bundle/release/
```
Para firma local crea un keystore (`keytool -genkeypair ...`) y configúralo en `android/gradle.properties`. **Guarda el keystore**: sin él no puedes publicar actualizaciones (con Play App Signing, Google guarda la llave de la app y tú la de subida).

### iOS
Se puede compilar con `eas build -p ios`, pero publicar requiere una cuenta de Apple Developer (USD 99/año).

## 8. Rotación de secretos
- **Atlas:** crea un segundo usuario, cambia `MONGODB_URI_*`, despliega, borra el usuario viejo.
- **JWT_SECRET:** `wrangler secret put JWT_SECRET` con un valor nuevo; todos deben volver a entrar.
- **ASSIGNMENT_KEY:** no se rota durante la temporada (las asignaciones guardadas dejarían de leerse). Fuera de temporada, tras la purga de 60 días.
