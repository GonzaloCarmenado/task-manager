# Plan 005 — Tareas básicas

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: [design/](./design/README.md), generado a partir de [stitch-prompt.md](./stitch-prompt.md)
**Estado**: Aprobado (2026-11-13)
**Fecha**: 2026-11-13

---

## Enfoque técnico

Una tabla `tasks` por usuario con RLS (`user_id` por defecto `auth.uid()`), un único **`TasksAccessService`** que habla con Supabase y mantiene el estado en Signals, y dos pantallas lazy (lista y formulario) con el patrón de 3 servicios. La lista es la ruta principal y sustituye a «Hola»; el formulario es una ruta propia (`/nueva` y `/:id`), de modo que el botón atrás de Android cierra el formulario sin código extra. El estado vive en el servicio (singleton), así que volver a la lista no recarga ni parpadea.

- **Datos por usuario**: la caché en memoria se indexa por `userId()` (`Map<userId, Task[]>`); una tarea de otro usuario nunca se pinta. La capa tiene **plazo propio de 8 s** (`AbortSignal` en cada consulta) y no depende de `getSession()`; nunca escribe en consola.
- **Carga**: una sola consulta trae las pendientes y las completadas de los últimos 30 días (`completed_at is null or completed_at >= hace 30 días`). El estado `loading` solo se ve si no hay datos previos del usuario.
- **Optimismo**: completar, desmarcar y borrar actualizan la lista al instante y **revierten** si el servidor falla (con aviso). Crear y editar esperan al servidor (conservan el texto si falla).
- **Fechas en hora local**: `due_date` es `YYYY-MM-DD` construido a mano (`core/utils/local-date.ts`), nunca `toISOString()` para el día. «Hoy» se recalcula al volver a primer plano (cambio de día con la app en segundo plano). `completed_at` sí es un instante (ISO, UTC).
- **Selectores**: «Elegir fecha» y la hora usan los selectores **nativos** (`input type="date"` y `type="time"`), que en el WebView de Android abren el selector del sistema; Hoy y Mañana son botones. Sin librerías.
- **Agrupar y ordenar** es lógica pura (`TasksConstructorService`, con reloj inyectable `CLOCK`): Atrasadas, Hoy, Mañana, fechas, Sin fecha; dentro del día, con hora ascendente y luego sin hora por creación; completadas por fecha de completado descendente.
- **Borrado**: confirmación **dentro de la pantalla** (panel `role="alertdialog"`), no `window.confirm` (los diálogos del navegador bloquean y no son accesibles).
- **Atrasada** se distingue con el token de error (texto de fecha y borde), sin color como único indicio: lleva además la etiqueta «Atrasada» en la fecha.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `supabase/migrations/<marca>_tasks.sql` | Crear | Tabla, restricciones, índices, RLS y rollback comentado |
| `scripts/tasks-migration.test.mjs` | Crear | Comprueba RLS, `user_id`, políticas y ausencia de datos de ejemplo |
| `src/app/core/models/task.ts` | Crear | `Task`, `TaskInput`, `TaskRow`, `taskFromRow`, constantes (`TITLE_MAX = 120`, `COMPLETED_DAYS = 30`) |
| `src/app/core/utils/local-date.ts` (+ spec) | Crear | `toLocalDay`, `addDays`, `parseLocalDay`, `formatTime` |
| `src/app/core/services/clock.ts` | Crear | `CLOCK` (`InjectionToken<() => Date>`) con `() => new Date()` |
| `src/app/features/tasks/tasks.access.service.ts` (+ spec) | Crear | Único acceso a Supabase: cargar, crear, editar, completar, borrar; estado y caché por usuario |
| `src/app/features/tasks/tasks.constructor.service.ts` (+ spec) | Crear | Agrupado, orden, etiquetas de fecha y textos estáticos |
| `src/app/features/tasks/tasks-list/tasks-list.{ts,html,scss}` (+ spec) | Crear | Pantalla de lista y sus estados |
| `src/app/features/tasks/task-form/task-form.{ts,html,scss}` (+ spec) | Crear | Formulario crear/editar y confirmación de borrado |
| `src/app/shared/components/icon/icon.ts` (+ spec) | Modificar | Iconos nuevos: `plus`, `check`, `chevron-down`, `chevron-right`, `trash`, `calendar`, `clock-small` (reutiliza `clock`, `refresh`, `alert`, `wifi-off`) |
| `src/app/app.routes.ts` (+ spec) | Modificar | `''` → lista, `nueva` y `:id` → formulario (lazy); el test US-001-01 pasa a comprobar la lista |
| `src/app/features/home/*` | Eliminar | Sustituida por la lista |
| `docs/supabase.md` | Modificar | Sección de la tabla `tasks` y de sus políticas |

---

## Interfaces TypeScript

```typescript
// src/app/core/models/task.ts
export const TITLE_MAX = 120;
export const COMPLETED_DAYS = 30;

export interface Task {
  readonly id: string;
  readonly title: string;              // 1–120, sin espacios en los extremos
  readonly dueDate: string | null;     // 'YYYY-MM-DD' local
  readonly dueTime: string | null;     // 'HH:MM' local; solo con dueDate
  readonly completedAt: string | null; // instante ISO
  readonly createdAt: string;
}

export interface TaskInput {
  readonly title: string;
  readonly dueDate: string | null;
  readonly dueTime: string | null;     // se normaliza a null si no hay fecha
}

/** Fila tal como la devuelve Supabase (`due_time` llega como 'HH:MM:SS'). */
export interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  created_at: string;
}

// src/app/features/tasks/tasks.access.service.ts
export type TasksStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TaskOpResult = { ok: true } | { ok: false; reason: 'network' | 'unknown' };

// Señales públicas: status, tasks (del usuario actual), errorReason
// load(): Promise<void>                       // con plazo de 8 s
// create(input: TaskInput): Promise<TaskOpResult>
// update(id: string, input: TaskInput): Promise<TaskOpResult>
// setCompleted(id: string, done: boolean): Promise<TaskOpResult>   // optimista con reversión
// remove(id: string): Promise<TaskOpResult>                        // optimista con reversión
// get(id: string): Task | undefined

// src/app/features/tasks/tasks.constructor.service.ts
export type GroupKind = 'overdue' | 'today' | 'tomorrow' | 'date' | 'none';
export interface TaskGroup {
  readonly kind: GroupKind;
  readonly key: string;                 // 'YYYY-MM-DD' o el propio kind
  readonly label: string;               // «Atrasadas», «Hoy», «Mañana», «Jueves, 24 de octubre», «Sin fecha»
  readonly tasks: readonly Task[];
}
// group(tasks: readonly Task[]): { groups: TaskGroup[]; completed: Task[] }
```

`TaskOpResult`: `network` si el error es de red o de plazo; `unknown` en cualquier otro caso. Nunca se propaga el texto del error del servicio.

---

## Esquema SQL

```sql
-- supabase/migrations/<marca>_tasks.sql
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  due_date     date,
  due_time     time,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint tasks_title_len   check (char_length(title) between 1 and 120),
  constraint tasks_title_trim  check (title = btrim(title)),
  constraint tasks_time_needs_date check (due_time is null or due_date is not null)
);

create index tasks_user_due_idx       on public.tasks (user_id, due_date);
create index tasks_user_completed_idx on public.tasks (user_id, completed_at);

alter table public.tasks enable row level security;

-- Las sesiones anónimas usan el rol `authenticated`.
create policy tasks_select on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy tasks_update on public.tasks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tasks_delete on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.tasks from anon;

-- Rollback (manual, nueva migración):
--   drop table public.tasks;
```

Sin datos de ejemplo. `db push` contra el remoto solo tras verificar la cuenta de Supabase (organización por **id**) y con confirmación del usuario; después, prueba real de RLS con dos sesiones anónimas distintas.

---

## Pantallas

| Pantalla de Stitch | Componente | Datos | Acciones | Estados |
|---|---|---|---|---|
| `lista-de-tareas` | `TasksList` (`/`) | Grupos con contador, tarea (control, título, hora, «Atrasada»), sección Completadas | Completar/desmarcar, tocar tarea → `/:id`, «Nueva tarea» → `/nueva`, plegar Completadas, Reintentar | Carga (solo sin datos previos), vacío («Todo despejado por aquí» + «Crear primera tarea»), error (mensaje + Reintentar), aviso breve «Tarea completada» y avisos de error con reversión, Completadas vacía |
| `formulario-de-tarea` | `TaskForm` (`/nueva`, `/:id`) | Título con contador `n / 120` y motivo de validación, fecha (Hoy, Mañana, Elegir fecha, Quitar fecha), hora (deshabilitada sin fecha) | Guardar, cerrar sin guardar, Borrar (solo editar) → confirmación → borrar | Guardar deshabilitado con motivo, guardando, error al guardar (texto conservado), confirmación de borrado, tarea inexistente (vuelve a la lista) |

No se implementa lo marcado como ignorado en `design/README.md` (simulador, avatar, saludo, barra inferior, atajos de hora, etiquetas inventadas). El formulario en modo editar, la confirmación de borrado y los errores no estaban en el diseño: se construyen con los mismos tokens y componentes. Texto accesible en todos los controles; objetivos táctiles ≥ 44 px; botón «Nueva tarea» con margen de safe-area; teclado: el formulario hace scroll para que el campo y Guardar queden visibles.

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `scripts/tasks-migration.test.mjs` | RLS activa, `user_id` con `auth.uid()`, 4 políticas, longitudes, hora solo con fecha, `revoke` a `anon`, sin `insert into` de ejemplo | US-005-05 CA1 |
| `core/utils/local-date.spec.ts` | Día local cerca de medianoche y en cambio de mes/año, `addDays`, `formatTime` | US-005-02 CA3 |
| `tasks.access.service.spec.ts` | Cargar (consulta de 30 días, mapeo de `HH:MM:SS`), crear/editar/completar/borrar, duplicados permitidos, optimismo y reversión, caché por `userId`, cambio de usuario, plazo de 8 s, estados, nada en consola | US-005-01/02/03/04/05 |
| `tasks.constructor.service.spec.ts` | Grupos y su orden, grupos vacíos omitidos, hoy/mañana locales, orden dentro del día, completadas por fecha descendente, etiquetas, textos sin términos de gamificación | US-005-02 |
| `tasks-list.spec.ts` | Carga/vacío/error/reintentar, completar y desmarcar con aviso, error con reversión, plegar Completadas, navegación a crear y editar, accesibilidad (roles, nombre accesible, 44 px), `OnPush` | US-005-02/03 |
| `task-form.spec.ts` | Validación del título (vacío, espacios, 120/121), contador, fecha por defecto hoy, Hoy/Mañana/Elegir/Quitar, hora solo con fecha, guardar crear y editar, error conservando texto, borrado con confirmación, tarea inexistente, `OnPush` | US-005-01/04 |
| `icon.spec.ts`, `app.routes.spec.ts` | Iconos nuevos; rutas lazy `''`, `nueva`, `:id` | US-005-01/02 |

Cobertura objetivo: ≥ 80 % en `tasks.access.service.ts`. Además: revisión visual en navegador con la extensión de Chrome (claro y oscuro; carga, vacío, error, atrasadas, formulario con teclado y confirmación de borrado) y comprobación en Android con el emulador.

---

## Orden de implementación

1. Migración + test de script (Red → Green) y `docs/supabase.md`.
2. Modelo, utilidades de fecha y `CLOCK` (US-005-02 CA3).
3. `TasksConstructorService`: agrupado y orden (US-005-02).
4. `TasksAccessService`: cargar y caché por usuario, plazo (US-005-02, 05); después crear (US-005-01), completar (US-005-03), editar y borrar (US-005-04).
5. Iconos nuevos.
6. `TasksList`: estados, completar, navegación (US-005-02/03).
7. `TaskForm`: validación, fecha y hora, guardar, borrado (US-005-01/04).
8. Rutas, retirada de `Home` y ajuste del test US-001-01.
9. Verificación visual en navegador y Android; `db push` (previa verificación de cuenta y confirmación) y prueba de RLS real.

---

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| El selector nativo de fecha/hora se comporta distinto en el WebView de Android | Media | Verificar en el emulador; si falla, selector propio en una spec de ajuste |
| Sin red con el token caducado las consultas se cuelgan | Alta | Plazo propio de 8 s (`AbortSignal`) y error con Reintentar |
| Cambio de día con la app en segundo plano (Hoy/Mañana desfasados) | Media | Recalcular «hoy» al volver a primer plano y probarlo con reloj simulado |
| Fuga de datos entre usuarios en la caché | Baja | Caché indexada por `userId`; test de cambio de usuario; prueba real de RLS con dos sesiones |
| `db push` contra la cuenta equivocada | Baja | Verificar la organización por id y pedir confirmación antes de empujar |
| Fallos de reversión optimista dejan la lista incoherente | Media | Guardar copia previa y tests de fallo por operación |
