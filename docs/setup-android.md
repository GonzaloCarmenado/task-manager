# Entorno Android (Windows)

La app final es solo Android (Tauri 2). Requisitos:

| Requisito | Valor |
|---|---|
| Node / pnpm | 24.x / 11.x |
| Rust | 1.93 + targets `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` |
| Android SDK | Instalado con Android Studio o `cmdline-tools`; variable `ANDROID_HOME` apuntando a su carpeta |
| NDK | Instalado desde el SDK Manager (versión 29 probada), dentro de `$ANDROID_HOME/ndk/<versión>` |
| JDK | 17 o superior (probado con 24; el Gradle 9.6 de la plantilla lo soporta) |

## Variables de entorno

`ANDROID_HOME`, `NDK_HOME` y `JAVA_HOME` deben estar definidas en la sesión (o de forma permanente en Windows). Sustituye los valores entre `<>` por las rutas de tu máquina:

```bash
export ANDROID_HOME="<ruta del Android SDK>"
export JAVA_HOME="<ruta del JDK 17+>"
export NDK_HOME="$ANDROID_HOME/ndk/<versión del NDK>"
```

## Targets de Rust

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

## Comandos

```bash
pnpm tauri info                                   # diagnóstico del entorno
pnpm tauri:android:dev                            # app en emulador/dispositivo (hot reload sobre ng serve)
pnpm tauri android build --debug --apk --target aarch64   # APK debug rápido
pnpm tauri:android:build                          # build completo
```

APK debug: `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.

## Emulador

**ABI**: los AVD de Android Studio suelen ser `x86_64`. Un APK compilado solo con `--target aarch64` instala pero muestra pantalla en blanco (la librería Rust no se carga). Para el emulador compilar con `--target x86_64`; para un móvil físico, `aarch64`. `pnpm tauri android dev` elige el ABI correcto automáticamente.

Lista tus AVD con `emulator -list-avds`; crea uno con Android Studio o `avdmanager`.
`src-tauri/gen/` está en `.gitignore` (se regenera con `pnpm tauri android init`).
