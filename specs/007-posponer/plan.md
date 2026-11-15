# Plan 007 — Posponer tareas

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: [design/](./design/README.md), generado a partir de [stitch-prompt.md](./stitch-prompt.md)
**Estado**: Aprobado (2026-11-14)
**Fecha**: 2026-11-14

---

## Enfoque técnico

Posponer es **un cambio de fecha y hora con reglas** sobre la tarea, apoyado en `TasksAccessService` (spec 005). Las reglas viven en un servicio de configuración puro, `PostponeConstructorService`, que dado una tarea y «ahora» devuelve las **opciones válidas** con su fecha y hora resultantes: *Más tarde hoy (+1 hora)*, *Mañana*, *La semana que viene* y el mínimo de *Elegir fecha*. Una opción solo se ofrece si da una fecha y hora **estrictamente posteriores** a las actuales de la tarea; así «posponer» nunca mueve hacia atrás. Todo en hora local (`YYYY-MM-DD` y `HH:MM` construidos a mano).

`TasksAccessService.postpone(id, destino)` aplica el cambio de forma **optimista** (como completar y borrar), con reversión si falla, plazo de 8 s y el mismo contador de cambios en vuelo que evita que una recarga lo pise. Guarda `due_date`, `due_time` y `postponed_count`; el contador sube **solo si la tarea ya tenía fecha** y pasa a algo posterior (ponerle fecha a una tarea sin fecha no cuenta; editar a mano en el formulario tampoco).

La hoja `PostponeSheet` es un componente presentacional que se usa desde la **lista** (botón en cada fila pendiente) y desde el **formulario de edición**. Para que el aviso «Tarea pospuesta a …» sobreviva al cerrar el formulario, el aviso pasa a un servicio raíz pequeño, `TasksNoticeService`, que la lista ya usaba de forma local (refactor sin cambio de comportamiento, con sus tests). **Las alarmas no se tocan aquí**: la 006 reconcilia los avisos cuando cambian las tareas, así que posponer reprograma el aviso sin código propio (US-007-03 se verifica con esa reconciliación).

---

## Ficheros afectados

| Ruta | Acción | Descripción |
|---|---|---|
| `supabase/migrations/<marca>_tasks_postponed_count.sql` | Crear | Columna `postponed_count` con valor por defecto y restricción |
| `scripts/postpone-migration.test.mjs` | Crear | Comprueba columna, valor por defecto, restricción y que no toca RLS ni datos |
| `src/app/core/models/task.ts` | Modificar | `postponedCount` en `Task` y `postponed_count` en `TaskRow` |
| `src/app/features/tasks/tasks.access.service.ts` (+ spec) | Modificar | `postpone()`; mapeo del contador |
| `src/app/features/tasks/postpone/postpone.constructor.service.ts` (+ spec) | Crear | Opciones, fechas, etiquetas y textos |
| `src/app/features/tasks/postpone/postpone-sheet/` (+ spec) | Crear | Hoja de opciones |
| `src/app/features/tasks/tasks-notice.service.ts` (+ spec) | Crear | Aviso breve compartido entre lista y formulario |
| `src/app/features/tasks/tasks-list/` | Modificar | Botón **Posponer**, hoja y uso de `TasksNoticeService` |
| `src/app/features/tasks/task-form/` | Modificar | Acción **Posponer** en modo editar |
| `src/app/shared/components/icon/icon.ts` (+ spec) | Modificar | Icono `snooze` |
| `docs/supabase.md` | Modificar | Columna nueva |

---

## Interfaces TypeScript

```typescript
// core/models/task.ts (añadido)
export interface Task { /* … */ readonly postponedCount: number; }

// postpone.constructor.service.ts
export type PostponeOption = 'later-today' | 'tomorrow' | 'next-week' | 'custom';
export interface PostponeTarget { readonly dueDate: string; readonly dueTime: string | null; }
export interface PostponeChoice {
  readonly option: Exclude<PostponeOption, 'custom'>;
  readonly target: PostponeTarget;
  readonly label: string;      // «Más tarde hoy», «Mañana», «La semana que viene»
  readonly detail: string;     // «hoy a las 17:30», «Sábado, 15 de noviembre · a las 09:00»
}
// choices(task: Task, now: Date): PostponeChoice[]       // solo las que posponen de verdad
// customMin(task: Task, now: Date): string               // hoy, o el día siguiente a su fecha si ya es de hoy o futura
// customTarget(task: Task, day: string): PostponeTarget | null   // null si no es posterior
// countsAsPostponed(task: Task, target: PostponeTarget): boolean // tenía fecha y el destino es posterior
// noticeText(target: PostponeTarget): string            // «Tarea pospuesta a Mañana a las 16:30»

// tasks.access.service.ts (añadido)
// postpone(id: string, target: PostponeTarget): Promise<TaskOpResult>   // optimista con reversión

// tasks-notice.service.ts
// notice: Signal<{ text: string; error: boolean } | null>; show(text, error): void   // se borra solo a los 3 s
```

**Reglas de las opciones** (`now` = hora local, sin segundos):
- *Más tarde hoy*: solo si la tarea tiene hora y su fecha es hoy o anterior; destino = `now + 1 h` (si pasa de medianoche, el día siguiente). Etiqueta «hoy a las HH:MM» o «mañana a las HH:MM».
- *Mañana*: `hoy + 1`, hora conservada. *La semana que viene*: el próximo lunes posterior a hoy (`+7` si hoy es lunes), hora conservada.
- Cualquiera se oculta si su destino no es **posterior** a (fecha, hora) de la tarea; una tarea sin hora compara solo la fecha; una tarea sin fecha las ve todas salvo *Más tarde hoy*.
- *Elegir fecha*: `customMin` y el selector nativo con `min`.

---

## Esquema SQL

```sql
-- supabase/migrations/<marca>_tasks_postponed_count.sql
alter table public.tasks
  add column postponed_count integer not null default 0,
  add constraint tasks_postponed_count_nonneg check (postponed_count >= 0);

-- Las políticas RLS de la spec 005 ya cubren la columna (por fila).
-- Rollback (nueva migración):
--   alter table public.tasks drop column postponed_count;
```

Sin datos de ejemplo. `db push` previa verificación de cuenta por id y con confirmación.

---

## Pantallas

| Pantalla de Stitch | Componente | Datos / acciones / estados |
|---|---|---|
| `lista-de-tareas` | `TasksList` | Botón **Posponer** en cada tarea pendiente (distinto del control de completar); abre `PostponeSheet`. Sin botón en completadas |
| `hoja-de-posponer` | `PostponeSheet` | Título de la tarea; opciones de `choices()` con su detalle; **Elegir fecha** con el selector nativo (`min` = `customMin`); cierra con atrás o tocando fuera; `role="dialog"`, `aria-modal`; objetivos ≥ 44 px |
| Aviso de resultado | `TasksList` (vía `TasksNoticeService`) | «Tarea pospuesta a …» o «No se pudo posponer la tarea. Inténtalo de nuevo.» |
| (sin diseño) acción en el formulario | `TaskForm` | **Posponer** en modo editar, junto a guardar y borrar; al elegir, cierra el formulario y vuelve a la lista con el aviso |

Ignorado según `design/README.md`: simulador, cabeceras, barra inferior, etiquetas inventadas y el botón «Asignar fecha» (se usa **Posponer** también para tareas sin fecha).

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `scripts/postpone-migration.test.mjs` | Columna, valor por defecto 0, restricción ≥ 0; sin `insert`, `drop` ni cambios de RLS | US-007-02 |
| `postpone.constructor.service.spec.ts` | Cada opción desde hoy, atrasadas y sin fecha; +1 hora con cruce de medianoche, con y sin hora; lunes y +7 si hoy es lunes; fin de mes y de año; cambio de hora; opciones ocultas; `customMin` y `customTarget`; `countsAsPostponed`; textos | US-007-01, 02 |
| `tasks.access.service.spec.ts` | `postpone()` optimista y con reversión; guarda fecha, hora y contador; el contador no sube sin fecha previa ni al editar; recarga lanzada antes no lo pisa | US-007-01, 02 |
| `postpone-sheet.spec.ts` | Opciones y detalles, elegir fecha (mínimo), cerrar sin cambios, accesibilidad, `OnPush` | US-007-01 |
| `tasks-notice.service.spec.ts` | Muestra y se borra a los 3 s; error con `role="alert"` | US-007-01 |
| `tasks-list.spec.ts`, `task-form.spec.ts` | Botón y hoja, aviso con la fecha, no en completadas, formulario cierra y vuelve a la lista | US-007-01 |
| `alarms.access.service.spec.ts` (spec 006) | Cambiar fecha u hora reprograma el aviso sin duplicados | US-007-03 |

Cobertura ≥ 80 % en el servicio de acceso. **Revisión visual en navegador** (claro y oscuro; hoja, aviso, botón en la fila) y **Android** (selector nativo, atrás cierra la hoja). Prueba real de RLS con `pnpm verify:rls` ampliado (el contador no permite valores negativos) tras `db push`, con confirmación.

---

## Orden de implementación

1. Migración y su test de script; modelo y mapeo del contador (los tests existentes de la 005 se actualizan).
2. `PostponeConstructorService` (opciones, mínimo, contador, textos).
3. `TasksAccessService.postpone()`.
4. `TasksNoticeService` y refactor del aviso de la lista.
5. Icono y `PostponeSheet`.
6. Integración en la lista y el formulario.
7. `db push` (verificar cuenta por id y pedir confirmación) y `verify:rls`.
8. Verificación en navegador y en el emulador; documentación.

---

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Errores de fechas en cambios de mes, de año y de hora | Media | Reloj inyectable (`CLOCK`) y casos límite en los tests |
| El selector nativo no respeta `min` en el WebView | Baja | Validar también en `customTarget` y mostrar un mensaje |
| La hoja choca con el botón atrás de Android | Media | Cerrarla con `popstate` / evento del sistema; probarlo en el emulador |
| Orden de dependencia con la 006 | Media | Se implementa después de la 006; si faltara, US-007-03 queda pendiente (spec) |
| Romper los tests de la 005 al añadir `postponedCount` | Media | Actualizar el helper `row()` y los modelos primero (Red → Green) |
