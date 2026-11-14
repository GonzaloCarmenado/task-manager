# Plan 006 — Alarmas de tareas

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: [design/](./design/README.md), generado a partir de [stitch-prompt.md](./stitch-prompt.md)
**Estado**: Aprobado (2026-11-14)
**Fecha**: 2026-11-14

---

## Enfoque técnico

Las alarmas son **avisos locales del sistema** programados con `tauri-plugin-notification` (crate y paquete `2.8.1`, versión exacta, solo Android). Verificado en su código (2026-11-14): `sendNotification({ schedule: Schedule.at(fecha, false, true) })` programa con `AlarmManager` (hora exacta si el sistema lo permite y, si no, `setAndAllowWhileIdle`), el plugin trae su receptor de reinicio y expone `pending()` y `cancel(ids)`. Por tanto **no se escribe código nativo para programar ni para restaurar tras reiniciar**.

Lo que el plugin **no** hace y sí necesitamos: (1) declarar el permiso `SCHEDULE_EXACT_ALARM` en el manifiesto de la app y (2) abrir los ajustes de notificaciones y de «alarmas y recordatorios» del sistema. Se resuelve con un **pequeño plugin local de Tauri** (`src-tauri/plugins/app-settings`, Rust + una clase Kotlin) cuyo manifiesto Android declara el permiso (se fusiona con el de la app, así no se toca `gen/`) y que ofrece tres comandos: `can_schedule_exact_alarms`, `open_notification_settings` y `open_exact_alarm_settings`.

**Un solo servicio decide los avisos**: `AlarmsAccessService` observa las tareas del usuario (`TasksAccessService.tasks()`) y **reconcilia** el conjunto de avisos programados con el que corresponde: pendientes con fecha y hora futuras, los 60 más próximos, un aviso por tarea con identificador estable derivado del id de la tarea. Reconciliar (en lugar de reaccionar a cada operación) cubre crear, editar, completar, desmarcar, borrar y posponer sin duplicados, y se repite al abrir la app, al volver a primer plano y al cambiar el permiso. Sin identidad o fuera de Android no hace nada y no importa el plugin.

**Permiso en contexto**: al guardar una tarea con hora, el formulario pregunta a `AlarmsAccessService` si hay que mostrar el aviso previo; la preferencia local `{ deniedCount }` (0 a 3) decide si se vuelve a ofrecer. El permiso del sistema solo se pide tras pulsar **Permitir**. Nunca se pide al abrir la app.

---

## Ficheros afectados

| Ruta | Acción | Descripción |
|---|---|---|
| `src-tauri/Cargo.toml` | Modificar | `tauri-plugin-notification = "=2.8.1"` y el plugin local, ambos solo bajo Android |
| `src-tauri/src/lib.rs` | Modificar | Registrar ambos plugins solo en Android |
| `src-tauri/plugins/app-settings/**` | Crear | Plugin local: `Cargo.toml`, `build.rs`, `src/lib.rs`, `android/` (Kotlin + `AndroidManifest.xml` con `SCHEDULE_EXACT_ALARM`) |
| `src-tauri/capabilities/mobile.json` | Modificar | Añadir `notification:default` y los permisos del plugin local (solo Android, ventana `main`) |
| `package.json` | Modificar | `@tauri-apps/plugin-notification` `2.8.1` exacto y `@tauri-apps/api` alineado |
| `src/app/core/models/alarm.ts` | Crear | Tipos y constantes (`MAX_ALARMS = 60`, `MAX_DENIALS = 3`, `AlarmPermission`) |
| `src/app/core/services/alarms.access.service.ts` (+ spec) | Crear | Único contacto con los plugins: permiso, reconciliación, toque en la notificación, ajustes |
| `src/app/core/services/alarms.constructor.service.ts` (+ spec) | Crear | Qué tareas tienen alarma, identificador estable, textos de la notificación |
| `src/app/features/tasks/alarms/alarm-permission-prompt/` | Crear | Aviso previo («Te avisamos a tu hora»), Permitir / Ahora no |
| `src/app/features/tasks/alarms/alarms-banner/` | Crear | Aviso discreto «Alarmas desactivadas» con Activar alarmas y cerrar |
| `src/app/features/tasks/alarms/exact-alarm-sheet/` | Crear | Hoja de alarmas exactas |
| `src/app/features/tasks/tasks-list/` | Modificar | Banner e indicador «Avisará…» / «Sin alarma» |
| `src/app/features/tasks/task-form/` | Modificar | Tras guardar con hora, aviso previo si procede |
| `src/app/app.config.ts` | Modificar | Inicializador de `AlarmsAccessService` (reconciliación y escucha del toque) |
| `src/app/shared/components/icon/icon.ts` (+ spec) | Modificar | Iconos `bell`, `bell-off` |
| `scripts/capabilities.test.mjs` | Modificar | Permisos nuevos solo Android, versión exacta del plugin y plugin local solo Android |
| `docs/setup-android.md`, `CLAUDE.md` | Modificar | Alarmas, permisos y cómo probarlas en el emulador |

---

## Interfaces TypeScript

```typescript
// core/models/alarm.ts
export const MAX_ALARMS = 60;
export const MAX_DENIALS = 3;
export type AlarmPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type ExactAlarmState = 'allowed' | 'not-allowed' | 'not-needed' | 'unknown';

export interface AlarmPlan {
  readonly taskId: string;
  readonly notificationId: number; // entero estable derivado del id de la tarea
  readonly at: Date;               // instante local de la tarea
  readonly title: string;
  readonly body: string;           // «Es la hora (11:00)»
}

// alarms.constructor.service.ts
// plan(tasks: readonly Task[], now: Date): AlarmPlan[]        // pendientes con fecha y hora futuras, orden por hora, máx. 60
// notificationId(taskId: string): number                      // FNV-1a de 32 bits, positivo
// hasAlarm(task: Task, now: Date): boolean                    // para el indicador de la lista

// alarms.access.service.ts (señales públicas: permission, exactAlarm, bannerVisible, scheduledIds)
// initialize(): void
// shouldAskPermission(): boolean                              // sin conceder y deniedCount < 3
// requestPermission(): Promise<AlarmPermission>               // tras «Permitir»
// recordDenial(): void                                        // «Ahora no» o rechazo del sistema
// reconcile(): Promise<void>
// openNotificationSettings(): Promise<void>
// openExactAlarmSettings(): Promise<void>
```

**Notificación**: `id = notificationId`, `title = tarea.title`, `body = «Es la hora (HH:MM)»`, `channelId = 'reminders'` (importancia alta), `extra = { taskId }`, `schedule = Schedule.at(at, false, true)`. Un único canal `reminders` («Recordatorios») creado al inicializar.

**Preferencia local** (`localStorage`, clave `task-manager-alarms`): `{ deniedCount: number; bannerDismissedDay: string | null }`. Sin datos sensibles. Contenido corrupto → valores por defecto.

---

## Esquema SQL

Sin cambios en la base de datos: las alarmas se **derivan** de `due_date` + `due_time`.

---

## Pantallas

| Pantalla de Stitch | Componente | Datos / acciones / estados |
|---|---|---|
| `avisos-de-alarma` (aviso previo) | `AlarmPermissionPrompt` | Título y explicación; **Permitir** → permiso del sistema → programar; **Ahora no** → suma una negativa y muestra el banner. Aparece tras guardar con hora si `shouldAskPermission()` |
| `avisos-de-alarma` (alarmas exactas) | `ExactAlarmSheet` | Se ofrece una vez cuando el permiso de notificaciones está concedido y `exactAlarm === 'not-allowed'`; **Ir a ajustes** / **Omitir por ahora** (degrada a hora aproximada y se informa) |
| `lista-de-tareas` (banner) | `AlarmsBanner` | Visible si hay tareas con hora y el permiso no está concedido; **Activar alarmas** abre los ajustes; cerrar lo oculta ese día; desaparece solo al volver con el permiso concedido |
| `lista-de-tareas` (indicador) | `TasksList` | «Avisará a las HH:MM» con alarma programada; «Sin alarma» con hora y sin permiso; nada en el resto |
| `avisos-de-alarma` (notificación) | `AlarmsConstructorService` | Solo los **textos**: la notificación la dibuja Android |

Fuera de la implementación (ver `design/README.md`): simulador, cabeceras de «Misiones», barra inferior, botones de la notificación y texto de relleno. En navegador no se muestra ningún aviso ni indicador.

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `alarms.constructor.service.spec.ts` | Plan: solo pendientes con fecha y hora futuras (hora local), orden, máximo 60, sin duplicados; identificador estable y positivo; textos sin XP ni rachas | US-006-01, 03 |
| `alarms.access.service.spec.ts` | Reconciliación: programa, cancela y reprograma sin duplicados ante crear, editar, completar, desmarcar y borrar; cambio de hora; plugin simulado; permiso concedido, denegado y retirado al volver a primer plano; límite de 60; exacta no permitida → aproximada; toque en la notificación → navega a la tarea; en navegador no importa el plugin y no falla; nunca escribe en consola | US-006-01, 02 |
| `alarm-permission-prompt.spec.ts` | Textos, Permitir y Ahora no, `OnPush`; no aparece al abrir | US-006-02 |
| `alarms-banner.spec.ts` | Visibilidad, activar alarmas, cerrar, desaparece con permiso | US-006-02 |
| `exact-alarm-sheet.spec.ts` | Ir a ajustes y omitir | US-006-02 |
| `tasks-list.spec.ts`, `task-form.spec.ts` | Indicador, banner y aviso previo tras guardar con hora (hasta 3 veces) | US-006-02, 03 |
| `scripts/capabilities.test.mjs` | Permisos solo Android, versión exacta, plugin local solo Android | seguridad |

**Manual (emulador, obligatorio)**: permiso (conceder y denegar), aviso a la hora exacta con la app cerrada, tras **reiniciar** el emulador, cambio de zona horaria, tocar la notificación (con y sin bloqueo con huella), alarmas exactas concedidas y no, y 60 avisos. Revisión visual en navegador (claro y oscuro) con rutas de vista previa de desarrollo.

Cobertura objetivo ≥ 80 % en `alarms.access.service.ts`.

---

## Orden de implementación

1. Plugins nativos: dependencias con versión exacta, plugin local `app-settings`, capacidades y test de `capabilities` (Red → Green); compilar el APK y comprobar que arranca.
2. Modelo y `AlarmsConstructorService` (plan, id estable, textos).
3. `AlarmsAccessService`: permiso y preferencia local, después reconciliación y toque en la notificación.
4. Iconos y componentes: aviso previo, banner y hoja de alarmas exactas.
5. Integración en la lista, el formulario y `app.config.ts`.
6. Verificación en navegador y en el emulador (escenarios manuales); documentación.

---

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| El plugin local de ajustes (Kotlin) no compila o no abre el ajuste | Media | Probar en el emulador al principio (paso 1); si falla, el texto indica la ruta manual y la app sigue funcionando |
| El toque en la notificación no llega a la app con la app cerrada | Media | Verificar con `onAction` y el extra `taskId`; si falla, abrir en la lista |
| El sistema limita alarmas exactas o el ahorro de batería retrasa el aviso | Alta | Degradar a aproximada con aviso; `allowWhileIdle` activado |
| Colisión de identificadores (hash de 32 bits) | Muy baja | La reconciliación compara con `pending()` y reprograma lo que no coincide |
| Reinicio del móvil sin restaurar avisos | Baja | El plugin trae receptor de reinicio; además se reconcilia al abrir la app |
| Cambio de zona horaria o de hora | Media | Reconciliar al volver a primer plano |
