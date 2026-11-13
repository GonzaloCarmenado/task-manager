# Tasks 004 — Bloqueo de la app con huella

**Plan**: [plan.md](./plan.md)
**Estado**: Completadas (excepto el commit)
**Fecha**: 2026-11-13

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que Stitch añada y no esté en la spec se ignora.

---

## Bloque 1 — Modelos y plataforma (US-004-04)

- [x] T-004-01 (Red): tests de `PlatformService`: detecta Tauri en Android y no en navegador, ni en Tauri de escritorio (`src/app/core/services/platform.service.spec.ts`)
- [x] T-004-02 (Green): `PlatformService` y tipos de `core/models/biometric.ts` (`BiometricFailure`, `BiometricResult`, `LockPhase`, `BiometricLockPrefs`)

---

## Bloque 2 — `BiometricAccessService` (US-004-02, 03, 04)

- [x] T-004-03 (Red): el módulo del plugin **no se importa** fuera de Android; `isSupported()`; `isAvailable()` sin soporte devuelve `false` sin tocar el plugin (`src/app/core/services/biometric.access.service.spec.ts`, con el plugin simulado)
- [x] T-004-04 (Green): servicio con `import()` dinámico solo en Android
- [x] T-004-05 (Red): `confirm()` pasa título, subtítulo y `cancelTitle` «Cancelar» en español con `allowDeviceCredential: false`; `unlock()` pasa título y subtítulo con `allowDeviceCredential: true`
- [x] T-004-06 (Green): `confirm()` y `unlock()` con los textos y opciones
- [x] T-004-07 (Red): clasificación de errores: tabla completa del plan (`cancelled`, `lockout`, `unavailable`, `failed` por defecto), sin lanzar y sin escribir en consola
- [x] T-004-08 (Green): `classifyBiometricError` y mapeo a `BiometricResult`
- [x] T-004-09 (Refactor): limpiar con los tests en verde

---

## Bloque 3 — `BiometricLockService` (US-004-01, 02, 03)

- [x] T-004-10 (Red): preferencias locales: lectura y escritura en `localStorage` con la clave acordada, sin datos sensibles; contenido corrupto o ausente → valores por defecto; el almacenamiento puede lanzar (`src/app/core/services/biometric-lock.service.spec.ts`)
- [x] T-004-11 (Green): preferencias
- [x] T-004-12 (Red): oferta: solo con Android, biometría disponible, sin activar, sin «never», `laterCount < 3`, **sesión `ready`** y una vez por apertura; sin biometría no se ofrece nada
- [x] T-004-13 (Green): `offerVisible`
- [x] T-004-14 (Red): respuestas: `acceptOffer()` (éxito activa; cancelar cierra sin cambios ni error; no disponible no activa), `later()` (tope de 3 → «never») y `never()`
- [x] T-004-15 (Green): `acceptOffer()`, `later()`, `never()`
- [x] T-004-16 (Red): arranque con el bloqueo activo: `locked`, **un único** aviso automático, `phase` por resultado (`cancelled`, `lockout`, `failed`), éxito desbloquea; cancelar no relanza solo
- [x] T-004-17 (Green): `initialize()` y `unlock()`
- [x] T-004-18 (Red): segundo plano: `hidden` cubre (`covered`) sin pedir nada; al volver antes de 30 s se descubre sin pedir; pasados 30 s se bloquea y se rearma el aviso automático (reloj simulado)
- [x] T-004-19 (Green): ciclo de vida con `visibilitychange` y los 30 s
- [x] T-004-20 (Red): desactivado automático: con el bloqueo activo y sin biometría al arrancar o al volver, se desactiva, `noticeVisible`, oferta reiniciada (salvo «never») y la app queda sin bloqueo; `acknowledgeNotice()` lo cierra y no vuelve a mostrarse
- [x] T-004-21 (Green): desactivado automático y aviso
- [x] T-004-22 (Red): la sesión de la spec 003 sigue su curso con la app bloqueada (el servicio no la toca) y nada se escribe en consola en ningún flujo
- [x] T-004-23 (Refactor): limpiar y comprobar cobertura ≥ 80 % de los servicios nuevos

---

## Bloque 4 — Iconos, textos y componentes (US-004-01, 02, 03)

- [x] T-004-24 (Red): iconos nuevos (huella, candado, escudo) en `Icon`: pintan SVG con contenido, decorativos por defecto y sin recursos externos (`src/app/shared/components/icon/icon.spec.ts`)
- [x] T-004-25 (Green): añadir los SVG propios
- [x] T-004-26 (Red): servicios de textos de oferta, bloqueo y aviso: ningún texto afirma cifrado ni seguridad fuerte, ni menciona XP, rachas, niveles, misiones ni promesas de tiempo, ni términos técnicos
- [x] T-004-27 (Green): servicios de textos (`*.constructor.service.ts`)
- [x] T-004-28 (Red): `BiometricLockScreen`: cada fase (`prompting`, `cancelled`, `failed`, `lockout`), botón **Desbloquear con huella** que emite, **ningún dato de la app**, sin botón de PIN propio ni elementos de prototipo, accesible (`role`, anuncio de la espera), `OnPush`
- [x] T-004-29 (Green): `BiometricLockScreen` (`.ts`, `.html`, `.scss`; área táctil ≥ 44 px, safe-areas, claro y oscuro)
- [x] T-004-30 (Red): `BiometricOffer`: pregunta, tres acciones que emiten, deshabilitadas mientras hay una activación en curso, sin XP ni simulador ni barra de volver, `role="dialog"`, `OnPush`
- [x] T-004-31 (Green): `BiometricOffer`
- [x] T-004-32 (Red): `BiometricNotice`: texto del desactivado, único botón **Entendido** que emite, sin pedir huella, `OnPush`
- [x] T-004-33 (Green): `BiometricNotice`

---

## Bloque 5 — Integración en la app (US-004-02)

- [x] T-004-34 (Red): `App`: con `overlayVisible` pinta el bloqueo encima, el contenido queda con `inert` y `aria-hidden`; precedencia bloqueo > aviso > oferta; la app conserva su estado tras desbloquear; sin cambios si no hay bloqueo; la oferta solo con la sesión `ready` (`src/app/app.spec.ts`)
- [x] T-004-35 (Green): `app.ts`, `app.html` y `app.scss`
- [x] T-004-36 (Red): el inicializador arranca el bloqueo sin esperar a la red (`src/app/app.config.spec.ts`)
- [x] T-004-37 (Green): `provideAppInitializer` del bloqueo

---

## Bloque 6 — Parte nativa y permisos mínimos (US-004-04)

- [x] T-004-38 (Red): `capabilities.test.mjs`: solo `mobile.json` concede `biometry:default`, con plataforma `android` y ventana `main`; ningún permiso de almacenamiento; `default.json` sin biometría; `Cargo.toml` con la versión exacta fijada y solo bajo Android (`scripts/capabilities.test.mjs`)
- [x] T-004-39 (Green): `src-tauri/capabilities/mobile.json`
- [x] T-004-40: `src-tauri/Cargo.toml` y `src/lib.rs` (plugin solo Android, versión `=0.3.0-rc.3`) *(configuración; el test del T-004-38 la cubre)*
- [x] T-004-41: `package.json`: `@choochmeque/tauri-plugin-biometry-api` exacto y `@tauri-apps/api` alineado con la crate; `pnpm install`; revisar que no entra nada más y que `pnpm audit` no empeora

---

## Bloque 7 — Vista previa de desarrollo

- [x] T-004-42 (Red): la ruta `__dev/biometric/:state` solo existe con `isDevMode()`; el componente muestra oferta, las fases del bloqueo y el aviso (`biometric-preview.spec.ts` y `app.routes.spec.ts`)
- [x] T-004-43 (Green): componente de vista previa y ruta condicionada

---

## Bloque 8 — Verificación en el emulador (obligatoria)

- [x] T-004-44: compilar el APK x86_64 y comprobar que la app arranca con el plugin (sin pantalla en blanco)
- [x] T-004-45: configurar el emulador: bloqueo de pantalla (`locksettings`) y alta de una huella; comprobar `checkStatus`
- [x] T-004-46: anotar los **textos de error reales** de Android (cancelar, no reconocida, bloqueo por intentos) y fijarlos en los tests del T-004-07 (Red nuevo si hay discrepancias)
- [x] T-004-47: escenarios con huella simulada (`adb emu finger touch`): oferta → activar; reinicio con bloqueo y desbloqueo; cancelar y repetir; huella no reconocida; bloqueo por intentos con el PIN del móvil; volver antes y después de 30 s
- [x] T-004-48: miniatura de «apps recientes» tapada al pasar a segundo plano (documentar el resultado real); quitar la huella para ver el desactivado automático con su aviso y que la oferta vuelve; modo claro y oscuro, y safe-areas

---

## Bloque 9 — Verificación final y documentación

- [x] T-004-49: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-004-50: revisión visual en navegador con la extensión de Chrome (viewport móvil) usando la ruta de desarrollo: oferta, las 4 fases del bloqueo y el aviso; claro y oscuro donde sea posible; área táctil, sin scroll horizontal y consola limpia
- [x] T-004-51: `docs/setup-android.md` (qué hace el plugin, permisos mínimos, pasos del emulador), regla en `CLAUDE.md`, y registro de lo comprobado en la spec
- [x] T-004-52: marcar la spec como Implementada, actualizar `specs/README.md` y el log

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar
- [ ] Todos los criterios P1 de `spec.md` verificados (US-004-01, 02 y 03)
- [ ] Revisión visual en navegador con la extensión de Chrome
- [ ] Comprobado en el emulador con huella simulada
- [ ] Confirmación del usuario antes de cada commit y push
