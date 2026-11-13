# Spec 004 — Bloqueo de la app con huella

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-13
**Estado**: Implementada
**Ciclo**: completo
**Frontal**: sí (oferta de activación y pantalla de bloqueo)

---

## Objetivo

Que el usuario pueda proteger la app con el lector de huellas de Android (o el desbloqueo biométrico del móvil), de forma opcional, para que nadie que coja su móvil vea sus tareas.

---

## Contexto

- Separada de la spec 003 (sesión anónima) por tamaño y para que cada una tenga su propio ciclo y revisión. Se implementa **después** de la 003.
- **Qué protege**: es un **bloqueo de pantalla**. Hay que autenticarse (`authenticate`) antes de ver ningún dato. No guarda ni cifra nada: es una protección de privacidad, no un almacén seguro. Proteger el token de sesión o credenciales con biometría solo tendrá sentido en la spec de vincular cuenta.
- **Cuándo se pide**: al abrir la app desde cero y al volver de segundo plano si han pasado más de 30 segundos.
- **Diseño recibido** (Stitch, 2026-11-13): ver `design/`. Es una referencia que **no se implementa tal cual**: contiene elementos de prototipo, datos de la app que la pantalla de bloqueo no puede mostrar y afirmaciones falsas de cifrado que hay que resolver antes del plan (ver `design/README.md`, decisiones D1 a D7).
- Se usará el plugin comunitario de Tauri 2 `tauri-plugin-biometry` (crate y paquete npm `@choochmeque/tauri-plugin-biometry-api`), vigente en `0.3.0-rc.3` a 2026-11-13. Es la misma solución que ya se usó con éxito en el proyecto de referencia anterior, de donde se toma el patrón: plugin solo Android con versión fijada exacta, permisos acotados en una *capability* solo móvil, un único *access service* con carga diferida del plugin (en navegador y escritorio no se importa), aviso biométrico lanzado una sola vez al abrir con botón para repetirlo, oferta en el primer uso, preferencia local al dispositivo (sin base de datos) y «cancelar» tratado como no-error.
- **Diferencia clave con el proyecto de referencia**: allí la huella protegía las *credenciales* (correo y contraseña) para volver a entrar tras cerrar sesión. Aquí no hay contraseña ni cierre de sesión: la huella es solo un bloqueo local.
- Esta spec **no es un login**: el usuario ya tiene su identidad anónima (spec 003). La huella solo decide si se muestra la app.
- Hoy no existe pantalla de ajustes: el lugar donde activar y desactivar el bloqueo después de la oferta inicial se decide en el clarify de esta spec.

---

## Historias de usuario

### US-004-01 — Activar el bloqueo con huella (P1)

**Como** usuario de Android, **quiero** poder proteger mi app con mi huella, **para** que nadie que coja mi móvil vea mis tareas.

**Criterios de aceptación:**
- Solo se ofrece en Android y si el móvil tiene biometría disponible y registrada (`checkStatus`), lo que implica un bloqueo de pantalla en el móvil; si no, no se ofrece nada.
- Tras tener sesión lista por primera vez, con biometría disponible y sin decisión previa, se pregunta «¿Proteger la app con tu huella?» con tres respuestas: **Activar**, **Ahora no** y **No volver a preguntar**.
- «Ahora no» vuelve a preguntar en el siguiente arranque; tras tres respuestas «Ahora no» se trata como «No volver a preguntar».
- Para activar hay que superar una autenticación biométrica en ese momento (confirma que hay biometría registrada y que el usuario está presente).
- La decisión y el estado de «activado» son preferencias **locales al dispositivo**: no se guardan en la base de datos ni se sincronizan. No se guarda ningún dato sensible.
- **En esta spec solo existe la oferta inicial.** El interruptor para activar y desactivar después llega con la spec de ajustes (todavía no hay navegación). Consecuencias asumidas: «No volver a preguntar» solo se revierte borrando los datos de la app, y un bloqueo ya activado solo se desactiva solo cuando la biometría deja de estar disponible (US-004-03) o borrando los datos de la app.

### US-004-02 — Desbloquear con huella al abrir la app (P1)

**Como** usuario con el bloqueo activado, **quiero** entrar tocando el sensor, **para** acceder en un segundo sin perder la protección.

**Criterios de aceptación:**
- Con el bloqueo activado, al abrir la app se muestra una **pantalla de bloqueo** y se lanza automáticamente el aviso biométrico, **una sola vez por apertura**; si se cancela queda el botón «Desbloquear con huella» para repetirlo.
- Hasta superar la autenticación no se muestra **ningún dato** de la app, ni siquiera parcial. La vista previa de «apps recientes» se trata aparte, como mejor esfuerzo (CA 7).
- Al volver de segundo plano tras **más de 30 segundos** se vuelve a pedir; antes de eso no.
- El aviso del sistema está en español: título y subtítulo siempre; el botón «Cancelar» en español solo en el aviso de **activar**. En el de desbloquear, con el PIN del móvil permitido, Android no admite botón propio y el sistema usa sus textos (comprobado en el plugin, ver `plan.md`).
- La pantalla de carga y la sesión anónima (spec 003) siguen su curso mientras la app está bloqueada.
- No hay bucles de aviso: cancelar repetidamente no relanza el aviso solo.
- **Apps recientes**: al pasar la app a segundo plano con el bloqueo activo se muestra la pantalla de bloqueo, para que la miniatura de «apps recientes» salga cubierta. No es garantizado al 100 % (Android hace la captura al pausar) y **no se usa `FLAG_SECURE`**, para no bloquear las capturas de pantalla del usuario ni exigir código nativo en un proyecto Android que se regenera. Queda documentado como limitación conocida.

### US-004-03 — Fallos y salida de emergencia: nunca se queda bloqueado (P1)

**Como** usuario, **quiero** no perder nunca el acceso a mis datos por un fallo de la huella, **para** poder fiarme del bloqueo.

**Criterios de aceptación:**
- Cancelar el aviso no se muestra como error.
- Tras agotar los intentos del sistema, o si el sensor falla, se ofrece el método alternativo del propio móvil (PIN, patrón o contraseña del dispositivo).
- Si la biometría deja de estar disponible (se borran las huellas, se quita el bloqueo de pantalla del móvil o cambian las huellas registradas), el bloqueo **se desactiva solo** con un aviso claro, de modo que el usuario nunca queda fuera de su app.
- Los mensajes son genéricos y en lenguaje llano: nunca códigos, textos del plugin ni detalles del sistema.

### US-004-04 — Plugin y permisos acotados en Android (P2)

**Como** responsable de la app, **quiero** que el acceso a la biometría esté estrictamente acotado, **para** no ampliar la superficie de riesgo.

**Criterios de aceptación:**
- El plugin se registra solo en Android (`#[cfg(target_os = "android")]`) con versión **fijada exacta**; el paquete npm y la crate comparten *major.minor*, como exige Tauri.
- Los permisos se conceden solo en una *capability* de Android (`capabilities/mobile.json`, plataforma `android`), con los mínimos necesarios. Como el bloqueo solo usa `checkStatus` y `authenticate`, **no se conceden** los comandos de almacenamiento (`getData`/`setData`/`hasData`/`removeData`).
- Carga diferida: en navegador y escritorio el módulo del plugin no se importa y la interfaz no muestra nada de huella.
- Solo el *access service* de biometría toca el plugin; los componentes no.
- Se comprueba en el plan que `authenticate` admite título, subtítulo y botón de cancelar en español sin el parche local que el proyecto de referencia aplicó a `getData`. Si no fuera así, **no se aplica ningún parche nativo sin decisión del usuario** y el criterio de aviso en español (US-004-02 CA 4) pasa a P2.
- La release minificada (R8) y las reglas de conservación del plugin se comprobarán al preparar la primera release; esta spec no incluye builds de release.

---

## Plan de tests (TDD)

Cada criterio tiene al menos un test. El orden es el orden Red → Green.

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-004-01 solo se ofrece en Android con biometría disponible` | US-004-01 CA 1 | `src/app/core/services/biometric.access.service.spec.ts` y `biometric-lock.service.spec.ts` | unit (plugin simulado) |
| `US-004-01 la oferta respeta Activar / Ahora no / No volver a preguntar` | US-004-01 CA 2 | `biometric-lock.service.spec.ts` | unit |
| `US-004-01 tras tres «Ahora no» deja de preguntar` | US-004-01 CA 3 | idem | unit |
| `US-004-01 activar exige autenticar con la huella en ese momento` | US-004-01 CA 4 | idem | unit |
| `US-004-01 la preferencia es local y no guarda datos sensibles` | US-004-01 CA 5 | idem | unit (almacenamiento simulado) |
| `US-004-02 con bloqueo activo lanza el aviso una sola vez y deja el botón` | US-004-02 CA 1, 6 | idem | unit |
| `US-004-02 el aviso del sistema se pide en español (título, subtítulo y botón de cancelar)` | US-004-02 CA 4 | `biometric.access.service.spec.ts` | unit |
| `US-004-02 no muestra datos hasta autenticar` | US-004-02 CA 2 | `src/app/shared/components/biometric-lock-screen/biometric-lock-screen.spec.ts` | unit (componente) |
| `US-004-02 vuelve a pedir pasados 30 s en segundo plano y no antes` | US-004-02 CA 3 | `biometric-lock.service.spec.ts` | unit (reloj simulado) |
| `US-004-02 al pasar a segundo plano con el bloqueo activo se cubre la app con la pantalla de bloqueo` | US-004-02 CA 7 | `biometric-lock.service.spec.ts` y `app.spec.ts` | unit |
| `US-004-02 la sesión sigue creándose en segundo plano mientras está bloqueada` | US-004-02 CA 5 | idem | unit |
| `US-004-03 cancelar no es error y se clasifican los fallos del plugin` | US-004-03 CA 1, 4 | `biometric.access.service.spec.ts` | unit |
| `US-004-03 tras agotar intentos se ofrece el método alternativo del móvil` | US-004-03 CA 2 | idem | unit |
| `US-004-03 si la biometría deja de estar disponible el bloqueo se desactiva solo` | US-004-03 CA 3 | `biometric-lock.service.spec.ts` | unit |
| `US-004-04 el plugin no se importa fuera de Android` | US-004-04 CA 3 | `biometric.access.service.spec.ts` | unit |
| `US-004-04 la capability móvil no concede comandos de almacenamiento` | US-004-04 CA 2 | `scripts/capabilities.test.mjs` | verificación de fichero |
| `US-004-01..03 huella real en el emulador (activar, desbloquear, cancelar, cambiar huellas)` | US-004-01..03 | emulador con `adb emu finger touch` y bloqueo de pantalla configurado | manual |
| `US-004-02 revisión visual de la pantalla de bloqueo y de la oferta` | US-004-02 | extensión de Chrome (con el plugin simulado) y Android | manual (obligatoria) |

---

## Ficheros afectados

**Crear:**
- `src/app/core/services/platform.service.ts` y su spec (detecta Tauri en Android; el plugin solo se carga ahí) *(por confirmar en /sdd-plan)*
- `src/app/core/services/biometric.access.service.ts` y su spec (único contacto con el plugin, carga diferida, mapeo de errores)
- `src/app/core/services/biometric-lock.service.ts` y su spec (estado del bloqueo, preferencias locales, ciclo de vida de la app)
- `src/app/shared/components/biometric-lock-screen/` (pantalla de bloqueo) y `biometric-offer-dialog/` (oferta Activar / Ahora no / No volver a preguntar), cada uno con su spec *(por confirmar en /sdd-plan)*
- `src-tauri/capabilities/mobile.json` (solo Android, permisos mínimos)
- `scripts/capabilities.test.mjs`

**Modificar:**
- `src/app/app.ts` y `app.html` (la pantalla de bloqueo cubre el contenido mientras la app está bloqueada) *(por confirmar en /sdd-plan)*
- `src-tauri/Cargo.toml` y `src-tauri/src/lib.rs` (plugin solo Android, versión fijada)
- `package.json` y `pnpm-lock.yaml` (`@choochmeque/tauri-plugin-biometry-api`)
- `docs/setup-android.md` (qué se guarda, permisos y cómo probar la huella en el emulador)
- `CLAUDE.md` y `specs/README.md`

**Supabase:** sin cambios.

---

## Modelo de datos

Sin tablas. Preferencias locales (no sensibles), por confirmar en el plan dónde viven (`localStorage` o `@tauri-apps/plugin-store`):

```typescript
export interface BiometricLockPrefs {
  readonly enabled: boolean;
  readonly offerAnswer: 'pending' | 'later' | 'never';
  readonly laterCount: number;
}
```

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any` y sin Angular Material (componentes propios con tokens CSS).
- Patrón de 3 servicios: los componentes no tocan el plugin; solo `BiometricAccessService`, con `import()` dinámico y solo en Android.
- Mínimo privilegio en la *capability*; ni resultados ni errores del plugin en logs.
- Sin credenciales, tokens ni datos sensibles en el almacén biométrico ni en preferencias: solo el estado del bloqueo.
- Mobile-first: área táctil ≥ 44 px, safe-areas, modo claro y oscuro; la pantalla de bloqueo no deja ver datos en la vista previa de apps recientes.
- Revisión visual obligatoria en navegador con la extensión de Chrome (con el plugin simulado) y comprobación en Android con una huella real o simulada.
- Repo público: sin secretos, URLs privadas, correos ni rutas locales.

---

## Decisiones tomadas en el clarify

1. **Interruptor**: solo la oferta inicial; el interruptor llega con la spec de ajustes.
2. **Apps recientes**: se cubre al pasar a segundo plano; sin `FLAG_SECURE`.

Ver [`clarify.md`](./clarify.md).

---

## Out of scope

- Guardar credenciales o el token de sesión protegidos por biometría (spec de vincular cuenta).
- Windows Hello, iOS, biometría en navegador, passkeys y WebAuthn.
- Bloqueo por inactividad configurable por el usuario (el tiempo de 30 s es fijo).
- Pantalla de ajustes y el interruptor para activar o desactivar el bloqueo después de la oferta (spec de ajustes).
- `FLAG_SECURE` y cualquier código nativo propio para ocultar la vista previa de apps recientes.
- Builds de release y comprobación con R8 (se hará al preparar la primera release).
