# Plan 004 — Bloqueo de la app con huella

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md) | **Review**: [review.md](./review.md)
**Diseño (Stitch)**: [design/](./design/README.md) · sistema [Playful Momentum](../_design/playful-momentum/DESIGN.md)
**Estado**: Aprobado (2026-11-13)
**Fecha**: 2026-11-13

---

## Enfoque técnico

Cuatro piezas, con el patrón de la app (el componente no toca el plugin; solo el *access service*):

1. **Plugin nativo** `tauri-plugin-biometry` (`=0.3.0-rc.3`, fijado), solo Android, con la *capability* mínima. `biometry:default` concede **únicamente** `status` y `authenticate`: los comandos de almacenamiento quedan denegados sin tocar nada.
2. **`BiometricAccessService`**: único contacto con el plugin, con `import()` dinámico solo en Android. Expone `isAvailable()`, `confirm()` (activar: solo biometría) y `unlock()` (desbloquear: biometría **o** el método del móvil), y clasifica los errores.
3. **`BiometricLockService`**: el estado y las reglas con Signals: bloqueo, cubierta de «apps recientes», oferta, aviso, y las preferencias locales.
4. **Interfaz**: `BiometricLockScreen`, `BiometricOffer` y `BiometricNotice`, superpuestas a la app desde el componente raíz.

### Lo comprobado en el plugin (lectura del código en la etiqueta fijada, 2026-11-13)

- `AuthOptions` admite `title`, `subtitle`, `cancelTitle`, `allowDeviceCredential` y `confirmationRequired`. **Los textos en español no necesitan el parche nativo** que el proyecto de referencia aplicó a `getData`: aquí solo se usa `authenticate`.
- **`allowDeviceCredential: true` mete el PIN, patrón o contraseña del móvil dentro del propio aviso del sistema.** Por eso la app **no necesita su propio botón de PIN**. Contrapartida de Android: con credencial del dispositivo permitida **no se puede poner botón de cancelar propio** (el plugin no lo aplica); el sistema usa sus textos.
- El permiso `biometry:default` es solo `status` y `authenticate`. Tauri exige `tauri >= 2.8.2` (hay 2.12.5) y `@tauri-apps/api ^2.8.0`.
- El plugin trae sus propias reglas de ofuscación (`consumer-rules.pro`). La comprobación con R8 queda para la primera release.

### Decisiones tomadas en el plan

| # | Decisión | Valor |
|---|---|---|
| D4 | Qué pasa tras desactivarse solo | Se anota un aviso pendiente y se **reinicia la oferta** (contador a 0) salvo que el usuario hubiera dicho «No volver a preguntar»: vuelve a ofrecerse en un arranque posterior con biometría disponible. |
| D5 | Botón de PIN en la app | **No existe.** El aviso de desbloqueo usa `allowDeviceCredential: true`; el sistema ofrece el PIN. El botón del diseño de Stitch se ignora (no está en la spec). |
| – | Aviso de **activar** | Solo biometría (`allowDeviceCredential: false`) con `cancelTitle: «Cancelar»`: activar exige demostrar la huella. |
| – | Cancelar el aviso de **desbloqueo** | Sin botón propio (limitación de Android con PIN permitido); se cancela con atrás o tocando fuera. Se ajusta US-004-02 CA 4 en la spec: título y subtítulo en español siempre; botón «Cancelar» en español solo al activar. |
| – | Dónde viven las preferencias | `localStorage` del WebView, clave `task-manager-biometric-lock`. No contienen nada sensible. |
| – | Cómo se cubre la app | Superposición opaca encima de la app, que queda con `inert` y `aria-hidden` mientras tanto. La app no se destruye: se conserva su estado. |

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `src/app/core/services/platform.service.ts` (+ spec) | Crear | Detecta Tauri en Android (el plugin solo se carga ahí) |
| `src/app/core/services/biometric.access.service.ts` (+ spec) | Crear | Único contacto con el plugin; carga diferida; textos en español; clasificación de errores |
| `src/app/core/models/biometric.ts` | Crear | Tipos: resultado, fallos, fase del bloqueo, preferencias |
| `src/app/core/services/biometric-lock.service.ts` (+ spec) | Crear | Estado y reglas: bloqueo, cubierta, 30 s, oferta, aviso, preferencias |
| `src/app/shared/components/biometric-lock-screen/` (+ spec) | Crear | Pantalla de bloqueo con sus estados |
| `src/app/shared/components/biometric-offer/` (+ spec) | Crear | Oferta Activar / Preguntarme más tarde / No volver a preguntar |
| `src/app/shared/components/biometric-notice/` (+ spec) | Crear | Aviso de bloqueo desactivado + Entendido |
| `src/app/shared/components/biometric-*/…constructor.service.ts` (+ spec) | Crear | Textos estáticos |
| `src/app/shared/components/icon/icon.ts` (+ spec) | Modificar | Añadir iconos: huella, candado, escudo |
| `src/app/features/dev/biometric-preview.ts` (+ spec) | Crear | Vista previa **solo de desarrollo** de las pantallas (`isDevMode()`) |
| `src/app/app.ts`, `app.html`, `app.scss`, `app.spec.ts` | Modificar | Superposiciones, `inert`, precedencia (bloqueo > aviso > oferta) |
| `src/app/app.routes.ts` (+ spec) | Modificar | Ruta de desarrollo de la vista previa |
| `src/app/app.config.ts` (+ spec) | Modificar | Inicializar el bloqueo |
| `src-tauri/Cargo.toml` | Modificar | `tauri-plugin-biometry = "=0.3.0-rc.3"` solo bajo `cfg(target_os = "android")` |
| `src-tauri/src/lib.rs` | Modificar | `.plugin(tauri_plugin_biometry::init())` solo en Android |
| `src-tauri/capabilities/mobile.json` | Crear | Plataforma `android`, ventana `main`, permiso `biometry:default` |
| `package.json`, `pnpm-lock.yaml` | Modificar | `@choochmeque/tauri-plugin-biometry-api` exacto y `@tauri-apps/api` alineado con la crate de Tauri |
| `scripts/capabilities.test.mjs` | Crear | Comprueba que solo `mobile.json` concede `biometry:default` y que no hay permisos de almacenamiento |
| `src/styles/_tokens.scss` | Modificar | Solo si faltan tokens para estas pantallas |
| `docs/setup-android.md` | Modificar | Qué hace el plugin, permisos mínimos y cómo probar la huella en el emulador |
| `CLAUDE.md`, `specs/README.md` | Modificar | Regla del bloqueo y estado de la 004 |

Supabase: **sin cambios**.

---

## Interfaces TypeScript

```typescript
// src/app/core/models/biometric.ts
export type BiometricFailure =
  | 'cancelled'    // el usuario cierra el aviso: no es un error
  | 'lockout'      // demasiados intentos con la huella
  | 'unavailable'  // sin hardware, sin huellas registradas o sin bloqueo de pantalla
  | 'failed';      // cualquier otro error: se trata como «inténtalo de nuevo»

export type BiometricResult = { ok: true } | { ok: false; reason: BiometricFailure };

/** Estado visible de la pantalla de bloqueo. */
export type LockPhase = 'prompting' | 'cancelled' | 'failed' | 'lockout';

export interface BiometricLockPrefs {
  readonly enabled: boolean;
  readonly offerAnswer: 'pending' | 'never';
  readonly laterCount: number;      // «Ahora no» pulsados; a 3 equivale a «never»
  readonly disabledNotice: boolean; // aviso de «desactivado» sin leer
}
```

```typescript
// BiometricAccessService
isSupported(): boolean;                    // Tauri en Android
isAvailable(): Promise<boolean>;           // checkStatus().isAvailable
confirm(): Promise<BiometricResult>;       // activar: solo biometría, cancelTitle «Cancelar»
unlock(): Promise<BiometricResult>;        // desbloquear: biometría o credencial del móvil
```

```typescript
// BiometricLockService (señales de solo lectura)
readonly locked: Signal<boolean>;          // hace falta autenticarse
readonly covered: Signal<boolean>;         // cubierta cosmética en segundo plano (<30 s)
readonly overlayVisible: Signal<boolean>;  // locked || covered
readonly phase: Signal<LockPhase>;
readonly offerVisible: Signal<boolean>;
readonly noticeVisible: Signal<boolean>;
initialize(): Promise<void>;
unlock(): Promise<void>;
acceptOffer(): Promise<void>;   later(): void;   never(): void;   acknowledgeNotice(): void;
```

---

## Máquina de estados y flujos

- **Arranque** (`initialize()`): si no es Android → nada. Lee las preferencias. Si `enabled`: comprueba `isAvailable()`; si ya no hay biometría → **se desactiva solo** (aviso pendiente, oferta reiniciada, app sin bloqueo). Si sigue disponible → `locked = true` y **un único** aviso automático.
- **`unlock()`**: `phase = 'prompting'` → `unlock()` del servicio de acceso. Éxito → `locked = false`. `cancelled` → `phase = 'cancelled'` (sin error; solo el botón). `lockout` → `'lockout'`. Otro fallo → `'failed'`. Nunca se relanza solo tras cancelar.
- **Segundo plano**: al pasar a `hidden` con el bloqueo activo se guarda la hora y `covered = true` (la miniatura de «apps recientes» sale tapada; **sin `FLAG_SECURE`**). Al volver: si pasaron **más de 30 s** → `locked = true` y aviso automático; si no → `covered = false` sin pedir nada. Cada vez que se bloquea de nuevo se rearma el aviso automático.
- **Oferta**: `offerVisible` solo si es Android, hay biometría disponible, `enabled = false`, `offerAnswer ≠ 'never'`, `laterCount < 3`, **la sesión está `ready`** y no se ha mostrado ya en esta apertura. `acceptOffer()` → `confirm()`: éxito → `enabled = true`; `cancelled` → se cierra sin cambios ni error. `later()` → `laterCount++` (a 3, `never`). `never()` → `offerAnswer = 'never'`.
- **Aviso**: tras un desactivado automático, `noticeVisible` hasta `acknowledgeNotice()`; no pide huella.
- **Precedencia visual**: bloqueo > aviso > oferta. La pantalla de carga y la sesión (spec 003) siguen su curso por debajo.
- **Registro**: nunca se escribe ni el resultado ni el error del plugin en consola.

### Clasificación de errores del plugin

`authenticate` lanza un error con texto o código, por lo que se clasifica por patrones (de más específico a menos) y el valor por defecto es `failed`:

| Patrón (sin distinguir mayúsculas) | Fallo |
|---|---|
| `cancel`, `dismiss`, `userCancel`, `negative`, `appCancel`, `systemCancel` | `cancelled` |
| `lockout`, `biometryLockout`, `too many` | `lockout` |
| `notEnrolled`, `notAvailable`, `no hardware`, `passcodeNotSet`, `none enrolled` | `unavailable` |
| cualquier otro | `failed` |

Los textos exactos de Android **se verifican en el emulador** (tarea explícita) y quedan fijados en los tests.

---

## Pantallas (diseño de Stitch → componentes)

Regla del proyecto: lo que Stitch añade y no está en la spec **se ignora**.

| Pantalla de Stitch | Componente | Conserva | Se ignora |
|---|---|---|---|
| `oferta-de-activacion` | `BiometricOffer` | Pregunta, explicación veraz, tres acciones | Barra «Oferta De Activacion» con volver y avatar, «Oscuro», «Tu espacio protegido», «+50 XP», rachas, promesas de tiempo, «secretos a salvo» |
| `pantalla-de-bloqueo` | `BiometricLockScreen` · fases `prompting`, `cancelled`, `failed`, `lockout` | Mensaje de app protegida, botón **Desbloquear con huella**, mensaje por fase | Simulador A–D, «Oscuro», racha, XP, «cifrado/encriptadas», botón propio de PIN |
| `aviso-de-bloqueo-desactivado` | `BiometricNotice` | Explicación del desactivado, botón **Entendido** | «Aviso informativo», «Oscuro», rótulo «RK», mención a rachas y a «ajustes del teléfono» |

Textos (servicio de configuración estática): oferta «¿Proteger la app con tu huella?» — «Así nadie verá tus tareas si coge tu móvil»; bloqueo «Tu app está protegida» y un mensaje por fase; aviso «Hemos desactivado el bloqueo con huella porque ya no hay huellas registradas en tu móvil. Te lo volveremos a proponer cuando quieras protegerla de nuevo.» Ningún texto afirma cifrado ni seguridad fuerte.

**Iconos**: SVG propios (huella, candado, escudo) en el componente `Icon`; nada de fuentes externas.

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterios |
|---|---|---|
| `platform.service.spec.ts` | Detecta Tauri en Android y no en navegador | US-004-04 |
| `biometric.access.service.spec.ts` | El plugin **no se importa** fuera de Android; `confirm()` y `unlock()` pasan los textos en español y los valores de `allowDeviceCredential`; clasificación de errores (tabla completa); nunca lanza ni escribe en consola | US-004-02/03/04 |
| `biometric-lock.service.spec.ts` | Preferencias locales sin datos sensibles; oferta (condiciones, tres respuestas, tope de 3, cancelar al activar); arranque con aviso único; cancelar no relanza; cubierta en segundo plano; 30 s con reloj simulado; desactivado automático con aviso y oferta reiniciada; sin biometría no se ofrece nada | US-004-01/02/03 |
| `biometric-lock-screen.spec.ts`, `biometric-offer.spec.ts`, `biometric-notice.spec.ts` y sus servicios de textos | Cada fase y variante; sin datos de la app ni textos prohibidos; áreas táctiles; accesibilidad (`role`, foco); `OnPush` | US-004-01/02/03 |
| `app.spec.ts` | Superposición opaca y `inert`; precedencia; la app conserva su estado tras desbloquear; sin cambios si no hay bloqueo | US-004-02 |
| `biometric-preview.spec.ts` y `app.routes.spec.ts` | La ruta de desarrollo solo existe con `isDevMode()` | – |
| `capabilities.test.mjs` | Solo `mobile.json` concede `biometry:default` (plataforma android); ningún permiso de almacenamiento; `default.json` sin biometría | US-004-04 |

**Verificación manual (obligatoria)**: revisión visual en navegador con la extensión de Chrome (con el plugin simulado y la ruta de desarrollo), y en Android con **huella simulada** en el emulador (`adb emu finger touch`), que exige un bloqueo de pantalla configurado: activar, desbloquear, cancelar, huella no reconocida, bloqueo por intentos, PIN, volver tras menos y más de 30 s, y quitar la huella para ver el desactivado automático. Se anotan los textos de error reales para fijar la clasificación.

Cobertura: ≥ 80 % en los servicios nuevos, sin bajar la existente.

---

## Orden de implementación (Red → Green → Refactor por historia)

1. Modelos y `PlatformService`.
2. `BiometricAccessService`: carga diferida, textos, clasificación.
3. `BiometricLockService`: preferencias → oferta → arranque y desbloqueo → segundo plano y 30 s → desactivado automático.
4. Componentes: textos, iconos, `BiometricLockScreen`, `BiometricOffer`, `BiometricNotice`.
5. Integración en `App` (superposiciones, `inert`, precedencia) y el inicializador.
6. Parte nativa: `Cargo.toml`, `lib.rs`, `mobile.json`, `package.json`, y `capabilities.test.mjs`.
7. Ruta de vista previa de desarrollo.
8. Compilar el APK, **verificar el plugin en el emulador** (fijar los textos de error reales) y probar todos los escenarios con huella simulada.
9. Revisión visual en navegador y Android; documentación.

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Plugin comunitario en versión candidata (`0.3.0-rc.3`) | Media | Versión fijada exacta; acceso tras un único servicio fácil de sustituir; capability mínima |
| Textos de error de Android distintos de los previstos | Media | Valor por defecto `failed` (nunca bloquea); se verifican en el emulador y se fijan en tests |
| Con credencial del móvil permitida no hay botón de cancelar propio | Cierta | Asumido y documentado; el aviso de activar sí lo lleva |
| La miniatura de «apps recientes» no sale cubierta | Media | Mejor esfuerzo documentado; se comprueba en el emulador; sin `FLAG_SECURE` por decisión |
| Quedarse sin acceso a la app | Baja | El sistema ofrece el PIN; si desaparece la biometría el bloqueo se desactiva solo con aviso |
| Emulador sin bloqueo de pantalla ni huella configurados | Cierta | Pasos documentados (`locksettings`, alta de huella y `adb emu finger touch`) |
| Versiones desalineadas entre la crate de Tauri y `@tauri-apps/api` | Baja | Se fija `@tauri-apps/api` al mismo *major.minor* que la crate |
| El plugin no cubre alguna versión antigua de Android | Baja | Mínimo de Android del proyecto; se prueba en el emulador disponible |

**Decisiones abiertas para el usuario**: ninguna. Las dos que quedaban (D4 y D5) se resuelven arriba con los valores por defecto, y lo extra de Stitch se ignora según la norma.
