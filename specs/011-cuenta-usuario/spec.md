# Spec 011 — Cuenta de usuario

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-14
**Estado**: Aprobada (clarify cerrado)
**Ciclo**: completo
**Frontal**: sí

---

## Objetivo

Que cualquier persona pueda crear una cuenta (nombre de usuario y contraseña, sin correo), conservar en ella las tareas y el progreso que ya tiene, entrar con ella en otro móvil y gestionarla (cerrar sesión, cambiar la contraseña o el nombre de usuario y borrarla), sin que usar la app sin cuenta deje de ser posible.

---

## Contexto

- Hoy la app solo tiene **sesión anónima** (spec 003): cada instalación crea su identidad de Supabase sin registro y los datos (`tasks`, `player_stats`, `xp_events`, specs 005 y 008) cuelgan de ese `user_id` con RLS por `auth.uid()`. Si se desinstala la app o se cambia de móvil, **se pierden las tareas, el XP y la racha**. Las specs 003, 004 y 008 dejaron «cuenta de usuario» fuera de alcance.
- Lo que ya existe y se reutiliza: `AuthAccessService` (único dueño de la identidad; expone `userId` y `session` con `isAnonymous`), las capas de datos indexadas por `userId()` (cambiar de identidad ya cambia lo que se ve), `TasksAccessService`, `ProgressAccessService` y `AlarmsAccessService` (se reconcilian al cambiar de usuario), el bloqueo con huella (independiente de la cuenta) y el sistema de diseño de la spec 010.
- Idea clave de Supabase: **vincular** la sesión anónima a un identificador y una contraseña (`updateUser`) **conserva el mismo `user_id`**, así que las tareas y el XP siguen siendo suyos sin migrar nada. En cambio, **iniciar sesión en una cuenta que ya existe** cambia de `user_id`: lo anónimo de este móvil quedaría huérfano (regla decidida abajo).
- **Sin correo**: no se recoge ningún correo ni dato personal. Supabase exige un identificador con forma de correo, así que internamente se usa uno ficticio derivado del nombre de usuario que la persona nunca ve y al que nunca se envía nada.

### Decisiones cerradas en `/clarify`

1. **Identificador**: nombre de usuario y contraseña. Sin verificación ni envío de correo de ningún tipo (sin SMTP, plantillas, códigos ni enlaces).
2. **Sin recuperación del acceso**: si se olvida la contraseña, la cuenta se pierde. Se avisa con claridad y con confirmación al crearla; solo se puede cambiar la contraseña estando dentro. La historia de recuperar acceso queda **sin trabajo**.
3. **Entrar con tareas anónimas en el móvil**: se pregunta antes de entrar: traer las tareas **pendientes** a la cuenta o usar solo la cuenta (las de este móvil se descartan, con confirmación). El XP y las completadas del móvil no se suman.
4. **Contraseña**: de 8 a 64 caracteres y distinta del nombre de usuario; sin más reglas.
5. **Nombre de usuario**: de 3 a 24 caracteres entre `a-z`, `0-9`, `.`, `-` y `_`; sin distinguir mayúsculas (se guarda en minúsculas); único.
6. **Cerrar sesión**: deja una sesión anónima nueva y vacía y cancela las alarmas; los datos siguen en la cuenta.
7. **Confirmaciones**: la contraseña actual para cambiarla; la contraseña para borrar la cuenta y para cambiar el nombre de usuario.
8. **Recordatorio sin cuenta**: tarjeta discreta descartable bajo el resumen de nivel, solo tras completar la primera tarea; descartada, no vuelve en 14 días.
9. **Remoto**: desactivar la confirmación de correo del proyecto y fijar la longitud mínima de la contraseña (configuración remota, con confirmación explícita y tras verificar la cuenta de la CLI de Supabase).
10. **Riesgos aceptados**: sin recuperación; sin verificación, cualquiera puede ocupar un nombre de usuario; la seguridad de la cuenta es solo su contraseña (sin MFA).

Detalle en [clarify.md](./clarify.md).

---

## Historias de usuario

### US-011-01 — Crear cuenta conservando lo que ya tengo (P1)

**Como** persona que ya usa la app sin cuenta, **quiero** registrarme con un nombre de usuario y una contraseña, **para** no perder mis tareas, mi XP ni mi racha.

**Criterios de aceptación:**
- Desde la pantalla Cuenta, «Crear cuenta» pide nombre de usuario y contraseña (con repetición), y valida en el momento las reglas acordadas explicando cada problema con un texto claro.
- Antes de crear, se muestra el aviso «si olvidas tu contraseña no podremos recuperar tu cuenta» y se exige marcar que se entiende; sin marcarlo no se puede crear.
- Al crearla, la cuenta queda vinculada al **mismo `user_id`**: las tareas, el XP, el nivel y la racha siguen ahí sin recargar ni duplicarse, y la sesión queda abierta.
- Un nombre de usuario ya en uso se indica como «no disponible» sin más detalle.
- Sin red o con el servicio caído se explica el motivo y se puede reintentar; lo escrito se conserva (la contraseña solo mientras la pantalla está abierta).
- Móvil: el teclado no tapa los campos ni el botón, los campos usan el autocompletado adecuado (`username`, `new-password`) y el botón atrás de Android vuelve sin perder lo escrito.

### US-011-02 — Iniciar sesión en una cuenta existente (P1)

**Como** persona con cuenta, **quiero** iniciar sesión con mi nombre de usuario y mi contraseña (también en un móvil nuevo), **para** recuperar mis tareas y mi progreso.

**Criterios de aceptación:**
- Con credenciales correctas se muestran las tareas, el XP y la racha de la cuenta; las alarmas del móvil se reconcilian con las tareas de esa cuenta.
- Con credenciales incorrectas el mensaje es siempre el mismo (no distingue usuario inexistente de contraseña errónea). Si el servicio limita los intentos, se dice «Demasiados intentos, espera unos minutos».
- Si el móvil tiene **tareas anónimas**, antes de cambiar de identidad se pregunta: «traer las tareas pendientes de este móvil a tu cuenta» o «usar solo tu cuenta» (se descartan las de este móvil, tras una confirmación que dice que no se puede deshacer). El XP y las completadas del móvil no se suman. Nunca se pierden datos sin esa aceptación.
- Se puede cancelar sin iniciar sesión y la sesión anónima sigue intacta.
- La sesión persiste al cerrar y abrir la app, y la app abre sin esperar a la red cuando ya hay sesión (contrato de la spec 003).

### US-011-03 — Pantalla Cuenta y cierre de sesión (P1)

**Como** usuario, **quiero** un sitio donde ver el estado de mi cuenta y salir de ella, **para** saber si mis datos están a salvo y poder cambiar de cuenta.

**Criterios de aceptación:**
- Un icono de perfil en la cabecera de la lista abre la pantalla **Cuenta** (zona táctil ≥ 44 px).
- Sin cuenta: indica que los datos solo están en este móvil y ofrece «Crear cuenta» e «Iniciar sesión». Con cuenta: muestra el nombre de usuario y las acciones disponibles (cambiar contraseña, cambiar nombre de usuario, cerrar sesión, borrar cuenta).
- «Cerrar sesión» pide confirmación, cierra la sesión, deja una **sesión anónima nueva y vacía** y cancela las alarmas del móvil; los datos siguen en la cuenta y reaparecen al volver a entrar.
- La app nunca se queda sin identidad: tras cerrar sesión hay sesión anónima y el uso sin cuenta funciona.
- Móvil: el botón atrás de Android vuelve a la lista desde la pantalla Cuenta.

### US-011-04 — Recuperar el acceso (SIN TRABAJO — resuelto en clarify)

Decidido: **sin recuperación**. No hay «He olvidado la contraseña», ni códigos ni correos. El aviso y la confirmación al crear la cuenta (US-011-01) y el límite de la seguridad (solo la contraseña) son el contrato. Quien olvide su contraseña puede seguir usando la app sin cuenta o crear otra cuenta nueva.

### US-011-05 — Cambiar la contraseña (P2)

**Como** usuario con cuenta, **quiero** cambiar mi contraseña, **para** mantener mi cuenta segura.

**Criterios de aceptación:**
- Desde Cuenta se pide la contraseña actual, la nueva y su repetición; se aplican las reglas acordadas y se confirma el cambio.
- Una contraseña actual incorrecta, una nueva que no cumple las reglas o igual a la actual se rechazan con un mensaje claro.
- La sesión sigue abierta tras el cambio.

### US-011-06 — Borrar mi cuenta y mis datos (P2)

**Como** usuario, **quiero** borrar mi cuenta y todo lo que guardé, **para** controlar mis datos.

**Criterios de aceptación:**
- Desde Cuenta, «Borrar cuenta» explica qué se borra (cuenta, tareas, progreso) y que **no se puede deshacer**, y pide la contraseña y una confirmación explícita.
- Al confirmar se eliminan la cuenta y todos sus datos (tareas, estadísticas y libro de XP) y el móvil queda con una sesión anónima nueva y vacía, sin alarmas.
- Si falla (sin red, error del servidor) no se borra nada a medias y se explica cómo reintentar.
- Solo una cuenta con nombre de usuario puede ejecutarlo; una sesión anónima no ve la opción.

### US-011-07 — Cambiar el nombre de usuario (P3)

**Como** usuario con cuenta, **quiero** cambiar mi nombre de usuario, **para** que refleje cómo quiero identificarme.

**Criterios de aceptación:**
- Se pide el nombre nuevo (mismas reglas) y la contraseña; si está libre, se aplica y la pantalla Cuenta lo muestra.
- Un nombre ya en uso se indica como «no disponible».
- La sesión sigue abierta y los datos no cambian.

### US-011-08 — Seguir usando la app sin cuenta (P1)

**Como** usuario que no quiere cuenta, **quiero** usar la app como hasta ahora, **para** no ser obligado a registrarme.

**Criterios de aceptación:**
- La app abre y funciona sin cuenta exactamente igual que antes (sin red incluida, con sesión guardada); la cuenta nunca es un paso obligatorio ni bloquea ninguna pantalla.
- Tras completar la primera tarea aparece una tarjeta discreta bajo el resumen de nivel («tus datos solo están en este móvil») con «Crear cuenta» y una forma de descartarla; descartada, no reaparece en 14 días y no tapa la lista.
- Cambiar de identidad (entrar, salir, borrar) nunca muestra por un instante datos de otra persona.

---

## Plan de tests (TDD)

Cada criterio tiene al menos un test. Orden Red → Green.

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-011-01 vincular crea la cuenta sin cambiar el user_id y deja la sesión abierta` | CA 3 de US-011-01 | `src/app/core/services/auth.access.service.spec.ts` | unit |
| `US-011-01 validación de nombre de usuario y contraseña con sus mensajes` | CA 1 de US-011-01 | `src/app/features/account/account.constructor.service.spec.ts` | unit |
| `US-011-01 sin marcar el aviso de no recuperación no se puede crear` | CA 2 de US-011-01 | `create-account.spec.ts` | unit |
| `US-011-01 nombre en uso se indica sin detalle; sin red se explica y se conserva lo escrito` | CA 4 y 5 de US-011-01 | `auth.access.service.spec.ts`, `create-account.spec.ts` | unit |
| `US-011-02 iniciar sesión cambia el userId, recarga datos y reconcilia alarmas` | CA 1 de US-011-02 | `auth.access.service.spec.ts`, `tasks.access.service.spec.ts` | unit |
| `US-011-02 credenciales incorrectas dan siempre el mismo mensaje; límite de intentos` | CA 2 de US-011-02 | `auth-error.util.spec.ts`, `sign-in.spec.ts` | unit |
| `US-011-02 con tareas anónimas se pregunta y nunca se pierden sin aceptarlo` | CA 3 de US-011-02 | `account.access.service.spec.ts`, `sign-in.spec.ts` | unit |
| `US-011-02 traer pendientes mueve solo las pendientes y no suma XP` | CA 3 de US-011-02 | `supabase/migrations/...account.sql` + `scripts/account-migration.test.mjs` | estático |
| `US-011-02 cancelar deja la sesión anónima intacta; la sesión persiste y abre sin red` | CA 4 y 5 de US-011-02 | `auth.access.service.spec.ts` | unit |
| `US-011-03 icono de perfil, estado sin cuenta/con cuenta y atrás` | CA 1, 2 y 5 de US-011-03 | `tasks-list.spec.ts`, `account-screen.spec.ts` | unit |
| `US-011-03 cerrar sesión deja sesión anónima nueva y cancela alarmas` | CA 3 y 4 de US-011-03 | `auth.access.service.spec.ts`, `alarms.access.service.spec.ts` | unit |
| `US-011-05 cambiar contraseña pide la actual, aplica reglas y rechaza igual` | CA 1 y 2 de US-011-05 | `account.constructor.service.spec.ts`, `change-password.spec.ts` | unit |
| `US-011-06 borrar cuenta elimina cuenta y datos o no hace nada; anónima no ve la opción` | CA 1–4 de US-011-06 | `scripts/account-migration.test.mjs`, `account-screen.spec.ts` | estático + unit |
| `US-011-07 cambiar nombre pide contraseña y rechaza ocupado` | CA 1 y 2 de US-011-07 | `auth.access.service.spec.ts`, `change-username.spec.ts` | unit |
| `US-011-08 la tarjeta aparece tras la primera tarea, se descarta y no vuelve en 14 días` | CA 2 de US-011-08 | `account-reminder.spec.ts`, `tasks-list.spec.ts` | unit |
| `US-011-08 sin cuenta la app funciona igual y cambiar de identidad no muestra datos ajenos` | CA 1 y 3 de US-011-08 | `app.spec.ts`, `tasks.access.service.spec.ts` | unit |
| `e2e: crear cuenta, cerrar sesión, iniciar sesión (con y sin tareas anónimas), cambiar contraseña y borrar` | Flujos P1 y P2 completos | `cypress/e2e/cuenta.cy.ts`, `cypress/support/backend.ts` | e2e |

Si hay frontal: revisión visual en navegador con la extensión de Chrome (obligatoria, claro y oscuro, estados vacío, carga, error y foco, teclado) y comprobación en Android (emulador). Comprobación real contra el proyecto (`pnpm verify:account`, manual): alta, entrada, cambio de contraseña, traspaso de pendientes y borrado con usuarios de prueba que se eliminan al terminar.

---

## Ficheros afectados

**Crear** (por confirmar en `/sdd-plan`):
- `src/app/features/account/` (pantalla Cuenta, crear cuenta, iniciar sesión, cambiar contraseña, cambiar nombre de usuario, borrar cuenta y tarjeta de recordatorio), cada uno con su `*.constructor.service.ts` y `*.access.service.ts` donde toque
- `src/app/core/models/account.ts`
- `supabase/migrations/<marca>_account.sql` (borrado de cuenta y traspaso de tareas pendientes)
- `scripts/account-migration.test.mjs`, `scripts/verify-account.mjs`, `cypress/e2e/cuenta.cy.ts`

**Modificar:**
- `src/app/core/services/auth.access.service.ts` (+ spec) y `auth-error.util.ts` (errores de cuenta)
- `src/app/core/models/auth-session.ts` (nombre de usuario)
- `src/app/app.routes.ts` (+ spec): rutas de cuenta
- `src/app/features/tasks/tasks-list/*` (icono de perfil y tarjeta de recordatorio), `alarms.access.service.ts` (reconciliar y cancelar al cambiar de usuario)
- `cypress/support/backend.ts`: rutas de autenticación simuladas
- `docs/supabase.md`, `CLAUDE.md`, `specs/README.md`, `docs/interacciones.md`

**Supabase (con confirmación del usuario):**
- Configuración de autenticación del proyecto (sin confirmación de correo, longitud mínima de contraseña) y `db push` de la migración.

**Tauri / Android:** ninguno previsto.

---

## Modelo de datos

Sin tablas nuevas de datos de usuario (los datos ya cuelgan de `user_id` con borrado en cascada desde `auth.users`). Para el traspaso de tareas anónimas hará falta un **estado temporal** (por confirmar en `/sdd-plan`: p. ej. una tabla o una función que registre el vínculo entre la identidad anónima y la cuenta durante el inicio de sesión), con RLS por usuario si es una tabla. Funciones de servidor **por confirmar en `/sdd-plan`**:
- `delete_my_account()`: solo para usuarios no anónimos; borra al propio usuario y, por cascada, sus tareas, estadísticas y libro de XP. `revoke` a `public` y `anon`; `grant` solo a `authenticated`.
- Traspaso de tareas **pendientes** de la identidad anónima a la cuenta tras iniciar sesión (sin XP ni completadas).

Toda función con permisos elevados valida `auth.uid()`; ninguna acepta un `user_id` del cliente.

---

## Restricciones técnicas

- Solo `AuthAccessService` toca `supabase.auth`; las pantallas no. Patrón de 3 servicios, OnPush, Signals, standalone, sin `any`.
- **Ninguna contraseña ni token** se escribe en logs, errores, URLs, almacenamiento propio, repo, specs o capturas; la contraseña solo existe en el campo y en la llamada al servicio. Mensajes de error genéricos al iniciar sesión.
- No se recoge ni se muestra ningún correo; el identificador interno ficticio nunca sale a la interfaz ni se usa para enviar nada. Hay que comprobar en `/sdd-plan` que el servicio acepta ese formato y que no impide otras operaciones.
- `ready` sigue significando «hay identidad»: la app nunca se queda sin sesión (tras cerrar sesión o borrar, hay una anónima nueva).
- Cambiar de identidad cambia lo que ven todas las capas de datos (caché indexada por `userId()`), cancela y reconcilia las alarmas y reinicia el progreso mostrado, sin parpadeos de datos ajenos.
- Operaciones de cuenta con plazo propio (como las demás capas) y con explicación si no hay red.
- Cambios en el remoto (configuración de autenticación, `db push`) solo con confirmación explícita y tras comprobar la cuenta de la CLI de Supabase.
- Estilos con los tokens y mixins de la spec 010; zona táctil ≥ 44 px; campos con tipos de entrada y autocompletado correctos; teclado y zonas seguras considerados.
- Repo público: sin nombres de usuario ni contraseñas reales, claves ni identificadores del proyecto.

---

## Out of scope

- Correo electrónico en cualquier forma: registro, verificación, recuperación, notificaciones y cambio de correo.
- Recuperación del acceso (sin ella por decisión; ver US-011-04).
- Inicio de sesión con terceros (Google, Apple…) y con huella como credencial.
- Verificación en dos pasos (MFA).
- Enlaces mágicos y enlaces profundos (deep links) en Android.
- Perfil (nombre visible, foto), varias cuentas a la vez y compartir tareas entre cuentas.
- Sincronización en tiempo real entre dispositivos (al entrar se cargan los datos; no hay empuje en vivo).
- Panel de administración y borrado de cuentas de terceros.
- Fusionar XP y tareas completadas del móvil con la cuenta.
