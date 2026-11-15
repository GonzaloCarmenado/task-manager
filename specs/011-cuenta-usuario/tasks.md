# Tasks 011 — Cuenta de usuario

**Plan**: [plan.md](./plan.md)
**Estado**: Aprobado
**Fecha**: 2026-11-14

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. **Fidelidad al diseño**: cada pantalla termina con una tarea de **medidas** (se miden en el navegador los valores de la tabla de «Pantallas» del plan) y otra de **comparación lado a lado** con su `screen.png`; no se da por terminada una pantalla con diferencias sin anotar. Todo lo que toca el remoto (panel de Supabase, `db push`, `verify:account`) lleva la nota «requiere confirmación del usuario» y antes se verifica la cuenta de la CLI por **id de organización**. Referencia del diseño: `specs/011-cuenta-usuario/design/`.

---

## Bloque 1 — Núcleo de identidad y spike (US-011-01, 02, 03, 05, 06, 07: parte técnica)

- [x] T-011-01: `core/models/account.ts` (`AccountErrorReason`, `AccountResult`, límites, `RuleView`, `LocalTasksSnapshot`) y `username` en `AuthSession` (`core/models/auth-session.ts`) *(solo tipos)*
- [x] T-011-02 (Red): `core/utils/username.spec.ts`: normaliza (minúsculas, recorta), `toInternalIdentifier`, `fromInternalIdentifier` (dominio ajeno, vacío, `null`, mayúsculas)
- [x] T-011-03 (Green): `core/utils/username.ts`
- [x] T-011-04 (Red): `core/services/auth-error.util.spec.ts`: `mapAccountError` por código (`invalid_credentials`, `user_already_exists`/`email_exists`, `weak_password`, `same_password`, 429, red, plazo, 401, desconocido) sin mensajes técnicos
- [x] T-011-05 (Green): `mapAccountError` en `core/services/auth-error.util.ts`
- [x] T-011-06 (Red): `auth.access.service.spec.ts`: `toAuthSession` rellena `username` desde el identificador interno (y `null` en anónimas o con dominio ajeno); el evento `USER_UPDATED` actualiza la sesión; un `SIGNED_OUT` esperado no escribe el aviso de «sesión rechazada» pero crea la sesión anónima
- [x] T-011-07 (Green): `auth.access.service.ts`: derivar `username`, manejar `USER_UPDATED` y la marca de cierre esperado
- [x] T-011-08 (Red): `auth.access.service.spec.ts` · `linkAccount`: llama a `updateUser` con el identificador interno y la contraseña, conserva el `user_id`, deja `isAnonymous = false` y `username`; mapea nombre ocupado, contraseña débil, red y plazo; no escribe en consola ni guarda la contraseña
- [x] T-011-09 (Green): `linkAccount` (si la vinculación exigiera dos llamadas, el spike lo decide)
- [x] T-011-10 (Red): `auth.access.service.spec.ts` · inicio de sesión en dos fases: `checkCredentials` usa un cliente sonda de la fábrica (`SUPABASE_CLIENT_FACTORY`) con almacenamiento en memoria y **no cambia la sesión**; `completeSignIn` aplica `setSession` y cambia `userId`; `cancelSignIn` descarta lo comprobado; credenciales incorrectas → `invalid-credentials`; los tokens no salen del servicio ni se loguean
- [x] T-011-11 (Green): `checkCredentials`, `completeSignIn`, `cancelSignIn`
- [x] T-011-12 (Red): `auth.access.service.spec.ts` · `signOut`: cierra, deja una sesión anónima nueva, `ready` vuelve a `true`, sin aviso de rechazo; fallo de red no deja la app sin identidad
- [x] T-011-13 (Green): `signOut`
- [x] T-011-14 (Red): `auth.access.service.spec.ts` · `changePassword`: re-autentica con la contraseña actual en la sonda y solo entonces actualizan; contraseña actual incorrecta no cambia nada; nombre ocupado; igual a la actual
- [x] T-011-15 (Green): `changePassword`
- [x] T-011-16 (Red): `auth.access.service.spec.ts` · `deleteOwnAccount`: re-autentica, llama a `rpc('delete_my_account')` y, solo si va bien, cierra y crea sesión anónima nueva; si falla no cambia nada; una sesión anónima se rechaza sin llamar al servidor
- [x] T-011-17 (Green): `deleteOwnAccount`
- [x] T-011-18 (Red): `scripts/account-migration.test.mjs`: `delete_my_account` existe, `security definer`, `set search_path`, comprueba usuario anónimo y nulo, sin parámetros, `revoke … from public, anon`, `grant … to authenticated`, sin `drop table` ni `truncate`, rollback documentado
- [x] T-011-19 (Green): `supabase/migrations/<marca>_account.sql` *(solo local; no se sube todavía)*
- [x] T-011-20: `scripts/verify-account.mjs` y script `verify:account` en `package.json` (manual, remoto; usuarios de prueba con prefijo propio que se borran al terminar; solo imprime nombres de comprobación y OK/FALLO)
- [x] T-011-21 (Refactor): limpiar `AuthAccessService` con los tests en verde; cobertura ≥ 80 %
- [x] T-011-22: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-011-23 *(requiere confirmación del usuario)*: el propietario ajusta en el panel de Supabase **«Confirm email» desactivado** y **longitud mínima de contraseña 8** (no se usa `config push`); documentar los pasos sin ids ni URLs
- [x] T-011-24 *(requiere confirmación del usuario)*: verificar la cuenta de la CLI por **id de organización**, `pnpm db:push:dry`, mostrar la migración y `pnpm db:push --yes`
- [x] T-011-25 *(requiere confirmación del usuario)*: ejecutar `pnpm verify:account` (spike): identificador interno aceptado, vincular conserva el `user_id`, entrar en otro cliente, cambiar contraseña y nombre, borrar y fallo de anónimo. **Si algo falla, parar y revisar el plan antes de seguir**
- [x] T-011-26: `docs/supabase.md`: sección de cuenta (identificador interno, ajustes remotos, `delete_my_account`, sin recuperación) y estado de migraciones

---

## Bloque 2 — Base visual compartida (US-011-01, 02, 03)

- [x] T-011-27 (Red): `scripts/design-tokens.test.mjs`: tokens nuevos del plan (`--color-surface-highest`, `--color-inverse-surface`/`-on-surface`, `--color-tertiary-soft-dim`, `--color-on-primary-soft-strong`, `--glass-bar`, tintes, velos, sombras nuevas) con los valores claros del diseño, definidos en oscuro, y contraste AA de los pares nuevos
- [x] T-011-28 (Green): `src/styles/_tokens.scss`: tokens nuevos en claro y oscuro
- [x] T-011-29 (Red): `shared/components/icon/icon.spec.ts`: existen los iconos nuevos (`arrow-left`, `arrow-right`, `person`, `at`, `id-card`, `key`, `eye`, `eye-off`, `check-circle`, `circle`, `alert-circle`, `user-plus`, `x`), la entrada `filled` rellena el icono, sigue sin recursos externos
- [x] T-011-30 (Green): `icon.ts`: entrada `filled` y los iconos del T-011-29
- [x] T-011-31 (Red): `icon.spec.ts`: iconos de cuenta (`shield-user`, `lock-reset`, `phone-lock`, `shield`, `cloud-sync`, `cloud-up`, `cloud-check`, `log-in`, `log-out`, `badge-check`, `verified-user`, `swap`, `list-plus`, `info`, `trash-sweep`, `bolt`, `chevron-right` existente)
- [x] T-011-32 (Green): `icon.ts`: los iconos del T-011-31
- [x] T-011-33: revisión visual de los iconos nuevos en una vista previa (rejilla, claro y oscuro) comparados con los glifos de las capturas; ajustar trazo y proporciones
- [x] T-011-34 (Red): `account.constructor.service.spec.ts`: `usernameRules`, `passwordRules` (incluida «distinta de la actual»), `matchState`, `errorText` por contexto y todos los textos fijos de las pantallas del plan
- [x] T-011-35 (Green): `features/account/account.constructor.service.ts`
- [x] T-011-36 (Red): `shared/account-header.spec.ts`: título, botón atrás con nombre accesible y zona 44, círculo decorativo `aria-hidden`
- [x] T-011-37 (Green): `AccountHeader` (fija, desenfoque, 64, zona segura, medidas del plan)
- [x] T-011-38 (Red): `shared/account-field.spec.ts`: etiqueta con icono, indicación, contador, entrada con `autocomplete`/`autocapitalize`/`spellcheck` configurables, mostrar/ocultar contraseña con `aria-label`, reglas y error, foco con anillo, dos variantes (píldora de 48 en tarjeta, bloque de 56 con icono)
- [x] T-011-39 (Green): `AccountField` (`model()` de valor; variantes `card` y `block`)
- [x] T-011-40 (Red): `shared/rule-list.spec.ts` y `shared/offline-banner.spec.ts`: estados `idle/ok/error` con icono y color de rol; banner con título, texto y «Reintentar ahora» que emite
- [x] T-011-41 (Green): `RuleList` y `OfflineBanner`
- [x] T-011-42 (Red): `shared/account-toast.spec.ts`: el servicio publica un aviso con icono y texto, desaparece a los 2,8 s (con `CLOCK`/temporizador simulado), `role="status"`; variante de éxito de Crear cuenta
- [x] T-011-43 (Green): `AccountToastService` y `AccountToast` (montado en `app.html`)
- [x] T-011-44 (Red): `shared/overlay-back.spec.ts`: añade una entrada al historial y cierra con `popstate`; al destruirse sin haber retrocedido, retrocede (mismo patrón que `PostponeSheet`)
- [x] T-011-45 (Green): `OverlayBack` (servicio o función de ayuda en contexto de inyección)
- [x] T-011-46: vistas previas `__dev/account/<pantalla>/<estado>` (`features/dev/account-preview.ts` + spec, ruta solo en desarrollo) con datos de ejemplo y sin backend
- [x] T-011-47 (Refactor): limpiar los componentes compartidos con los tests en verde
- [x] T-011-48: **medidas** de cabecera, tarjeta de campo y entrada (alto 64/44/32, 48, radio, relleno, sombra) en el navegador frente a la tabla del plan; **comparación** con los recortes de `crear-cuenta/screen.png`; claro y oscuro; consola limpia
- [x] T-011-49: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde

---

## Bloque 3 — Cuenta, cerrar sesión y botón de perfil (US-011-03, P1)

- [x] T-011-50 (Red): `account.access.service.spec.ts`: `isAnonymous` y `username` derivados de la sesión; `signOut` delega, vacía la caché del usuario saliente de la vista y devuelve el resultado
- [x] T-011-51 (Green): `features/account/account.access.service.ts` (parte de sesión y cierre)
- [x] T-011-52 (Red): `account-screen.spec.ts` · sin cuenta: título, texto de datos locales, «Crear cuenta gratuita» (→ `/cuenta/crear`) e «Ya tengo cuenta, iniciar sesión» (→ `/cuenta/entrar`), pie «opcional y sin correo», atrás vuelve a la lista, sin racha ni XP
- [x] T-011-53 (Green): `AccountScreen` sin cuenta: tarjeta de estado, mascota con rebote, píldora con pulso, tarjeta «¿Cambias de móvil pronto?», acciones de 54/50 (html y scss con las medidas del plan)
- [x] T-011-54 (Red): `account-screen.spec.ts` · con cuenta: tarjeta de usuario con `@usuario`, aviso «guardados en tu cuenta», filas «Cambiar contraseña» y «Cerrar sesión» con sus destinos, zona de peligro con «Borrar cuenta y datos» (→ `/cuenta/borrar`), una sesión anónima no ve los ajustes ni la zona de peligro
- [x] T-011-55 (Green): `AccountScreen` con cuenta: avatar con anillo, panel de ajustes, divisores, zona de peligro
- [x] T-011-56 (Red): `account-logout-dialog.spec.ts`: rol `alertdialog`, textos, «Sí, cerrar sesión» cierra y avisa «Sesión cerrada», «Cancelar» y el botón atrás cierran sin cambios
- [x] T-011-57 (Green): `AccountLogoutDialog` (velo con desenfoque, caja inferior, entrada animada)
- [x] T-011-58: rutas `cuenta` (y las demás con su pantalla vacía provisional) antes de `:id` en `app.routes.ts` + `app.routes.spec.ts` (rutas de producción incluyen las de cuenta)
- [x] T-011-59 (Red): `profile-button.spec.ts` y `tasks-list.spec.ts`: el botón de perfil en la cabecera de la lista, zona 44, círculo 36, `aria-label="Cuenta"`, abre `/cuenta`
- [x] T-011-60 (Green): `ProfileButton` e integración en `tasks-list` (cabecera con el título «Tareas» a la izquierda)
- [x] T-011-61: `cypress/support/backend.ts`: varios usuarios, tokens por usuario, `POST /auth/v1/token?grant_type=password`, `PUT /auth/v1/user`, `POST /auth/v1/logout` y errores con sus códigos; las e2e existentes siguen en verde
- [x] T-011-62 (Red→Green): `cypress/e2e/cuenta.cy.ts` · cerrar sesión: lista vacía y sin cuenta tras cerrar, los datos reaparecen al volver a entrar (requiere el bloque 5), atrás de Android cierra el diálogo
- [x] T-011-63 (Refactor): limpiar con los tests en verde
- [x] T-011-64: **medidas** de la pantalla Cuenta (cabecera, tarjetas, mascota 96/36, botones 54/50, filas 40, divisores, zona de peligro, botón 48, diálogo 48/48) frente al plan; **comparación** lado a lado con `cuenta/screen.png` y con el HTML (estado «con cuenta» y diálogo, que no tienen captura); claro y oscuro; consola limpia
- [x] T-011-65: **medidas** del botón de perfil y de la lista con él frente a `lista-con-recordatorio-de-cuenta/screen.png`
- [x] T-011-66: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` y `pnpm e2e` en verde

---

## Bloque 4 — Crear cuenta (US-011-01, P1)

- [x] T-011-67 (Red): `account.access.service.spec.ts` · `createAccount`: valida antes de llamar, vincula con `AuthAccessService.linkAccount`, conserva tareas y progreso (mismo `userId`), mapea ocupado/débil/red, devuelve el resultado
- [x] T-011-68 (Green): `AccountAccessService.createAccount`
- [x] T-011-69 (Red): `create-account.spec.ts` · formulario: tres campos con sus iconos, contador `0/24` en vivo, reglas que pasan de gris a verde/rojo al tocar, «Mín. 8», estado «Sin verificar / Coinciden / No coinciden», mensajes de error al perder el foco o al enviar, mostrar/ocultar contraseña, `autocomplete` correctos
- [x] T-011-70 (Green): `CreateAccount`: estructura y lógica de formulario con `AccountField` y `RuleList`
- [x] T-011-71 (Red): `create-account.spec.ts` · aviso y botón: el botón está deshabilitado con errores o sin casilla; habilitado solo con todo válido y marcada; texto de la casilla y frase en negrita; doble pulsación bloqueada
- [x] T-011-72 (Green): `CreateAccount`: bloque de aviso con casilla, acciones (deshabilitado/habilitado/cargando «Creando tu cuenta…») y «Cancelar y volver»
- [x] T-011-73 (Red): `create-account.spec.ts` · estados: nombre no disponible, sin conexión con banner y «Reintentar ahora» (conserva lo escrito), éxito (aviso «¡Cuenta creada con éxito!… Tus tareas y tu progreso siguen aquí.» y vuelta a Cuenta con cuenta), atrás conserva lo escrito
- [x] T-011-74 (Green): `CreateAccount`: estados, tarjeta ilustrada, banner y aviso de éxito
- [x] T-011-75 (Red→Green): `cypress/e2e/cuenta.cy.ts` · crear cuenta: reglas en vivo, botón deshabilitado hasta la casilla, nombre ocupado, sin conexión, éxito conservando tareas y XP, sesión tras recargar
- [x] T-011-76 (Refactor): limpiar con los tests en verde
- [x] T-011-77: **medidas** (cabecera, banner, tarjeta ilustrada 56/24, tarjetas de campo, entradas 48 y radio total, reglas 16/10/4, bloque de aviso 28/24, botones 52/44, aviso de éxito) frente al plan; **comparación** lado a lado con `crear-cuenta/screen.png` y con el HTML en cada estado (normal, errores, cargando, sin conexión); claro y oscuro; teclado virtual en el emulador más adelante
- [x] T-011-78: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` y `pnpm e2e` en verde

---

## Bloque 5 — Iniciar sesión y tareas de este móvil (US-011-02, P1)

- [ ] T-011-79 (Red): `account.access.service.spec.ts` · `localTasks`: instantánea de pendientes y número de completadas de la identidad anónima; vacía si la sesión no es anónima
- [ ] T-011-80 (Green): `localTasks` en `AccountAccessService`
- [ ] T-011-81 (Red): `account.access.service.spec.ts` · `startSignIn`: comprueba credenciales sin cambiar de identidad, captura la instantánea, errores genéricos y límite; `cancelSignIn` deja la sesión anónima intacta
- [ ] T-011-82 (Green): `startSignIn` y `cancelSignIn`
- [ ] T-011-83 (Red): `account.access.service.spec.ts` · `finishSignIn('merge')`: completa el inicio de sesión y recrea **solo las pendientes** en la cuenta (sin XP ni completadas), guarda el buffer, lo borra al acabar, reintenta sin duplicar tras un fallo parcial; `'discard'` y `'none'` no recrean nada
- [ ] T-011-84 (Green): `finishSignIn` y traspaso con buffer en `localStorage`
- [ ] T-011-85 (Red): `account.access.service.spec.ts` · `resumePendingTransfer`: reanuda un buffer pendiente al arrancar con sesión de cuenta y no hace nada si no hay buffer o la sesión es anónima
- [ ] T-011-86 (Green): `resumePendingTransfer` y su llamada desde `app.ts`
- [ ] T-011-87 (Red): `sign-in.spec.ts` · formulario: bloque de bienvenida («RECUPERA TU NIVEL», «Bienvenido de nuevo»), entradas de 56 con iconos `id-card`/`lock`, «Identificador único», mostrar/ocultar, **sin** enlace de recuperación ni textos de seguridad, «Iniciar sesión» y «Cancelar», aviso «Acceso no válido» y de límite de intentos, banner sin conexión
- [ ] T-011-88 (Green): `SignIn`: formulario, errores y estados
- [ ] T-011-89 (Red): `local-tasks-sheet.spec.ts`: rol `dialog`/`aria-modal`; solo aparece con pendientes; cabecera, caja de recuento con N y «Pendientes», opción A (seleccionable con anillo, texto con N y nota de XP/completadas), opción B, «Traer tareas y continuar», «Cancelar inicio de sesión» y botón atrás cancelan
- [ ] T-011-90 (Green): `LocalTasksSheet` (hoja inferior con asa, velo con desenfoque, opciones)
- [ ] T-011-91 (Red): `discard-confirm.spec.ts`: rol `alertdialog`, N tareas, «Sí, descartar tareas locales» descarta y entra, «Volver a opciones» vuelve; variante derivada para solo completadas
- [ ] T-011-92 (Green): `DiscardConfirm`
- [ ] T-011-93 (Red→Green): `sign-in.spec.ts` · flujo: sin tareas locales entra directo a la lista; con pendientes → hoja → traer → aviso «Tareas añadidas a tu cuenta»; usar solo la cuenta → confirmación → «Sesión iniciada»; cancelar en cualquier punto deja la sesión anónima y los datos intactos
- [ ] T-011-94 (Red→Green): `cypress/e2e/cuenta.cy.ts` · iniciar sesión: error genérico, límite, sin tareas locales, con pendientes (se traen sin XP), usar solo la cuenta, cancelar, los datos de la cuenta se ven al entrar y no se ven datos ajenos
- [ ] T-011-95 (Refactor): limpiar con los tests en verde
- [ ] T-011-96: **medidas** de Iniciar sesión (tarjeta de bienvenida 56, entradas 56 con radio 16, botones 52, aviso de error 36, hoja con asa 48×6 y radio superior 24, tarjetas de opción, caja de recuento, nota, botones 52/44, confirmación 56/50/46) frente al plan; **comparación** con `iniciar-sesion-y-tareas-de-este-movil/screen.png` y con el HTML de la hoja y de la confirmación (sin captura); claro y oscuro
- [ ] T-011-97: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` y `pnpm e2e` en verde

---

## Bloque 6 — Recordatorio e identidad sin datos ajenos (US-011-08, P1)

- [ ] T-011-98 (Red): `account.access.service.spec.ts` · `reminderVisible`: solo anónimo, con al menos una tarea completada alguna vez y fuera del aplazamiento; `snoozeReminder` aplaza 14 días con `CLOCK`; recargar conserva el aplazamiento; sin red sigue visible
- [ ] T-011-99 (Green): recordatorio en `AccountAccessService`
- [ ] T-011-100 (Red): `account-reminder.spec.ts`: etiqueta, título, texto, «Crear cuenta» (→ `/cuenta/crear`), el aspa y «En 14 días» ocultan la tarjeta con nombres accesibles, no hay otros botones
- [ ] T-011-101 (Green): `AccountReminder` e integración bajo el resumen de nivel en `tasks-list`
- [ ] T-011-102 (Red): `progress.access.service.spec.ts` y `alarms.access.service.spec.ts`: al cambiar de `userId` se limpian celebración y subida de nivel pendientes; al cerrar sesión se cancelan las alarmas y al entrar se reconcilian con las de la cuenta
- [ ] T-011-103 (Green): limpieza en `ProgressAccessService` y ajuste de `AlarmsAccessService` si hiciera falta
- [ ] T-011-104 (Red→Green): `cypress/e2e/cuenta.cy.ts` · recordatorio: aparece tras completar la primera tarea, el aspa lo oculta, «En 14 días» lo oculta y con `cy.clock` vuelve a los 14 días; la app sin cuenta funciona igual; cambiar de identidad nunca muestra datos ajenos
- [ ] T-011-105 (Refactor): limpiar con los tests en verde
- [ ] T-011-106: **medidas** de la tarjeta de recordatorio (tesela 40, aspa 32, botón 46, radio 24, sombra, textos) frente al plan y **comparación** con `lista-con-recordatorio-de-cuenta/screen.png`; claro y oscuro; la lista sigue sin solapes
- [ ] T-011-107: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` y `pnpm e2e` en verde

---

## Bloque 7 — Cambiar contraseña y borrar cuenta (US-011-05 y 06, P2)

- [ ] T-011-108 (Red): `account.access.service.spec.ts` · `changePassword` y `deleteAccount`: validan, delegan en `AuthAccessService`, no cambian nada si falla; tras borrar se limpian cachés, alarmas y buffers
- [ ] T-011-109 (Green): `changePassword` y `deleteAccount` en `AccountAccessService`
- [ ] T-011-110 (Red): `change-password.spec.ts`: tres tarjetas (actual, nueva con tres reglas, repetir), contraseña actual incorrecta, rechazo de igual a la actual y de débil, cargando «Cambiando tu contraseña…», éxito con aviso «Contraseña cambiada» y vuelta a Cuenta, sin conexión
- [ ] T-011-111 (Green): `ChangePassword` (derivada de Crear cuenta)
- [ ] T-011-112 (Red): `delete-account.spec.ts`: caja de peligro, tarjeta de contraseña, bloque de confirmación con casilla, botón deshabilitado hasta casilla y contraseña, cargando «Borrando tu cuenta…», contraseña incorrecta, error del servidor «No se ha borrado nada», éxito con aviso «Cuenta eliminada» y vuelta a la lista sin cuenta
- [ ] T-011-113 (Green): `DeleteAccount` (derivada de Crear cuenta y de la zona de peligro)
- [ ] T-011-114 (Red→Green): `cypress/e2e/cuenta.cy.ts` · cambiar contraseña (la antigua deja de valer) y borrar cuenta (datos eliminados, sesión anónima nueva, sin alarmas)
- [ ] T-011-115 (Refactor): limpiar con los tests en verde
- [ ] T-011-116: **medidas y comparación** de las dos pantallas derivadas contra Crear cuenta y contra la zona de peligro de Cuenta (mismos valores de tarjeta, campo, bloque de aviso y botones); claro y oscuro
- [ ] T-011-117: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` y `pnpm e2e` en verde

---

## Bloque 8 — Cambiar nombre de usuario (US-011-07) — DESCARTADO

El spike mostró que el servicio no permite cambiar el identificador (`email_address_invalid`). Sin tareas; `changeUsername` y su test se eliminaron del Bloque 1.

---

## Bloque 9 — Cierre y verificación (todas las historias)

- [ ] T-011-126: `cypress/e2e/cuenta-fidelidad.cy.ts`: a 390×844, medidas de cada pantalla frente a la tabla del plan (cabecera 64, atrás 44, entradas 48/56, botones 52/54/50/48/46/44, tarjetas, radios, iconos, tamaños de texto) y que no hay referencias a fuentes externas
- [ ] T-011-127: `pnpm e2e` completo en verde (las 42 anteriores más las de cuenta)
- [ ] T-011-128: recorrido completo en navegador (390×844, claro y oscuro) de **todas** las pantallas y estados, comparando cada una con su `screen.png`/HTML: anotar y corregir cualquier diferencia; consola limpia; objetivos táctiles ≥ 44 px
- [ ] T-011-129: `pnpm build` sin avisos nuevos y comprobar el presupuesto de tamaño (los iconos nuevos y los componentes)
- [ ] T-011-130 *(manual)*: emulador Android (arranque en frío, claro y oscuro): cabecera fija con la barra de estado, **teclado virtual** que no tape campo ni botón, botón atrás de Android en formularios y diálogos, crear cuenta, cerrar sesión, iniciar sesión con tareas locales y borrar cuenta; alarmas al cambiar de identidad
- [ ] T-011-131 *(requiere confirmación del usuario)*: `pnpm verify:account` final contra el proyecto y borrado de los usuarios de prueba
- [ ] T-011-132: `docs/setup-android.md` y `CLAUDE.md` (reglas de cuenta: identificador interno, sin recuperación, solo `AuthAccessService` toca la autenticación, dos fases de inicio de sesión)
- [ ] T-011-133: `specs/011-cuenta-usuario/review.md` con lo comprobado, las discrepancias diseño ↔ comportamiento y lo detectado fuera de alcance; estado de la spec a Implementada y fila del `README`
- [ ] T-011-134: pedir confirmación antes de cada commit, push y apertura o actualización de PR

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar (≥ 80 % en `AuthAccessService` y `AccountAccessService`)
- [ ] `pnpm e2e` en verde (incluida `cuenta-fidelidad.cy.ts`)
- [ ] Criterios P1 de `spec.md` verificados (US-011-01, 02, 03 y 08)
- [ ] Cada pantalla comparada lado a lado con su `screen.png`/HTML, con las diferencias anotadas o corregidas
- [ ] Revisión visual en navegador con la extensión de Chrome, en claro y en oscuro
- [ ] Comprobado en el emulador Android (arranque en frío, claro y oscuro, teclado y botón atrás)
- [ ] Migración aplicada y `verify:account` en verde, con usuarios de prueba borrados
- [ ] Ningún correo, contraseña, token ni identificador del proyecto en repo, logs ni capturas
- [ ] Confirmación del usuario antes de cada commit, push y de todo lo que toque el remoto
