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

## Bloqueo con huella (spec 004)

El plugin `tauri-plugin-biometry` (versión exacta fijada) solo se compila y se registra en Android. Permisos mínimos: `capabilities/mobile.json` concede únicamente `biometry:default` (estado y autenticación), con plataforma `android` y ventana `main`; no se da acceso al almacenamiento del plugin. `scripts/capabilities.test.mjs` lo comprueba.

Para probarlo en el emulador:

1. Configurar un bloqueo de pantalla: `adb shell locksettings set-pin <PIN de prueba>` (solo en el emulador).
2. Registrar una huella: abrir `android.settings.BIOMETRIC_ENROLL`, introducir el PIN y simular el dedo con `adb emu finger touch 1`.
3. Instalar el APK x86_64 (paquete debug con sufijo `.debug`), activar el bloqueo desde la oferta y reiniciar la app.
4. `adb emu finger touch 1` desbloquea; un id distinto simula una huella no reconocida y, tras varios intentos, Android pasa al PIN del móvil.
5. Para ver el desactivado automático: `adb shell locksettings clear --old <PIN>` y relanzar la app.

Notas: el aviso del sistema es una ventana protegida (las capturas salen en negro; sus textos se leen con `uiautomator dump`). Los textos fijos del sistema («Touch the fingerprint sensor», «Use PIN») siguen el idioma del teléfono. En «apps recientes» la miniatura puede mostrar el contenido: la cubierta es de mejor esfuerzo y no se usa `FLAG_SECURE` por decisión de la spec.

## Tareas (spec 005)

Los selectores de fecha y hora del formulario son los **nativos** del sistema (`input type="date"` y `type="time"`); en el WebView de Android abren el selector de Android, en el idioma del teléfono. Comprobado en el emulador: el teclado virtual no tapa el campo ni el botón de guardar, y las tareas persisten al cerrar y abrir la app. Con una instalación nueva, la primera carga puede tardar unos segundos (se crea la sesión anónima).

## Alarmas (spec 006)

- **Permiso y canal**: `tauri-plugin-notification` (versión exacta `2.8.1`) solo para pedir el permiso de notificaciones y crear el canal «Recordatorios». **No programa los avisos**: su receptor de reinicio no puede restaurarlos (guarda cada aviso con `sourceJson` nulo, también en su rama principal).
- **Programación, restauración y notificación**: las hace el plugin local `src-tauri/plugins/app-settings` (Kotlin): `AlarmManager` (exacta si el usuario concede «alarmas y recordatorios»; si no, aproximada), almacén de avisos en el dispositivo, `AlarmReceiver` (publica la notificación, también con la app cerrada) y `BootReceiver` (reprograma tras reiniciar el móvil). La app envía el conjunto **completo** de avisos con `schedule_alarms` y el plugin lo compara.
- El mismo plugin declara `SCHEDULE_EXACT_ALARM`, abre los ajustes de notificaciones y de alarmas exactas, y entrega el id del aviso que abrió la app (`launch_notification_id`).
- El permiso de notificaciones se pide al guardar una tarea con hora (hasta 3 negativas).
- **Probar en el emulador**: guardar una tarea con hora a unos minutos, cerrar la app y esperar. `adb shell dumpsys alarm` muestra la alarma (etiqueta `app.tauri.appsettings.ALARM`, `window=0` si es exacta); `adb shell cmd statusbar expand-notifications` abre el panel; `adb reboot` comprueba la restauración.
- **Zona horaria**: los avisos se reconcilian al volver a primer plano; si cambia la zona con la app en segundo plano, suenan a la hora antigua hasta reabrirla.
- **`am force-stop`** (y «Forzar detención» en Ajustes) cancela todas las alarmas de la app: para cerrarla en pruebas, quitarla de «recientes».
- **Limitación conocida**: si Android mata el proceso pero la tarea sigue en «recientes», el toque en el aviso abre la lista en vez de la tarea (Android no entrega el intent en ese caso). Con la app abierta, cerrada por el usuario o tras un reinicio, sí abre la tarea.
- Al compilar con `pnpm tauri android build`, **no** definir `MSYS_NO_PATHCONV` en la misma sesión (rompe la ruta de `pnpm` y falla con `MODULE_NOT_FOUND`).

## Cuenta de usuario (spec 011)

- Es JavaScript puro sobre Supabase Auth: **no hay plugin nativo ni permisos nuevos**. La cuenta vive en el WebView y la sesión en `localStorage`.
- **Botón atrás de Android**: las hojas y diálogos (cerrar sesión, tareas de este móvil, confirmación de descarte) añaden una entrada al historial (`OverlayBack`) y el gesto las cierra. Con capas superpuestas cierra solo la de arriba. Probar: `adb shell input keyevent KEYCODE_BACK` con una capa abierta (se cierra sin salir de la pantalla) y sin ninguna (vuelve a la pantalla anterior).
- **Teclado virtual**: en Crear cuenta, Cambiar contraseña, Iniciar sesión y Borrar cuenta el teclado no debe tapar el campo activo ni el botón principal (la cabecera es fija y el contenido hace scroll). `adb shell input text` escribe en el campo enfocado.
- **Arranque en frío, claro y oscuro**: cambiar el tema con la app abierta no recrea la barra de estado (ver spec 010); cerrar y abrir la app tras cambiarlo (`adb shell cmd uimode night yes`).
- Si la app se cierra a mitad de un traspaso de tareas (entrar con tareas pendientes en el móvil), al abrirla de nuevo se reanuda sin duplicar (buffer en `localStorage`).
- **Tareas repetitivas (spec 012)**: con el APK x86_64, crear una tarea que se repite, completarla (la siguiente aparece con candado), probar «Editar / Borrar → Solo esta / Toda la serie» con el botón atrás cerrando solo la hoja de arriba, y una ocurrencia con hora a pocos minutos (`adb shell dumpsys alarm` y `dumpsys notification`). Conceder antes `POST_NOTIFICATIONS` y `SCHEDULE_EXACT_ALARM` con `adb shell pm grant` y `appops set`.
- Comprobación manual recomendada tras cambios en la cuenta: crear cuenta → cerrar sesión → entrar con tareas locales (traer y descartar) → cambiar contraseña → borrar cuenta, con el backend real (`pnpm tauri android dev`).

## Interfaz y diseño (spec 010)

- **Fuente empaquetada**: Plus Jakarta Sans (SIL OFL 1.1, `@fontsource-variable/plus-jakarta-sans` con versión exacta). `angular.json` copia solo los `woff2` `latin` y `latin-ext` a `/fonts/` y `src/styles/_fonts.scss` los declara con `font-display: swap`. Va dentro del APK: no se pide a ningún servicio externo y la app la aplica sin red.
- **Probar la fuente sin red**: con `pnpm tauri android dev` la app se sirve desde el servidor de desarrollo, así que no vale. Compilar el APK (`pnpm tauri android build --debug --apk --target x86_64`), instalarlo, desactivar la red del emulador (`adb shell svc wifi disable` y `adb shell svc data disable`) y abrir en frío.
- **Barra de estado en oscuro**: con arranque en frío en modo oscuro los iconos ya son claros. Cambiar el tema del teléfono **con la app abierta** (p. ej. `adb shell cmd uimode night yes`) no recrea la actividad y la barra conserva el color anterior hasta reabrir la app. Es un artefacto del cambio en caliente, no un fallo de la app.
- `src-tauri/gen/` está ignorado por git (lo genera Tauri): no se versionan cambios ahí.

