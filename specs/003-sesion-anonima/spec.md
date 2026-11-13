# Spec 003 — Sesión anónima con Supabase

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-13
**Estado**: Implementada (pendiente de commit)
**Ciclo**: completo
**Frontal**: sí (estados de arranque y de error de la sesión)

---

## Objetivo

Que cada instalación de la app obtenga automáticamente, en el primer arranque y sin registro, una identidad real y persistente en Supabase, para que todos los datos futuros sean por usuario y estén protegidos con RLS (`auth.uid()`).

---

## Contexto

- Spec 002 implementada: `SupabaseService` crea el cliente con `persistSession: true`, `autoRefreshToken: true` y `detectSessionInUrl: false`. Todavía no hay ninguna sesión ni tablas.
- Decisión de producto (registrada en el log, turno 023): **anónimo primero, cuenta después**. El usuario entra sin fricción y empieza a ganar XP al instante; más adelante podrá vincular email o Google para no perder el progreso. Vincular una identidad a un usuario anónimo **conserva el mismo `uid`**, así que no se pierden datos.
- **Aclaración de alcance: esta spec NO incluye registro ni login de usuario.** No hay pantalla de correo y contraseña, ni «crear cuenta», ni «iniciar sesión». Lo que ocurre es que la app **crea sola, en silencio**, un usuario anónimo en Supabase (una fila en `auth.users` con `uid` y `is_anonymous = true`, sin correo ni contraseña) y guarda su sesión en el móvil. Es una identidad técnica, no una cuenta. Registrarse con email o Google, iniciar sesión en otro móvil y recuperar el progreso tras reinstalar son **la spec de cuenta**, posterior.
- `supabase/config.toml` tiene hoy `enable_anonymous_sign_ins = false`: hay que habilitarlo en la configuración versionada y en el proyecto remoto.
- Persistencia: en Android el cliente guarda la sesión en el almacenamiento del WebView de Tauri; si el usuario borra los datos de la app o la desinstala **antes de vincular una cuenta, pierde la identidad anónima y sus datos**. Es un riesgo aceptado hasta la spec de cuenta.
- Supabase limita los inicios de sesión anónimos por hora e IP: la app solo debe crear una sesión anónima por instalación, nunca una por arranque.
- **Arranque (decidido en el clarify)**: la app **no se usa sin identidad**. Mientras no hay sesión se muestra una pantalla de carga (con tiempo máximo) y, si falla, una pantalla de error con «Reintentar». Así ningún dato queda sin dueño. Excepción: si ya hay una **sesión guardada** (cualquier arranque posterior al primero), la app abre al instante aunque no haya red, y el refresco del token ocurre en segundo plano.
- El bloqueo con la huella de Android es la **spec 004**, posterior a esta.
- **Diseño recibido** (Stitch, 2026-11-13): ver `design/`. Es una referencia que **no se implementa tal cual**: contiene elementos de prototipo y textos inexactos que hay que resolver antes del plan (ver `design/README.md`, decisiones D1 a D5).

### Decisión posterior al clarify (2026-11-13)

Un experimento con la librería real mostró que `getSession()` no sirve para abrir al instante sin red (ver US-003-02). Se corrige el diseño en esta spec: lectura directa del almacenamiento, `storageKey` fija, señal `autoRetryPending`, `idle` nunca se pinta y todo `SIGNED_OUT` es un rechazo del servidor. Estas correcciones **no se han vuelto a pasar por la revisión cruzada**, por decisión del usuario (la revisión entraba en bucle); el clarify no se modifica.

---

## Historias de usuario

### US-003-01 — Sesión anónima automática en el primer arranque (P1)

**Como** usuario nuevo, **quiero** empezar a usar la app sin registrarme, **para** no tener fricción al empezar.

**Criterios de aceptación:**
- Si al arrancar no hay sesión guardada, la app llama una sola vez a `signInAnonymously()` y obtiene un usuario con `uid`.
- Si ya hay una sesión válida, **no** se crea otra (ni se llama a `signInAnonymously()`).
- `AuthAccessService` expone señales de solo lectura: `status` (`idle | loading | ready | error`), `session`, `userId` (`string | null`) y `errorReason` (`AuthErrorReason | null`, distinto de `null` solo cuando `status` es `error`) y `autoRetryPending` (`boolean`, `true` mientras haya reintentos automáticos programados); la pantalla de error lee de ahí el motivo y si debe mostrar el aviso «Comprobando la conexión automáticamente…».
- Mientras `status` es `loading` **o `idle`** (estado inicial, antes de empezar) se muestra la pantalla de carga de US-003-06 y **no** se muestra ningún contenido de la app. `idle` es un estado interno que **nunca se pinta**: el estado inicial (`ready` con sesión guardada, `loading` sin ella) se decide antes del primer renderizado (inicializador de la app), así que con sesión guardada tampoco hay parpadeo de la pantalla de carga.
- Hay un **tiempo máximo de espera por intento** para crear la sesión (valor a fijar en el plan, p. ej. 10 s); al agotarse el plazo, `status` pasa a `error` con `errorReason = 'timeout'`. **El plazo solo cambia lo que ve el usuario: la llamada pendiente no se abandona** (`supabase-js` no permite cancelarla); ver «un solo intento en curso» en US-003-04.
- Móvil: no requiere ninguna interacción, permiso ni teclado.

### US-003-02 — La sesión persiste entre arranques y abre sin red (P1)

**Como** usuario, **quiero** que la app me reconozca al volver, incluso sin conexión, **para** conservar mi progreso y poder usarla siempre.

**Criterios de aceptación:**
- Tras cerrar y volver a abrir la app (también en Android, no solo en el navegador), se recupera la **misma** sesión y el mismo `userId`, sin nuevo inicio de sesión anónimo.
- Con una sesión guardada, la app abre **al instante, sin esperar a la red** (`status` pasa a `ready` aunque el token haya caducado); solo el primer arranque sin sesión depende de la red. **No se usa `getSession()` para decidirlo**: con un token caducado y sin red, la librería real (`auth-js` 2.119.0) tarda unos 25 s (8 intentos) y devuelve sesión `null`, aunque conserva la sesión guardada (comprobado el 2026-11-13). `AuthAccessService` lee la sesión guardada **directamente del almacenamiento**, con una `storageKey` fija y explícita que establece `SupabaseService`, valida su forma (usuario y token de refresco) y deja que `supabase-js` refresque por su cuenta en segundo plano.
- **Contrato de `ready`**: significa que **hay identidad** (`userId`), no que haya conexión ni un token vigente. Con token caducado y sin red, las consultas con `auth.uid()` fallarán (401) aunque `status` sea `ready`; cada capa de datos debe tratar los 401 y el modo sin red por su cuenta. Además, mientras `supabase-js` está refrescando sin red, **las consultas a datos también esperan** (hasta ~25 s) porque piden el token a la librería: la capa de datos debe aplicar sus propios plazos. Se documenta en `docs/supabase.md` y `CLAUDE.md`.
- El refresco del token es automático (lo gestiona `supabase-js`) y ocurre en segundo plano; si falla por falta de red, se reintenta solo en el siguiente ciclo del refresco automático y al volver la app a primer plano, sin crear un usuario nuevo ni mostrar la pantalla de error. En la versión instalada (`auth-js` 2.119.0) el ciclo es de **30 s** y, tras un fallo de refresco, hay un **enfriamiento de 60 s**; `supabase-js` no escucha el evento de red, así que tras reconectar puede tardar **hasta ~60 s**. El plan lo comprueba contra la versión instalada y, si hiciera falta una recuperación más inmediata, se fuerza el refresco al detectar la reconexión.
- **Clasificación de los fallos de refresco (conservadora: ante la duda, nunca se descarta la sesión):**
  - **Transitorio** (se reintenta; no se descarta nada ni se muestra error): sin red, tiempo agotado, errores reintentables de `supabase-js`, respuestas 5xx o 429 y **cualquier error no reconocido**.
  - **Definitivo**: solo cuando el servidor rechaza de forma explícita el token o la sesión (error de API 400/401 con código de token de refresco no encontrado o ya usado, sesión no encontrada o usuario no encontrado; los códigos exactos se confirman en el plan contra la versión instalada de `supabase-js`).
- **Detección del rechazo definitivo**: `supabase-js` gestiona el refresco por sí mismo (`autoRefreshToken: true`) y, ante un rechazo definitivo, retira él mismo la sesión local y emite `SIGNED_OUT`. `AuthAccessService` escucha `onAuthStateChange` y trata un `SIGNED_OUT` que **la app no ha pedido** como rechazo definitivo; no intenta releer ni reintentar sobre una sesión que la librería ya retiró. En esta spec no hay cierre de sesión, así que **todo `SIGNED_OUT` es un rechazo del servidor**; la marca de «salida pedida por la app» la añadirá la spec de cuenta junto al cierre de sesión. El plan debe comprobar este comportamiento contra la versión instalada de `supabase-js` y, si no se cumple, pasar a gestionar el refresco de forma explícita.
- Ante ese rechazo se crea una nueva sesión anónima (cambia el `uid`), dejando constancia en logs sin incluir tokens. Es el único caso en el que cambia el `uid`.
- **Cambio de identidad en caliente**: mientras se sustituye la identidad, `status` vuelve a `loading` (la pantalla de carga cubre la app) y después pasa a `ready` con el nuevo `userId`. La señal `userId` es el contrato: toda capa de datos futura debe indexar sus datos y cachés por `userId()` y descartar lo que pertenezca al `uid` anterior. Queda documentado en `docs/supabase.md` y `CLAUDE.md`.
- Los tokens nunca se escriben en logs ni en consola, **en ningún flujo**: inicio de sesión anónimo, refresco en segundo plano, errores y cambio de identidad.

### US-003-03 — La identidad llega al backend como usuario autenticado anónimo (P1)

**Como** desarrollador, **quiero** comprobar que el backend ve al usuario, **para** poder escribir políticas RLS con `auth.uid()`.

**Criterios de aceptación:**
- `auth.getUser()` (llamada real a Supabase) devuelve el mismo `uid` que `userId()` y `is_anonymous = true`.
- El rol del JWT es `authenticated` (no `anon`), de modo que las políticas `TO authenticated` aplican. `getUser()` no devuelve el rol: se lee del claim `role` del `access_token` de la sesión, decodificado en local, y la comprobación solo muestra el valor del claim, nunca el token.
- `docs/supabase.md` explica cómo distinguir usuarios anónimos en una política (`auth.jwt() ->> 'is_anonymous'`) para futuras migraciones, y el contrato de `ready` y de `userId` (ver US-003-02). Un test de fichero comprueba que esa explicación existe.
- **Verificación reutilizable, no una sonda desechable**: existe `pnpm verify:auth` (ejecución **manual**; necesita `environment.ts` con la clave; no corre en CI ni en el pre-commit) que obtiene una sesión anónima real y muestra **solo booleanos**: el `uid` coincide, `is_anonymous` es `true` y el claim `role` es `authenticated`. Nunca imprime el token. La decodificación del claim es una función pura con test unitario.

### US-003-04 — Fallos de inicio de sesión controlados (P2)

**Como** usuario sin red (o con el servicio limitado) en su primer arranque, **quiero** que la app no se rompa, **para** poder recuperarme sola cuando haya conexión.

**Criterios de aceptación:**
- Sin sesión guardada, con falta de red, límite de peticiones (429) o con el registro anónimo desactivado, `status` pasa a `error` con un motivo tipificado en `errorReason` (`network | rate_limited | disabled | timeout | service_unavailable | unknown`; `service_unavailable` = respuestas 5xx del servicio), sin lanzar excepciones sin capturar.
- **Un solo intento en curso a la vez, también tras un timeout**: el plazo de US-003-01 solo cambia lo que se ve y la llamada a `signInAnonymously()` sigue viva. Un `retry()` manual o un reintento automático mientras esa llamada siga pendiente **se une a ella** (con un nuevo plazo) en vez de lanzar otra. Si la llamada original acaba con éxito, se usa su sesión (`status` pasa a `ready`) y se descartan los plazos; si acaba con error, se aplica ese error. Nunca hay dos llamadas simultáneas: no se crean usuarios anónimos huérfanos ni se gasta el límite de peticiones por IP.
- **Qué motivos se reintentan solos**: únicamente `network`, `timeout` y `service_unavailable` (con espera creciente, al volver la conexión y al volver a primer plano). `rate_limited`, `disabled` y `unknown` **no** se reintentan automáticamente (reintentar solo alargaría el límite o no serviría de nada): esperan al `retry()` manual del usuario.
- Se reintenta con espera creciente (2, 5, 15 y 30 s) y después con un **sondeo lento de una llamada por minuto** mientras haya un error reintentable y la app esté a la vista; se pausa en segundo plano. Nunca hay ráfagas de peticiones. El sondeo es el mecanismo garantizado de recuperación porque el evento `online` no es fiable en el WebView de Android (ver más abajo).
- **Disparador de la reconexión** (el primer inicio no es un refresco y `supabase-js` no lo reintenta solo): al detectar el evento `online` del WebView, o al volver la app a primer plano, se reintenta automáticamente una vez, respetando el «un solo intento en curso». Hay un método `retry()` para forzarlo. **Comprobado en el emulador de Android (2026-11-13): el evento `online` NO se dispara de forma fiable en el WebView** (no llegó nunca tras recuperar la red). Se mantiene solo como acelerador; la recuperación la garantiza el sondeo lento.
- Cuando el reintento tiene éxito, `status` pasa a `ready` y se limpia el error.

### US-003-05 — Configuración como código (P2)

**Como** desarrollador, **quiero** que el soporte de sesión anónima esté versionado, **para** que quien clone el repo lo reproduzca en su propio proyecto.

**Criterios de aceptación:**
- `supabase/config.toml` tiene `enable_anonymous_sign_ins = true`, con un límite de inicios de sesión anónimos por hora e IP razonable: `anonymous_users` presente y **entre 1 y 30** (30 es el valor por defecto).
- `docs/supabase.md` documenta cómo habilitarlo en un proyecto remoto propio. **Aplicarlo al proyecto remoto es un cambio en producción y requiere confirmación explícita del usuario**, tras verificar la cuenta de la CLI.
- Sin la opción activada en el remoto, el comportamiento es el de US-003-04 (`disabled`), no un fallo opaco.

### US-003-06 — Pantallas de carga y de error de la sesión (P1)

**Como** usuario, **quiero** ver qué ocurre mientras la app prepara mi sesión y poder reintentar si falla, **para** no quedarme ante una pantalla muerta ni sin saber qué hacer.

**Criterios de aceptación:**
- **Cargando** (`loading` e `idle`): pantalla de carga clara que cubre la app y desaparece sola al pasar a `ready`. También se muestra durante un cambio de identidad (US-003-02).
- **Error** (`error`): pantalla con un mensaje comprensible según el motivo y una acción **Reintentar** que llama a `retry()`; mientras reintenta se vuelve a la pantalla de carga. Correspondencia de los 6 motivos con las 5 variantes del diseño: `network` → «Sin conexión»; `rate_limited` → «Demasiados intentos»; `timeout` → «Tarda más de lo normal»; `service_unavailable` **y `disabled`** → «Servicio no disponible» (el usuario no necesita saber que el registro anónimo está desactivado en el servidor); `unknown` → «Error inesperado».
- Los mensajes son en lenguaje llano, sin términos técnicos, códigos ni tokens.
- Estados a cubrir: carga, y una variante de error por cada motivo (red, límite de peticiones, tiempo máximo agotado, servicio no disponible/desactivado y error inesperado), más la recuperación (vuelve a `ready`).
- Accesible y táctil: la acción Reintentar tiene un área táctil de al menos 44 px, es alcanzable con una mano y se anuncia a lectores de pantalla; respeta las safe-areas.
- Funciona en modo claro y oscuro.
- Con una sesión guardada **no** se muestran estas pantallas: la app abre directamente.
- **La carga es un indicador indeterminado**: sin porcentaje, sin pasos que simulen un progreso y sin promesas de tiempo («en 3 segundos»). No muestra XP, racha, nivel ni contadores de tareas: la gamificación empieza cuando el usuario completa su primera tarea.
- **Textos veraces**: ninguna pantalla afirma que la identidad o los datos estén «en el dispositivo» ni que «los avances siguen a salvo». El aviso «Comprobando la conexión automáticamente…» solo se muestra mientras quedan reintentos automáticos de verdad (`network`, `timeout` y `service_unavailable`), nunca en `rate_limited` ni `unknown`, y desaparece al agotarlos.
- Sin elementos de prototipo del diseño (selector de tema, simulador de estados, herramienta de prueba, barra «System Recovery» con volver y perfil). El tema sigue al del sistema.

---

## Plan de tests (TDD)

Cada criterio tiene al menos un test. El orden es el orden Red → Green.

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-003-01 sin sesión guardada llama una vez a signInAnonymously` | US-003-01 CA 1 | `src/app/core/services/auth.access.service.spec.ts` | unit (mock de `SupabaseService`) |
| `US-003-01 con sesión guardada no llama a signInAnonymously` | US-003-01 CA 2 | idem | unit |
| `US-003-01 expone status, session y userId como señales de solo lectura` | US-003-01 CA 3 | idem | unit |
| `US-003-01 status es loading mientras no hay sesión y idle se trata como loading` | US-003-01 CA 4 | idem y `session-status.spec.ts` | unit |
| `US-003-01 primer arranque sin interacción, permiso ni teclado` | US-003-01 CA 6 | navegador (extensión de Chrome) y Android con datos de la app borrados | manual |
| `US-003-01 expone errorReason solo cuando status es error` | US-003-01 CA 3 | idem | unit |
| `US-003-01 al agotar el tiempo máximo pasa a error con errorReason timeout` | US-003-01 CA 5 | idem | unit (reloj simulado) |
| `US-003-02 recupera la misma sesión al reiniciar` | US-003-02 CA 1 | idem | unit (cliente simulado con almacenamiento persistente) |
| `US-003-02 con sesión guardada lee el almacenamiento directamente y pasa a ready sin llamar a getSession` | US-003-02 CA 2 | idem | unit (almacenamiento simulado, red caída) |
| `US-003-02 una sesión guardada con forma inválida se ignora y se trata como sin sesión` | US-003-02 CA 2 | idem | unit |
| `US-003-01 idle nunca se pinta: el estado inicial se decide antes del primer renderizado` | US-003-01 CA 4 | idem y `app.spec.ts` | unit |
| `US-003-01 autoRetryPending es true solo mientras hay reintentos automáticos programados` | US-003-01 CA 3 | idem | unit (reloj simulado) |
| `US-003-02 los supuestos sobre supabase-js siguen siendo ciertos (ciclo 30 s, enfriamiento 60 s, arranque sin red, sesión conservada)` | US-003-02 CA 2, 4 | `scripts/verify-supabase-assumptions.mjs` | manual (lo ejecuta quien actualice `supabase-js`; no corre en CI) |
| `US-003-02 ready significa identidad, no conexión: con token caducado y sin red sigue en ready` | US-003-02 CA 3 | idem | unit |
| `US-003-02 un fallo de refresco por red no muestra error y se reintenta en el siguiente ciclo (30 s, enfriamiento de 60 s)` | US-003-02 CA 4 | idem | unit (reloj simulado) |
| `US-003-02 sin red, 5xx, 429 y errores desconocidos son transitorios y nunca descartan la sesión` | US-003-02 CA 5 | idem | unit |
| `US-003-02 un SIGNED_OUT que la app no pidió se trata como rechazo definitivo y uno pedido por la app no` | US-003-02 CA 6 | idem | unit (eventos de `onAuthStateChange` simulados) |
| `US-003-02 el comportamiento de supabase-js ante un refresco rechazado coincide con lo supuesto` | US-003-02 CA 6 | comprobación contra la versión instalada (sonda temporal, revertida) | manual (en el plan) |
| `US-003-02 un rechazo definitivo crea una sesión nueva` | US-003-02 CA 7 | idem | unit |
| `US-003-02 el cambio de identidad pasa por loading y publica el nuevo userId` | US-003-02 CA 8 | idem | unit |
| `US-003-02 ningún flujo escribe tokens en consola (signInAnonymously, refresco, error y cambio de identidad)` | US-003-02 CA 9 | idem | unit (espía de `console` en cada flujo) |
| `US-003-04 mapea red, 429, 5xx y registro desactivado a su motivo` | US-003-04 CA 1 | idem | unit |
| `US-003-04 retry() o un reintento automático con un intento en curso no lanza otra llamada` | US-003-04 CA 2 | idem | unit |
| `US-003-04 tras un timeout, retry() se une a la llamada pendiente y no lanza otra` | US-003-04 CA 2 | idem | unit (reloj simulado) |
| `US-003-04 si la llamada original resuelve con éxito tras el timeout, se usa su sesión y no se crea otro usuario` | US-003-04 CA 2 | idem | unit |
| `US-003-04 solo network, timeout y service_unavailable se reintentan solos; rate_limited, disabled y unknown esperan al retry() manual` | US-003-04 CA 3 | idem | unit |
| `US-003-04 reintenta con espera creciente y después cada 60 s, sin ráfagas; el sondeo se pausa en segundo plano y recupera la sesión sin eventos` | US-003-04 CA 4 | idem | unit (reloj simulado) |
| `US-003-04 el evento online y la vuelta a primer plano disparan un reintento, y retry() lo fuerza` | US-003-04 CA 5 | idem | unit (eventos simulados) |
| `US-003-04 sin red al arrancar, la app se recupera sola al volver la red` | US-003-04 CA 4-5 | emulador (modo avión por `adb`): comprobado el 2026-11-13; el evento `online` no se dispara en el WebView | manual |
| `US-003-04 el éxito del reintento pasa a ready y limpia el error` | US-003-04 CA 6 | idem | unit |
| `US-003-05 config.toml habilita el registro anónimo y fija anonymous_users entre 1 y 30` | US-003-05 CA 1 | `scripts/config-auth.test.mjs` | verificación de fichero |
| `US-003-03 decodeJwtRole devuelve el claim role y rechaza tokens mal formados sin lanzar ni mostrar el token` | US-003-03 CA 2, 4 | `scripts/verify-auth.test.mjs` | unit |
| `US-003-03 pnpm verify:auth: el uid coincide, is_anonymous es true y el claim role es authenticated (solo booleanos)` | US-003-03 CA 1-2, 4 | ejecución real de `scripts/verify-auth.mjs` contra el proyecto; manual, no corre en CI | manual |
| `US-003-03 docs/supabase.md explica is_anonymous en políticas y el contrato de ready y userId` | US-003-03 CA 3 | `scripts/docs-auth.test.mjs` | verificación de fichero |
| `US-003-02 persistencia en Android tras reiniciar el APK, también sin red` | US-003-02 CA 1-2 | emulador (`adb`) | manual |
| `US-003-06 muestra la pantalla de carga mientras status es loading` | US-003-06 CA 1 | `src/app/shared/components/session-status/session-status.spec.ts` | unit (componente) |
| `US-003-06 muestra el mensaje según el motivo y el botón Reintentar llama a retry()` | US-003-06 CA 2-4 | idem | unit (componente) |
| `US-003-06 los 6 motivos se corresponden con las 5 variantes (disabled como servicio no disponible)` | US-003-06 CA 2 | idem | unit (componente) |
| `US-003-06 no se muestra con sesión guardada` | US-003-06 CA 7 | idem | unit |
| `US-003-06 la carga no muestra porcentaje, pasos, XP, racha ni nivel` | US-003-06 CA 8 | idem | unit (componente) |
| `US-003-06 ningún texto afirma «en tu dispositivo» o «avances a salvo»; el aviso de reintento solo con reintentos pendientes` | US-003-06 CA 9 | idem | unit (componente) |
| `US-003-06 no hay elementos de prototipo (simulador, selector de tema, barra de volver)` | US-003-06 CA 10 | idem | unit (componente) |
| `US-003-06 el componente es OnPush y no expone términos técnicos` | US-003-06 CA 3 | idem | unit |
| `US-003-06 revisión visual: estados, tema claro/oscuro, área táctil, safe-areas` | US-003-06 CA 5-6 | extensión de Chrome (viewport móvil) y Android | manual (obligatoria) |

---

## Ficheros afectados

**Crear:**
- `src/app/core/services/auth.access.service.ts` (único punto de contacto con la autenticación de Supabase)
- `src/app/core/services/auth.access.service.spec.ts`
- `src/app/core/models/auth-status.ts` (estados y motivos de error) *(por confirmar en /sdd-plan)*
- `src/app/shared/components/session-status/` (pantallas de carga y error, con su `.constructor.service.ts` de textos y su spec) *(por confirmar en /sdd-plan)*
- `scripts/config-auth.test.mjs`
- `scripts/verify-auth.mjs` y `scripts/verify-auth.test.mjs` (verificación manual reutilizable; función pura `decodeJwtRole` con test)
- `scripts/docs-auth.test.mjs` (comprueba que `docs/supabase.md` documenta `is_anonymous`, `ready` y `userId`)
- `scripts/verify-supabase-assumptions.mjs` (manual, reproducible: ciclo y enfriamiento de refresco, arranque sin red con token caducado y conservación de la sesión)

**Modificar:**
- `src/app/app.config.ts` (inicialización de la sesión al arrancar) *(por confirmar en /sdd-plan)*
- `src/app/app.ts` y `app.html` (la pantalla de estado cubre el contenido hasta que la sesión está lista) *(por confirmar en /sdd-plan)*
- `supabase/config.toml` (`enable_anonymous_sign_ins = true`)
- `package.json` (scripts `verify:auth` y `verify:supabase`)
- `src/app/core/services/supabase.ts` y su spec (`storageKey` fija y explícita)
- `docs/supabase.md` (sesión anónima, políticas RLS con `is_anonymous`, aplicar la config al remoto)
- `CLAUDE.md` (regla: toda tabla de datos de usuario usa `auth.uid()`)
- `specs/README.md`

**Supabase remoto (requiere confirmación):**
- Habilitar el inicio de sesión anónimo en el proyecto vinculado.

---

## Modelo de datos

Sin tablas nuevas. Tipos TypeScript:

```typescript
export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error';
export type AuthErrorReason =
  | 'network'
  | 'rate_limited'
  | 'disabled'
  | 'timeout'
  | 'service_unavailable'
  | 'unknown';
```

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals para el estado, standalone, sin `any` y sin Angular Material (componente propio con tokens CSS).
- Patrón de 3 servicios: el componente no toca `AuthAccessService` con lógica; recibe estado y emite la acción Reintentar.
- Revisión visual obligatoria en navegador con la extensión de Chrome (viewport móvil) y comprobación en Android.
- Solo `AuthAccessService` habla con `supabase.auth`; ningún componente llama a `SupabaseService` directamente.
- Una sola sesión anónima por instalación; nunca crear una en cada arranque (excepto el caso de token descartado de US-003-02).
- Tokens y JWT jamás en logs, errores mostrados al usuario, specs ni commits.
- Cambios de esquema: ninguno. Cambios en el remoto: solo con confirmación explícita y cuenta de la CLI verificada.
- Repo público: sin *project refs*, URLs privadas, correos ni rutas locales en código ni docs.
- Mobile-first: con sesión guardada el arranque no depende de la red; solo el primer arranque la necesita.

---

## Out of scope

- Registro, login, cierre de sesión y perfil de usuario (spec de cuenta). Vincular email, Google u otro proveedor a la cuenta anónima conservará el `uid`.
- Recuperar la identidad tras desinstalar o borrar los datos de la app.
- Bloqueo de la app con la huella de Android (spec 004).
- Pantalla de bienvenida u onboarding del primer uso (spec propia de producto).
- Tablas, RLS y modelo de datos (tareas, XP, rachas).
- Uso de la app sin identidad (cola de cambios offline antes del primer inicio de sesión).
- Captcha o protección frente a abuso de registros anónimos (se valorará en una spec de seguridad si hace falta).
- Limpieza de usuarios anónimos huérfanos en el backend.

---

## Verificación realizada (2026-11-13)

- TDD en cada ciclo (Red comprobado antes de cada Green). 111 tests de la app (cobertura 99,4 % de líneas y 97,1 % de ramas) y 34 tests de scripts. Lint, formato, escáner de secretos, tipos y build en verde.
- **Remoto**: activado el proveedor anónimo **desde el panel** (no con `config push`: el `config diff` mostró que degradaría confirmación de email, MFA y SMS). `pnpm verify:auth` contra el proyecto real: el `uid` coincide, `is_anonymous = true` y el claim `role` es `authenticated`.
- **Navegador** (extensión de Chrome, viewport móvil): carga y las 5 variantes de error; botón de 56 px de alto, sin scroll horizontal, un solo `h1`, rol de alerta, iconos ocultos a lectores de pantalla y consola limpia. En la raíz, con el registro anónimo aún desactivado, la app mostró «Servicio no disponible» sin aviso de reintento, como especifica la spec.
- **Android** (emulador): modo claro y oscuro con safe-areas respetadas; primer arranque con red; reinicio con sesión guardada; **arranque sin red con el token caducado (reloj +2 h): abre al instante**; arranque sin red sin sesión con aviso de reintento y recuperación sola.
- **Hallazgos reales que cambiaron el diseño**: (1) `getSession()` sin red y con token caducado tarda ~25 s y devuelve `null` → se lee el almacenamiento directamente; (2) el evento `online` **no se dispara** en el WebView de Android → sondeo lento de 60 s; (3) `config push` es peligroso en un proyecto real → solo el interruptor del panel. `pnpm verify:supabase` fija los supuestos sobre `supabase-js`.
- Las correcciones de diseño posteriores al clarify no se volvieron a pasar por la revisión cruzada, por decisión del usuario.

