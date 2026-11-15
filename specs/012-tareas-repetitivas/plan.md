# Plan 012 — Tareas repetitivas

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: [design/README.md](./design/README.md) (pantallas en `design/formulario-configurar-repeticion/` y `design/lista-series-y-decision/`)
**Estado**: Aprobado
**Fecha**: 2026-11-15

---

## Enfoque técnico

**Una serie es una regla y una sola ocurrencia pendiente.** La regla vive en una tabla nueva `task_series` (por usuario, con RLS). Cada ocurrencia es una fila normal de `tasks` con `series_id` y `series_date` (la fecha prevista original, que no cambia al posponer). Así la lista, las alarmas, el XP, el posponer y la RLS siguen funcionando sin tocar su lógica: una ocurrencia es «una tarea más». No se generan ocurrencias por adelantado (decisión de la spec): al completar una, el cliente crea la siguiente.

**El cálculo de fechas está solo en TypeScript**, en una función pura (`core/utils/recurrence.ts`), para no duplicar la lógica en SQL. La base de datos aporta lo que no admite carreras ni olvidos: un **índice único parcial** (como mucho una ocurrencia pendiente por serie: un reintento o un segundo móvil no duplica nada) y un **disparador** `tasks_series_guard` que (a) rechaza completar una ocurrencia con fecha futura (clarify: no hasta su día; sin XP por adelantar) y (b) al desmarcar una ocurrencia borra la pendiente generada después, para que siga habiendo una sola. Si el cliente muere entre «completar» y «crear la siguiente», la **autorreparación al cargar** (`load()`) crea la ocurrencia que falte en cualquier serie sin pendiente.

**Reglas de producto fijadas en este plan** (por defecto, sin preguntar):
- Los cambios de **regla** (incluido pasar a «No se repite» o quitar la fecha) son siempre de **toda la serie**: no se pregunta. La hoja «Solo esta / Toda la serie» al editar solo aparece si la regla no cambia pero sí título, fecha u hora.
- Editar «solo esta» cambia esa fila, no la serie ni su `series_date`.
- Editar «toda la serie»: el título, la hora y la regla pasan a la serie; la fecha del formulario es el nuevo `start_date` (la fase de «cada N días/semanas»); la ocurrencia pendiente se recoloca en el primer día válido **desde hoy o desde la fecha del formulario, lo que sea posterior**.
- Borrar «toda la serie» borra la serie (las completadas quedan como tareas normales: `on delete set null`) y la pendiente. «Solo esta» borra la pendiente y crea la siguiente.
- La siguiente ocurrencia es el primer día válido **posterior a `series_date` de la completada y no anterior a hoy**. El título y la hora salen de la serie, no de la fila completada.
- Repetir exige fecha: una ocurrencia siempre tiene `due_date`. Una tarea sin fecha no puede tener serie.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `supabase/migrations/20261116100000_task_series.sql` | Crear | Tabla `task_series` + RLS, columnas `series_id`/`series_date` en `tasks`, índice único parcial, disparador `tasks_series_guard`, rollback |
| `scripts/recurrence-migration.test.mjs` | Crear | Test estático de la migración (RLS, restricciones, índice, disparador, rollback) |
| `src/app/core/models/recurrence.ts` | Crear | `Recurrence`, `TaskSeries`, `SeriesRow`, límites y validación |
| `src/app/core/utils/recurrence.ts` (+ `.spec.ts`) | Crear | Funciones puras: `isRecurrenceValid`, `occursOn`, `firstOnOrAfter`, `nextAfter`, `weekdayOf` |
| `src/app/core/utils/local-date.ts` | Modificar | `daysBetween`, `daysInMonth`, `weekdayOf` (1 = lunes) sin `toISOString()` |
| `src/app/core/models/task.ts` | Modificar | `Task.seriesId/seriesDate`, `TaskRow.series_id/series_date`, `TaskInput.recurrence/seriesDate` |
| `src/app/features/tasks/tasks.access.service.ts` (+ spec) | Modificar | Series en caché, crear serie, completar → siguiente, autorreparación, editar/borrar «solo esta»/«toda la serie» |
| `src/app/features/tasks/tasks.constructor.service.ts` (+ spec) | Modificar | `isFuture`, `availableLabel`, textos de repetición, avisos |
| `src/app/features/tasks/recurrence/recurrence.constructor.service.ts` (+ spec) | Crear | Textos fijos, opciones de frecuencia, nombres de día, resumen en lenguaje natural, valores por defecto del ajuste |
| `src/app/features/tasks/recurrence/recurrence-sheet/` (`.ts/.html/.scss/.spec.ts`) | Crear | Hoja «Configurar repetición» (frecuencia, días, intervalo, día del mes, finalización, resumen) |
| `src/app/features/tasks/recurrence/series-choice-sheet/` (`.ts/.html/.scss/.spec.ts`) | Crear | Hoja «Esta tarea se repite» con «Solo esta / Toda la serie» (modo `edit` o `delete`) |
| `src/app/features/tasks/task-form/task-form.{ts,html,scss}` (+ spec) | Modificar | Fila «Repetir», hojas, guardado según alcance, borrado de serie |
| `src/app/features/tasks/tasks-list/tasks-list.{ts,html,scss}` (+ spec) | Modificar | Indicador de repetición, completar desactivado en futuras, aviso «Próxima» |
| `src/app/shared/components/icon/` | Modificar | Iconos nuevos (repetir, repetición de evento, candado, candado con reloj, uno, infinito, saltar, escudo verificado, barrido de papelera) |
| `src/app/core/models/account.ts` | Modificar | `LocalTask.recurrence?` |
| `src/app/features/account/account.access.service.ts` (+ spec) | Modificar | La instantánea local incluye la regla; el traspaso recrea la serie; el buffer admite `recurrence` opcional |
| `cypress/support/backend.ts` | Modificar | Simulador: `task_series`, índice único, disparador (futuras, desmarcar), `on delete set null` |
| `cypress/e2e/repetitivas.cy.ts` | Crear | Flujos P1/P2 |
| `cypress/e2e/cuenta.cy.ts` | Modificar | Traspaso de una pendiente repetitiva |
| `src/app/features/dev/account-preview.ts` o `dev/` | Modificar | Vistas previas `/__dev/tasks/<pantalla>/<estado>` de las pantallas nuevas |
| `scripts/design-tokens.test.mjs` | Modificar | Comprobar que hojas y componentes nuevos usan tokens y mixins |
| `docs/supabase.md`, `CLAUDE.md`, `specs/README.md`, `docs/interacciones.md` | Modificar | Documentación y registro |

No cambian: `alarms/` (una ocurrencia con hora es una tarea con hora: `AlarmsAccessService` ya recibe el conjunto completo desde `tasks()`), `postpone/` (cambia solo una fila; se añade un test), progreso (el XP lo siguen dando los disparadores actuales).

---

## Interfaces TypeScript

```typescript
// src/app/core/models/recurrence.ts
export type RecurrenceKind = 'daily' | 'weekly' | 'monthly';

export const INTERVAL_MIN = 1;
export const INTERVAL_MAX = 30;

export interface Recurrence {
  readonly kind: RecurrenceKind;
  /** Cada N días (`daily`) o N semanas (`weekly`); 1 en `monthly`. */
  readonly interval: number;
  /** 1 = lunes … 7 = domingo, ordenados y sin repetir; solo con `weekly`, vacío en el resto. */
  readonly weekdays: readonly number[];
  /** 1 a 31; solo con `monthly`, `null` en el resto. */
  readonly monthDay: number | null;
  /** Día local `YYYY-MM-DD` desde el que cuenta la regla (fase de «cada N»); no hay ocurrencias antes. */
  readonly startDate: string;
  /** Último día local con ocurrencia (incluido); `null` = sin fin. */
  readonly until: string | null;
}

/** Serie tal como la usa el cliente. El título y la hora de la serie mandan sobre las ocurrencias nuevas. */
export interface TaskSeries {
  readonly id: string;
  readonly title: string;
  readonly dueTime: string | null;
  readonly recurrence: Recurrence;
}

/** Fila de `task_series` tal como la devuelve Supabase (`due_time` llega como `HH:MM:SS`). */
export interface SeriesRow {
  id: string;
  title: string;
  due_time: string | null;
  kind: RecurrenceKind;
  interval_n: number;
  weekdays: number[];
  month_day: number | null;
  start_date: string;
  until_date: string | null;
}
```

```typescript
// src/app/core/models/task.ts (cambios)
export interface Task {
  // …campos actuales…
  /** `null` = tarea suelta. */
  readonly seriesId: string | null;
  /** Día previsto original de la ocurrencia (no cambia al posponer); `null` si es suelta. */
  readonly seriesDate: string | null;
}

export interface TaskInput {
  readonly title: string;
  readonly dueDate: string | null;
  readonly dueTime: string | null;
  /** Con regla, `dueDate` es obligatorio y es la fecha de la ocurrencia. */
  readonly recurrence?: Recurrence | null;
  /** Solo traspaso entre identidades: conserva el `series_date` de origen; por defecto `dueDate`. */
  readonly seriesDate?: string | null;
}

export interface TaskRow {
  // …campos actuales…
  series_id: string | null;
  series_date: string | null;
}
```

```typescript
// src/app/core/utils/recurrence.ts (todo puro, fechas locales, sin toISOString)
export function isRecurrenceValid(rule: Recurrence): boolean;
/** ¿Cae la regla en ese día? Ignora `until`. */
export function occursOn(rule: Recurrence, day: string): boolean;
/** Primer día válido >= `from` (y >= `startDate`), o `null` si no hay (pasa de `until` o no se encuentra en 400 días). */
export function firstOnOrAfter(rule: Recurrence, from: string): string | null;
/** Siguiente ocurrencia tras `occurrence`: primer día válido posterior a esa fecha y no anterior a `today`. */
export function nextAfter(rule: Recurrence, occurrence: string, today: string): string | null;
```

```typescript
// src/app/features/tasks/tasks.access.service.ts (API nueva; las actuales no cambian de firma)
export type SeriesScope = 'single' | 'series';

export type CompleteResult =
  | { ok: true; next: string | null | undefined } // día de la siguiente; null = la serie acaba; undefined = no es serie
  | { ok: false; reason: TasksErrorReason };

readonly series: Signal<ReadonlyMap<string, TaskSeries>>;      // del usuario actual
seriesOf(task: Task): TaskSeries | undefined;
create(input: TaskInput): Promise<TaskOpResult>;                // con `recurrence` crea la serie y la 1.ª ocurrencia
setCompleted(id: string, done: boolean): Promise<CompleteResult>;
updateOccurrence(id: string, input: TaskInput): Promise<TaskOpResult>;          // «solo esta»
updateSeries(id: string, input: TaskInput): Promise<TaskOpResult>;              // «toda la serie» (también suelta → serie y serie → suelta)
removeOccurrence(id: string): Promise<TaskOpResult>;                            // «solo esta»
removeSeries(id: string): Promise<TaskOpResult>;                                // «toda la serie»
```

---

## Esquema SQL

```sql
-- supabase/migrations/20261116100000_task_series.sql
-- Spec 012: tareas repetitivas. Una serie guarda la regla; cada ocurrencia es una fila de `tasks`.

create table public.task_series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  due_time time,
  kind text not null check (kind in ('daily', 'weekly', 'monthly')),
  interval_n integer not null default 1 check (interval_n between 1 and 30),
  weekdays smallint[] not null default '{}',
  month_day smallint check (month_day between 1 and 31),
  start_date date not null,
  until_date date,
  created_at timestamptz not null default now(),
  constraint task_series_weekly_days check (
    (kind = 'weekly' and cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]::smallint[])
    or (kind <> 'weekly' and cardinality(weekdays) = 0)
  ),
  constraint task_series_monthly_day check (
    (kind = 'monthly' and month_day is not null and interval_n = 1)
    or (kind <> 'monthly' and month_day is null)
  ),
  constraint task_series_until check (until_date is null or until_date >= start_date)
);

create index task_series_user_idx on public.task_series (user_id);

alter table public.task_series enable row level security;

create policy "task_series_select" on public.task_series
  for select to authenticated using (user_id = (select auth.uid()));
create policy "task_series_insert" on public.task_series
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "task_series_update" on public.task_series
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "task_series_delete" on public.task_series
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.task_series from anon;
grant select, insert, update, delete on public.task_series to authenticated;

-- Ocurrencias: una fila de `tasks` con serie. Al borrar la serie, las completadas quedan como tareas sueltas.
alter table public.tasks
  add column series_id uuid references public.task_series (id) on delete set null,
  add column series_date date,
  add constraint tasks_series_date check (series_id is null or series_date is not null),
  add constraint tasks_series_needs_day check (series_id is null or due_date is not null);

-- Como mucho una ocurrencia pendiente por serie: un reintento o un segundo móvil no la duplica.
create unique index tasks_series_one_pending on public.tasks (series_id)
  where series_id is not null and completed_at is null;

create function public.tasks_series_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.series_id is null then
    return new;
  end if;
  if old.completed_at is null and new.completed_at is not null then
    -- Una ocurrencia futura no se completa hasta su día (sin XP por adelantar días).
    if new.completed_day is not null and new.due_date > new.completed_day then
      raise exception 'future occurrence' using errcode = 'P0001';
    end if;
  elsif old.completed_at is not null and new.completed_at is null then
    -- Al desmarcar, la pendiente generada después deja de existir: sigue habiendo una sola.
    delete from public.tasks
      where series_id = new.series_id and completed_at is null and id <> new.id;
  end if;
  return new;
end $$;

-- Se llama «tasks_series_guard» (después de `tasks_progress_before` por orden alfabético): `completed_day`
-- ya viene del cliente y el disparador de progreso lo conserva al completar.
create trigger tasks_series_guard before update on public.tasks
  for each row execute function public.tasks_series_guard();

-- Rollback (nueva migración):
--   drop trigger tasks_series_guard on public.tasks;
--   drop function public.tasks_series_guard();
--   drop index public.tasks_series_one_pending;
--   alter table public.tasks drop constraint tasks_series_needs_day, drop constraint tasks_series_date,
--     drop column series_date, drop column series_id;
--   drop table public.task_series;
```

- `tasks_series_guard` no es `security definer`: el borrado de la pendiente respeta la RLS del propio usuario.
- La migración **no** cambia datos existentes (las tareas actuales quedan con `series_id = null`).
- Despliegue: aplicar con `pnpm db:push` (confirmación del usuario, comprobando antes la cuenta de la CLI) **antes** de ejecutar el cliente contra el remoto (el cliente lee `series_id` y `task_series`).

---

## Pantallas

Mapa **pantalla de Stitch → componente** (la spec manda; lo ignorado y lo corregido está en `design/README.md`).

| Pantalla (Stitch) | Componente | Datos / acciones / estados |
|---|---|---|
| Formulario → fila «Repetir» | `TaskForm` (modificado) | Muestra la regla (`RecurrenceConstructorService.describe`), «No se repite» por defecto; desactivada y con el texto «Elige una fecha para repetir la tarea» sin fecha; al quitar la fecha con regla → vuelve a «No se repite» y avisa. Toca → abre `RecurrenceSheet`. Al guardar: regla sin cambios y título/fecha/hora distintos → `SeriesChoiceSheet(edit)`; regla distinta → serie entera sin preguntar; tarea suelta → `create`/`update` |
| Hoja «Configurar repetición» (+ configuración por tipo) | `RecurrenceSheet` (nuevo) | Entrada `rule: Recurrence \| null`, `firstDate` (fecha del formulario); salida `apply(rule \| null)` y `dismiss`. Frecuencias: No se repite, Todos los días, Días de la semana, Cada N días, Cada N semanas, Un día del mes. Días L M X J V S D (44 px); en «Cada N semanas» también los días (corrección sobre Stitch); selector N 1–30; día del mes 1–31 con el aviso de fin de mes; «Finalización»: Nunca / El día… (`input date`, mínimo la primera ocurrencia). Errores: sin días, fecha de fin anterior a la primera ocurrencia (el mismo día vale). Resumen y «Primera ocurrencia» en vivo. «Listo» desactivado si inválida; «Descartar»/atrás/cerrar descartan. Registra su capa en `OverlayBack` |
| Lista → tarea repetitiva | `TasksList` (modificado) | Chip con icono y texto («Todos los días», «Lun, jue», «Cada 2 semanas», «El día 15 de cada mes», «hasta …»); no depende del color. Ocurrencia con fecha > hoy: el check queda desactivado (con candado) y muestra «Disponible el <día>»; sin sección aparte (agrupa por día como siempre). Atrasada: como cualquier atrasada con su chip. Tras completar: aviso «Hecho. Próxima: <día>» o «Hecho. Era la última repetición» |
| Hoja «Esta tarea se repite» (editar) | `SeriesChoiceSheet` modo `edit` (nuevo) | «Solo esta» / «Toda la serie» / «Cancelar». Textos corregidos (sin «para hoy») |
| Hoja «Esta tarea se repite» (borrar) | `SeriesChoiceSheet` modo `delete` | «Solo esta» (borra la pendiente y crea la siguiente) / «Toda la serie» (borra la pendiente y la serie; «Las ocurrencias ya completadas se conservan») / «Volver atrás». Sustituye al diálogo de confirmación solo para tareas con serie; las sueltas siguen con su confirmación actual |
| Aviso tras completar | `TasksNoticeService` existente | Texto nuevo; no hay componente nuevo |

Navegación: no hay rutas nuevas. Las hojas son capas (`OverlayBack`): atrás cierra la de encima. Antes de navegar tras una hoja se espera `await close()` (regla de la spec 011). Sin conexión: los avisos de siempre (`saveError`, `failNotice`, `deleteError`).

Vistas previas de desarrollo (revisión visual, solo `isDevMode`): `/__dev/tasks/<pantalla>/<estado>` con `repetir-formulario`, `repetir-hoja` (estados: semanal, cada-n, mes, fecha-error, sin-dias), `lista-repetidas`, `editar-serie`, `borrar-serie`.

---

## Algoritmo de ocurrencias (`core/utils/recurrence.ts`)

- `occursOn(rule, day)`: falso si `day < startDate`. `daily`: `daysBetween(startDate, day) % interval === 0`. `weekly`: `weekdayOf(day)` está en `weekdays` y `weeksBetween(lunesDe(startDate), lunesDe(day)) % interval === 0`. `monthly`: `day` es `min(monthDay, daysInMonth(mes de day))`.
- `firstOnOrAfter(rule, from)`: recorre día a día desde `max(from, startDate)` hasta 400 días (cubre el peor caso: cada 30 semanas) y devuelve el primero que `occursOn`; `null` si pasa de `until` o no hay.
- `nextAfter(rule, occurrence, today)` = `firstOnOrAfter(rule, max(addDays(occurrence, 1), today))`.
- Diferencias de días con `Date.UTC(y, m, d)` (inmune al cambio de hora) y suma con `addDays` a mediodía local, que ya existe.
- Resumen de regla («Lun, jue», «Cada 2 semanas: Vie», «El día 31 de cada mes», «hasta 30 jun») en `RecurrenceConstructorService`.

## Flujos del servicio de acceso

- **Cargar**: tareas y series en paralelo (plazo propio de 8 s); la caché de series se indexa por `userId()` como la de tareas. Tras cargar, **autorreparación**: por cada serie del usuario sin ocurrencia pendiente (y con `inFlight === 0`), `nextAfter(rule, última series_date conocida o startDate - 1, hoy)`; si hay fecha, se inserta (un 23505 por el índice único se ignora). Si no hay (serie terminada), no se hace nada.
- **Crear con regla**: se inserta la serie (título, hora, regla, `start_date` = fecha del formulario) y la ocurrencia (`series_id`, `series_date` = `due_date` = primer día válido calculado por el formulario). Si falla la segunda, se intenta borrar la serie y se devuelve el error.
- **Completar** (`done = true`, serie): cambio optimista; se envía `completed_at`/`completed_day`; si el servidor lo acepta, se calcula `nextAfter(rule, seriesDate, hoy)` e inserta la siguiente (título y hora de la serie). El resultado lleva `next` para el aviso. Si el insert de la siguiente falla, no se revierte lo completado: `load()` lo repara. Una ocurrencia con fecha futura ni se intenta (la UI la desactiva) y el servidor la rechaza (`P0001`) → se revierte.
- **Desmarcar** (`done = false`, serie): se quita de la caché la pendiente de esa serie (el disparador la borra en el servidor) y vuelve la desmarcada; si falla, se revierte todo.
- **Editar «solo esta»**: `update` de la fila (título/fecha/hora); no toca la serie. No permite quitar la fecha.
- **Editar «toda la serie»**: `update` de `task_series` (título, hora, regla, `start_date` = fecha del formulario) y de la pendiente (`due_date` = `firstOnOrAfter(rule, max(fechaFormulario, hoy))`, `series_date` igual). Suelta → serie: se inserta la serie y se enlaza la fila. Serie → suelta (regla «No se repite» o sin fecha): se desenlaza la fila (`series_id`/`series_date` a `null`) y se borra la serie.
- **Borrar «solo esta»**: borra la fila y crea la siguiente. **«Toda la serie»**: borra la serie primero (la pendiente queda suelta por `set null`) y después la fila; si lo segundo falla, queda como tarea suelta y el usuario puede borrarla.
- **Traspaso (011)**: `LocalTask` gana `recurrence?`; la instantánea la rellena con la regla de la serie de cada pendiente; `transferPending` llama a `create` con `recurrence` y `seriesDate`. El buffer antiguo (sin `recurrence`) sigue siendo válido. Las completadas no se traspasan, como hasta ahora.
- `forget(userId)` también limpia la caché de series.

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `core/utils/recurrence.spec.ts` | Reglas diaria/semanal/mensual, intervalos, fin de mes (28/29/30/31, año bisiesto), fase de «cada N semanas», `until` (incluido), primera ocurrencia, atrasada sin crear en el pasado, cambio de hora (marzo/octubre), día de la semana por zona | US-012-01, 02, 05, 06 |
| `core/utils/local-date.spec.ts` (existente) | `daysBetween`, `daysInMonth`, `weekdayOf` | US-012-05 |
| `scripts/recurrence-migration.test.mjs` | RLS en `task_series` (4 políticas, `revoke anon`), restricciones, índice único parcial, disparador, rollback, sin datos | modelo de datos |
| `tasks/tasks.access.service.spec.ts` | Crear serie; completar crea la siguiente y reintento sin duplicar (23505); fallo de la siguiente no revierte; futura rechazada y revertida; desmarcar deja una pendiente; editar solo esta / toda la serie (suelta ↔ serie); borrar solo esta / toda la serie; autorreparación al cargar; `forget`; sin `console` | US-012-01, 02, 03 |
| `tasks/tasks.constructor.service.spec.ts` | `isFuture`, «Disponible el <día>», textos del aviso («Próxima», «última repetición») | US-012-02, 04 |
| `tasks/recurrence/recurrence.constructor.service.spec.ts` | Opciones, validación («Elige al menos un día», fecha de fin), resumen y «Primera ocurrencia» | US-012-01, 04, 05, 06 |
| `recurrence-sheet.spec.ts` | Cada tipo muestra su configuración; «Listo» desactivado si inválida; días ≥ 44 px; atrás/Descartar; OnPush | US-012-01, 05, 06 |
| `series-choice-sheet.spec.ts` | Modos `edit`/`delete`, emisiones, textos, capa de atrás | US-012-03 |
| `task-form/task-form.spec.ts` | Fila «Repetir» (desactivada sin fecha; se limpia al quitar la fecha), guardar serie, hoja solo si la regla no cambia, regla cambiada → serie sin preguntar, suelta sin pregunta | US-012-01, 03 |
| `tasks-list/tasks-list.spec.ts` | Chip de repetición, futura con check desactivado, aviso tras completar, última repetición, atrasada | US-012-02, 04 |
| `postpone/postpone-sheet.spec.ts` | Posponer una ocurrencia no cambia la regla ni `series_date` | US-012-03 |
| `alarms/alarms.access.service.spec.ts` | Una ocurrencia con hora programa su aviso como una tarea | contexto 006 |
| `account/account.access.service.spec.ts` | Instantánea con regla; traspaso recrea la serie; buffer antiguo sigue válido | contexto 011 |
| `cypress/e2e/repetitivas.cy.ts` | Crear diaria y semanal; completar → siguiente y aviso; futura desactivada; atrasada; desmarcar sin duplicar; editar solo esta / serie; borrar solo esta / serie; cada N, día del mes, fin; sin fecha; atrás de Android con las hojas | US-012-01…06 |
| `cypress/e2e/cuenta.cy.ts` | Traspaso conserva la repetición | contexto 011 |
| `cypress/e2e/repetitivas-fidelidad.cy.ts` | Medidas del diseño a 390 px (fila, hoja, chips, hojas de decisión), zonas táctiles ≥ 44 px y sin desbordes | spec 010 |
| `scripts/design-tokens.test.mjs` | Hojas y componentes nuevos con tokens y mixins | spec 010 |

Revisión visual en navegador (extensión de Chrome, 390×844, claro y oscuro, consola) y comprobación en Android (emulador: crear, completar con aviso, alarma real de una ocurrencia, atrás con hojas, teclado). Cobertura ≥ 80 % en `TasksAccessService` y `core/utils/recurrence.ts`.

---

## Orden de implementación (Red → Green → Refactor por historia)

1. **Bloque 1 — BBDD**: Red del test estático de la migración → migración. `db:push:dry` y `db:push` solo con confirmación del usuario, tras comprobar la cuenta de la CLI.
2. **Bloque 2 — Modelos y reglas puras**: `local-date`, `recurrence` (modelo y utilidades), `Task`/`TaskInput`/`TaskRow`. Los tests de `recurrence.spec.ts` cubren ya P1 y P2.
3. **Bloque 3 — Acceso a datos**: simulador e2e (`backend.ts`) y `TasksAccessService` (crear, completar → siguiente, autorreparación, desmarcar, editar/borrar). El traspaso (011) en este bloque.
4. **Bloque 4 — US-012-01 (P1)**: `RecurrenceConstructorService`, `RecurrenceSheet` (No se repite, Todos los días, Días de la semana) y fila «Repetir» del formulario.
5. **Bloque 5 — US-012-02 (P1)**: lista (chip, futura desactivada, avisos «Próxima» / «última repetición»).
6. **Bloque 6 — US-012-03 (P1)**: `SeriesChoiceSheet`, edición y borrado de serie en el formulario, posponer.
7. **Bloque 7 — US-012-04 (P2)**: texto de regla en la lista y en el formulario (ya parcial en el Bloque 5; aquí se completan los casos de intervalo, mes y fin).
8. **Bloque 8 — US-012-05 y US-012-06 (P2)**: «Cada N días/semanas», «Un día del mes» y «Finalización» en la hoja.
9. **Bloque 9 — Cierre**: vistas previas de desarrollo, e2e de fidelidad, `design-tokens`, documentación (`docs/supabase.md`, `CLAUDE.md`, `specs/README.md`), `lint:fix && format && secrets:check && test:ci && test:scripts && e2e`, revisión visual en navegador y en Android, `review.md`.

Commits por bloque, cada uno con confirmación del usuario.

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Completar y crear la siguiente no es atómico (cierre a mitad) | Media | Autorreparación en `load()` + índice único que impide duplicar; test de reintento |
| Dos móviles completan a la vez | Baja | El índice único parcial rechaza la segunda ocurrencia; el 23505 se ignora |
| Desfase de fechas por zona horaria o cambio de hora | Media | Solo fechas locales y `Date.UTC` para diferencias; tests en los cambios de hora de marzo y octubre |
| Disparador `tasks_series_guard` choca con el de progreso | Baja | Orden alfabético conocido (`progress` antes que `series`) y tests e2e del simulador; no toca columnas de XP |
| Desmarcar borra la pendiente y el cliente no se entera | Media | Se quita de la caché al desmarcar y `load()` reconcilia al volver a primer plano |
| Serie sin pendiente que no deba regenerarse (borrado fallido a medias) | Baja | «Toda la serie» borra primero la serie, no la fila: nunca queda una serie sin dueño que se autorrepare |
| La migración debe estar aplicada antes del cliente | Alta si se olvida | Nota en `CLAUDE.md` y `docs/supabase.md` y `db:push` explícito en el Bloque 1 |
| Rendimiento de `firstOnOrAfter` (hasta 400 iteraciones) | Baja | Es instantáneo; test con «cada 30 semanas» |
| La hoja de repetición dentro de un formulario con teclado virtual | Media | `OverlayBack`, selector numérico con botones ±, revisión en Android con teclado |
| Iconos nuevos aumentan el paquete inicial | Baja | Se comprueba `initial-bundle.test.mjs` y presupuestos de `angular.json`; las hojas se importan de forma diferida si hace falta |
