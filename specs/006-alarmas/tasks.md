# Tasks 006 — Alarmas de tareas

**Plan**: [plan.md](./plan.md)
**Estado**: Pendiente
**Fecha**: 2026-11-14

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que Stitch añada y no esté en la spec se ignora (ver `design/README.md`). Las tareas marcadas *(manual)* se hacen en el emulador.

---

## Bloque 1 — Plugins nativos y permisos (US-006-01, 02)

- [x] T-006-01 (Red): `scripts/capabilities.test.mjs`: `notification:default` y los permisos del plugin local solo en `mobile.json` (plataforma `android`, ventana `main`); `tauri-plugin-notification = "=2.8.1"` y el plugin local solo bajo Android en `Cargo.toml`; `@tauri-apps/plugin-notification` `2.8.1` exacto en `package.json`
- [x] T-006-02: `package.json`: `@tauri-apps/plugin-notification` `2.8.1` exacto y `@tauri-apps/api` alineado; `pnpm install`; revisar que no entra nada más y que `pnpm audit` no empeora
- [x] T-006-03 (Green): `src-tauri/Cargo.toml` y `src-tauri/src/lib.rs`: el plugin de notificaciones y el local, solo Android
- [x] T-006-04: plugin local `src-tauri/plugins/app-settings/` (`Cargo.toml`, `build.rs`, `src/lib.rs`, `android/` con Kotlin y `AndroidManifest.xml` que declara `SCHEDULE_EXACT_ALARM`): comandos `can_schedule_exact_alarms`, `open_notification_settings` y `open_exact_alarm_settings`
- [x] T-006-05 (Green): `src-tauri/capabilities/mobile.json` con los permisos nuevos; el test del T-006-01 en verde
- [x] T-006-06 *(manual)*: compilar el APK x86_64 y comprobar que arranca con los dos plugins y que el manifiesto fusionado contiene `SCHEDULE_EXACT_ALARM`, `POST_NOTIFICATIONS` y el receptor de reinicio

---

## Bloque 2 — Modelo y `AlarmsConstructorService` (US-006-01, 03)

- [x] T-006-07: `core/models/alarm.ts` (`MAX_ALARMS`, `MAX_DENIALS`, `AlarmPermission`, `ExactAlarmState`, `AlarmPlan`) *(solo tipos; lo cubren los tests de los servicios)*
- [x] T-006-08 (Red): `alarms.constructor.service.spec.ts`: el plan solo incluye tareas pendientes con fecha y hora **futuras** (hora local, también 23:59 y 00:01); excluye sin hora, sin fecha, completadas y pasadas; orden por hora; máximo 60
- [x] T-006-09 (Green): `plan()` en `core/services/alarms.constructor.service.ts`
- [x] T-006-10 (Red): identificador de notificación estable, positivo y distinto para ids distintos; `hasAlarm()`
- [x] T-006-11 (Green): `notificationId()` (FNV-1a de 32 bits) y `hasAlarm()`
- [x] T-006-12 (Red): textos de la notificación («Es la hora (HH:MM)») y de los avisos, sin XP, rachas ni términos técnicos
- [x] T-006-13 (Green): textos
- [x] T-006-14 (Refactor): limpiar con los tests en verde

---

## Bloque 3 — `AlarmsAccessService` (US-006-01, 02)

- [x] T-006-15 (Red): `alarms.access.service.spec.ts` (plugins simulados): fuera de Android no se importa el plugin, no falla y `permission = 'unsupported'`; nada en consola
- [x] T-006-16 (Green): servicio con `import()` dinámico solo en Android
- [x] T-006-17 (Red): permiso: `shouldAskPermission()` según el estado y `deniedCount`; `requestPermission()` concedido y rechazado; `recordDenial()` hasta 3; preferencia local con contenido corrupto → valores por defecto
- [x] T-006-18 (Green): permiso y preferencia (`task-manager-alarms`)
- [x] T-006-19 (Red): reconciliación: programa lo que falta, cancela lo que sobra y reprograma lo que cambió de hora, sin duplicados, ante crear, editar, completar, desmarcar y borrar; máximo 60; con `allowWhileIdle`; canal `reminders`; sin permiso no programa nada
- [x] T-006-20 (Green): `reconcile()` con `pending()` y `cancel()`; efecto que observa las tareas del usuario
- [x] T-006-21 (Red): reconciliar al abrir, al volver a primer plano y al cambiar el permiso; el permiso retirado cancela todo; cambio de hora/zona
- [x] T-006-22 (Green): ciclo de vida
- [x] T-006-23 (Red): alarmas exactas: `exactAlarm` según el sistema; si no se permiten, se programa aproximada y se informa
- [x] T-006-24 (Green): `can_schedule_exact_alarms` y degradación
- [x] T-006-25 (Red): tocar la notificación navega a la tarea (`extra.taskId`); con la app bloqueada, el bloqueo sigue encima
- [x] T-006-26 (Green): escucha del toque
- [x] T-006-27 (Red): `openNotificationSettings()` y `openExactAlarmSettings()` llaman al plugin local; si fallan, no lanzan
- [x] T-006-28 (Green): ajustes del sistema
- [x] T-006-29 (Refactor): limpiar y cobertura ≥ 80 % de `alarms.access.service.ts`

---

## Bloque 4 — Iconos y componentes (US-006-02, 03)

- [x] T-006-30 (Red): iconos `bell` y `bell-off` en `Icon` (`icon.spec.ts`)
- [x] T-006-31 (Green): SVG propios
- [x] T-006-32 (Red): `alarm-permission-prompt.spec.ts`: título, explicación, **Permitir** y **Ahora no** emiten; accesible; sin elementos de prototipo; `OnPush`
- [x] T-006-33 (Green): `AlarmPermissionPrompt` (`.ts`, `.html`, `.scss`)
- [x] T-006-34 (Red): `alarms-banner.spec.ts`: visible solo con tareas con hora y sin permiso; **Activar alarmas** y cerrar emiten; desaparece con el permiso
- [x] T-006-35 (Green): `AlarmsBanner`
- [x] T-006-36 (Red): `exact-alarm-sheet.spec.ts`: **Ir a ajustes** y **Omitir por ahora**; texto de que puede retrasarse unos minutos
- [x] T-006-37 (Green): `ExactAlarmSheet`
- [x] T-006-38 (Refactor): limpiar

---

## Bloque 5 — Integración (US-006-01, 02, 03)

- [x] T-006-39 (Red): `tasks-list.spec.ts`: banner de alarmas desactivadas; indicador «Avisará a las HH:MM» con alarma y «Sin alarma» con hora y sin permiso; nada en navegador
- [x] T-006-40 (Green): lista con banner e indicador
- [x] T-006-41 (Red): `task-form.spec.ts`: tras guardar con hora aparece el aviso previo si procede (hasta 3 veces); **Permitir** pide el permiso y **Ahora no** suma una negativa; sin hora no aparece; nunca al abrir
- [x] T-006-42 (Green): formulario
- [x] T-006-43 (Red): `app.config.spec.ts`: el inicializador arranca `AlarmsAccessService` sin esperar a la red
- [x] T-006-44 (Green): `provideAppInitializer` de las alarmas

---

## Bloque 6 — Verificación y cierre

- [x] T-006-45 *(manual; sin verificar: zona horaria, 60 avisos y toque con huella — ver `review.md`)*: emulador: conceder y denegar el permiso; aviso a la hora **con la app cerrada**; tras **reiniciar** el emulador; cambio de zona horaria; tocar la notificación (con y sin bloqueo con huella); alarmas exactas concedidas y no; 60 avisos
- [x] T-006-46: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-006-47: revisión visual en navegador con la extensión de Chrome (claro y oscuro): aviso previo, banner, indicadores y hoja exacta (rutas de vista previa de desarrollo); área táctil, sin scroll horizontal, consola limpia
- [x] T-006-48: `docs/setup-android.md` (alarmas, permisos, emulador), regla en `CLAUDE.md`, marcar la spec como Implementada, actualizar `specs/README.md` y el log

---

## Checklist de cierre

- [x] `pnpm lint:fix && pnpm format` sin errores
- [x] `pnpm secrets:check` sin hallazgos
- [x] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar
- [x] Criterios P1 de `spec.md` verificados (US-006-01 y 02)
- [x] Revisión visual en navegador con la extensión de Chrome
- [x] Comprobado en el emulador (aviso con la app cerrada y tras reiniciar)
- [x] Confirmación del usuario antes de cada commit y push
