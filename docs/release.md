# Publicar una versión de Android

La app se reparte como un APK firmado en la sección **Releases** del repositorio. Lo compila y lo publica el flujo `.github/workflows/release-android.yml` al crear una etiqueta de versión. Esta guía es para quien mantiene el proyecto; para instalar la app, ver [`instalacion.md`](./instalacion.md).

## Cómo funciona

1. Se crea una etiqueta `vMAYOR.MENOR.PARCHE` (por ejemplo `v0.2.0`) sobre un commit que **ya esté en `main`**.
2. El flujo comprueba que la versión de la etiqueta coincide con `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml`, y pasa los mismos controles que el pre-commit (`secrets:check`, `lint`, `type-check`, `test:ci`, `test:scripts`).
3. Compila el APK de producción (solo `arm64-v8a`), lo firma con la clave de publicación, comprueba la firma y el contenido (identificador, versión, arquitectura y que no sea depurable) y calcula su suma SHA-256.
4. Crea la Release con `task-manager-X.Y.Z-arm64-v8a.apk` y su `.sha256`, con notas generadas automáticamente. Si la Release ya existe, **reemplaza** los archivos.

Una etiqueta con sufijo (`v0.3.0-rc.1`) se publica como **versión previa** (*pre-release*) y no pasa a ser «la última».

El emulador de Android Studio suele ser `x86_64` y no puede instalar este APK: para el emulador se sigue usando el APK de depuración local (ver [`setup-android.md`](./setup-android.md)).

## Secretos de GitHub

Se crean en *Settings → Secrets and variables → Actions → Repository secrets*. Nunca se escriben en el repositorio, en una issue, en un chat ni en un registro.

| Secreto | Para qué sirve |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | El *keystore* de publicación, codificado en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | Contraseña del *keystore* |
| `ANDROID_KEY_ALIAS` | Alias de la clave dentro del *keystore* |
| `ANDROID_KEY_PASSWORD` | Contraseña de la clave |
| `SUPABASE_URL` | URL pública del proyecto de Supabase (viaja dentro del APK) |
| `SUPABASE_PUBLISHABLE_KEY` | Clave *publishable* de Supabase. **Nunca** la clave `service_role` ni una clave secreta: el flujo las rechaza |

Si falta alguno, el flujo falla al principio y dice cuáles faltan (sin mostrar valores).

## Crear el *keystore* (una sola vez)

La clave la genera el propietario **en su equipo**. Sustituye lo que va entre `<>` por tus valores y elige contraseñas largas y únicas; no las pegues en ningún sitio compartido.

```bash
keytool -genkeypair -v -keystore <ruta del keystore>.jks -alias <alias> \
  -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=<nombre de la app>"
```

`keytool` te pedirá las contraseñas por teclado. Después:

1. **Haz una copia de seguridad del *keystore* y de sus contraseñas fuera de GitHub** (gestor de contraseñas, disco cifrado…). Ver la sección siguiente.
2. Codifica el *keystore* en base64 y súbelo como secreto sin mostrarlo en pantalla:

   ```bash
   base64 -w0 <ruta del keystore>.jks > <fichero temporal>.b64      # en macOS: base64 -i <keystore>.jks -o <fichero temporal>.b64
   gh secret set ANDROID_KEYSTORE_BASE64 < <fichero temporal>.b64
   ```

3. Borra el fichero temporal. Crea los otros secretos con `gh secret set <NOMBRE>` (te pide el valor por teclado, sin mostrarlo) o desde la web de GitHub.

El *keystore* nunca se commitea (`*.jks` y `*.keystore` están en `.gitignore`).

## Copia de seguridad y pérdida de la clave

- **La clave de firma es lo que permite que una versión nueva se instale encima de la anterior.** Guarda siempre una copia de seguridad del *keystore* y de sus contraseñas fuera de GitHub.
- Si **se pierde** la clave, no se puede actualizar sobre las instalaciones existentes: habría que generar una clave nueva y las personas tendrían que **desinstalar y volver a instalar** la app (se pierden los datos locales; la cuenta de usuario sigue en Supabase).
- Si se **filtra** la clave, genera otra, cambia los secretos y publica una versión nueva avisando a quienes la usen.

## Publicar una versión

1. Sube la versión **a la vez en los tres ficheros**: `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml` (el flujo falla si no coinciden con la etiqueta).
2. Fusiona el cambio en `main` (por PR).
3. Crea y sube la etiqueta desde `main`:

   ```bash
   git switch main && git pull
   git tag v<MAYOR.MENOR.PARCHE>
   git push origin v<MAYOR.MENOR.PARCHE>
   ```

4. Sigue el flujo en la pestaña *Actions*. Al terminar, la Release aparece con el APK y su suma SHA-256.

Si algo falla, corrige y vuelve a lanzar el flujo para la misma etiqueta (desde *Actions → Re-run*): reemplaza los archivos de la Release sin duplicarlos. Una etiqueta equivocada se borra con `git push origin --delete <etiqueta>` y se vuelve a crear.

### Ensayo sin publicar

El flujo también admite **ejecución manual** (`workflow_dispatch`, desde *Actions → Release Android → Run workflow*, solo sobre `main`). Hace todo el proceso con la versión `X.Y.Z-dev.N`, firma el APK y lo deja como **artefacto** del flujo (caduca en un día); **no crea ninguna Release**. Úsalo antes de la primera etiqueta. La ejecución manual solo aparece cuando el fichero del flujo ya está en `main`.

## Todos comparten el mismo Supabase

El APK apunta al proyecto de Supabase del propietario. Cada persona recibe una **sesión anónima** y la seguridad por filas (RLS) aísla los datos de cada una, pero hay cosas **compartidas**:

- El **límite de altas anónimas por hora e IP** (`anonymous_users` en la configuración de autenticación): si muchas personas abren la app por primera vez a la vez desde la misma red, algunas verán el error de servicio no disponible hasta que pase el límite.
- Las **cuotas del plan** de Supabase (base de datos, usuarios activos al mes, ancho de banda). Revisa el panel si la app se reparte a mucha gente.
- Las **migraciones** deben estar aplicadas en ese proyecto antes de publicar una versión nueva que las necesite (ver [`supabase.md`](./supabase.md)).

## Seguridad del flujo (para quien lo toque)

- Permisos mínimos por trabajo: solo `publish` puede escribir en las Releases, y solo `build` ve los secretos.
- Las acciones de terceros van fijadas por SHA de commit; no uses etiquetas móviles.
- Los secretos solo se pasan por `env:` a los pasos que los usan; nunca se interpolan en comandos ni se imprimen. `scripts/release-workflow.test.mjs` lo comprueba.
- El *keystore* y `environment.ts` se borran del ejecutor al terminar, también si el flujo falla.
