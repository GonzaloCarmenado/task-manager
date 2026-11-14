# Plan 008 — Gamificación: XP, niveles y rachas

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: [design/](./design/README.md), generado a partir de [stitch-prompt.md](./stitch-prompt.md)
**Estado**: Aprobado (2026-11-14)
**Fecha**: 2026-11-14

---

## Enfoque técnico

El progreso lo **calcula la base de datos**, de forma atómica, mediante disparadores sobre `tasks`; el cliente solo envía lo que ocurre (completar con su **día local**, o desmarcar) y **lee** el resultado con una función `get_progress(hoy)`. Así completar, desmarcar, el tope diario y la racha no dependen del móvil ni se pueden desincronizar.

- **XP**: al pasar una tarea de pendiente a completada, el disparador `BEFORE` fija `xp_awarded` = lo que falte hasta 10 sin pasar de **100 XP en el día** (suma del libro `xp_events` de ese día local) y `xp_day`; el disparador `AFTER` anota el movimiento en `xp_events` y actualiza `player_stats`. Al desmarcar, se anota el movimiento negativo **en el día en que se concedió** y se resta del total (sin bajar de 0). El libro de movimientos es lo que hace que el tope no se pueda saltar creando y borrando tareas.
- **Integridad**: los disparadores ignoran lo que el cliente intente escribir en `xp_awarded`, `xp_day` y `completed_day` salvo en la transición de completar. `player_stats` y `xp_events` solo se leen desde el cliente (sin políticas de escritura); las escribe el disparador (`security definer`).
- **Racha**: se **deriva** de los días (`completed_day`) con al menos una tarea completada, contando días consecutivos hasta hoy (o hasta ayer si hoy aún no hay ninguna). La **mejor racha** se guarda en `player_stats` y solo sube. `completed_day` lo envía el cliente en hora local (la base de datos no conoce la zona horaria del usuario).
- **Nivel**: solo se calcula en el cliente a partir de `total_xp` (`25·N·(N−1)` XP para alcanzar el nivel N). La **subida de nivel** y la celebración se deciden comparando el progreso antes y después de completar, **con el dato confirmado por el servidor** (sin XP inventado sin red).
- **Borrar** una tarea completada **no quita XP** (el libro lo conserva) y quita ese día de la racha si era la única completada; decisión del plan, anotada en el `review.md`.

Es la **tercera** spec: se implementa tras la 006 y la 007. La migración cambia el contrato de `tasks` (completar exige enviar `completed_day`): el cliente se adapta primero y la migración se sube al final.

---

## Ficheros afectados

| Ruta | Acción | Descripción |
|---|---|---|
| `supabase/migrations/<marca>_progress.sql` | Crear | Columnas de `tasks`, `player_stats`, `xp_events`, funciones, disparadores y RLS |
| `scripts/progress-migration.test.mjs` | Crear | Comprueba RLS, solo lectura desde el cliente, restricciones, disparadores y funciones sin ejecución pública |
| `scripts/verify-progress.mjs` | Crear | Prueba real (manual) con sesiones anónimas: XP, tope, desmarcar, racha, aislamiento |
| `src/app/core/models/progress.ts` | Crear | `Progress`, constantes (`XP_PER_TASK = 10`, `DAILY_XP_CAP = 100`) y `ProgressRow` |
| `src/app/features/progress/progress.access.service.ts` (+ spec) | Crear | Lee `get_progress`, caché por `userId`, detecta la celebración y la subida de nivel |
| `src/app/features/progress/progress.constructor.service.ts` (+ spec) | Crear | Curva de niveles, XP hacia el siguiente, textos |
| `src/app/features/progress/progress-summary/` | Crear | Franja de la lista |
| `src/app/features/progress/progress-screen/` | Crear | Pantalla de progreso (`/progreso`) |
| `src/app/features/progress/level-up/` | Crear | Pantalla de subida de nivel (`/nivel/:level`) |
| `src/app/features/progress/celebration/` | Crear | Celebración breve «+10 XP» / tope / «−10 XP» |
| `src/app/features/tasks/tasks.access.service.ts` (+ spec) | Modificar | `setCompleted` envía `completed_day` local; refresca el progreso |
| `src/app/features/tasks/tasks-list/` | Modificar | Resumen, celebración y avisos de XP |
| `src/app/app.routes.ts` (+ spec) | Modificar | Rutas `progreso` y `nivel/:level` **antes** de `:id` |
| `src/app/shared/components/icon/icon.ts` (+ spec) | Modificar | Iconos `flame`, `star`, `trophy` |
| `scripts/verify-rls.mjs`, `docs/supabase.md`, `CLAUDE.md` | Modificar | Tablas nuevas, nuevo script y comandos |

---

## Interfaces TypeScript

```typescript
// core/models/progress.ts
export const XP_PER_TASK = 10;
export const DAILY_XP_CAP = 100;

export interface Progress {
  readonly totalXp: number;
  readonly level: number;            // derivado de totalXp en el cliente
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;   // XP que dura el nivel actual
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly xpToday: number;          // 0 a 100
  readonly lastCompletedDay: string | null;
}

/** Respuesta de `get_progress` (nombres de la base de datos). */
export interface ProgressRow {
  total_xp: number; best_streak: number; current_streak: number;
  xp_today: number; last_completed_day: string | null;
}

// progress.constructor.service.ts
// xpToReach(level: number): number                       // 25·N·(N−1)
// levelOf(totalXp: number): number                       // floor((1 + sqrt(1 + 0.16·totalXp)) / 2)
// toProgress(row: ProgressRow): Progress
// celebration(before: Progress | null, after: Progress, done: boolean): Celebration

export interface Celebration {
  readonly xpDelta: number;          // +10, 0 con tope, −10 al desmarcar
  readonly capped: boolean;
  readonly streakDays: number | null; // solo si es la primera tarea del día
  readonly leveledUpTo: number | null;
}

// progress.access.service.ts (señales: progress, status, celebration, levelUp)
// load(): Promise<void>                                   // get_progress(hoy local), plazo de 8 s, caché por userId
// afterToggle(done: boolean, before: Progress | null): Promise<void>   // recarga y emite la celebración o el aviso
// dismissCelebration(): void
```

---

## Esquema SQL

```sql
-- supabase/migrations/<marca>_progress.sql

alter table public.tasks
  add column completed_day date,
  add column xp_awarded smallint not null default 0,
  add column xp_day date,
  add constraint tasks_completed_day_pair check ((completed_at is null) = (completed_day is null)),
  add constraint tasks_xp_range check (xp_awarded between 0 and 10);

create table public.player_stats (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  total_xp    integer not null default 0 check (total_xp >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  updated_at  timestamptz not null default now()
);

create table public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  task_id    uuid,                         -- sin clave foránea: el movimiento sobrevive al borrado de la tarea
  day        date not null,                -- día local en que se concedió (o se quita)
  delta      smallint not null,
  created_at timestamptz not null default now()
);
create index xp_events_user_day_idx on public.xp_events (user_id, day);

alter table public.player_stats enable row level security;
alter table public.xp_events    enable row level security;
create policy player_stats_select on public.player_stats for select to authenticated
  using (user_id = (select auth.uid()));
create policy xp_events_select on public.xp_events for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.player_stats, public.xp_events from anon, authenticated;
grant select on public.player_stats, public.xp_events to authenticated;   -- sin escritura desde el cliente

-- Días consecutivos que terminan en p_day (0 si ese día no tiene tareas completadas).
create function public.streak_ending(p_user uuid, p_day date) returns integer
language sql stable security definer set search_path = public as $$
  with days as (
    select distinct completed_day as d from public.tasks
    where user_id = p_user and completed_day is not null and completed_day <= p_day
  ), runs as (
    select d, d - (row_number() over (order by d))::integer as g from days
  )
  select coalesce(count(*) filter (where g = (select g from runs where d = p_day)), 0)::integer from runs;
$$;

create function public.tasks_progress_before() returns trigger
language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  if tg_op = 'INSERT' then
    new.xp_awarded := 0; new.xp_day := null;
    return new;
  end if;
  if old.completed_at is null and new.completed_at is not null then
    select coalesce(sum(delta), 0) into used from public.xp_events
      where user_id = new.user_id and day = new.completed_day;
    new.xp_awarded := greatest(0, least(10, 100 - used));
    new.xp_day := new.completed_day;
  elsif old.completed_at is not null and new.completed_at is null then
    new.xp_awarded := 0; new.xp_day := null; new.completed_day := null;
  else
    new.xp_awarded := old.xp_awarded; new.xp_day := old.xp_day; new.completed_day := old.completed_day;
  end if;
  return new;
end $$;

create function public.tasks_progress_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    if new.xp_awarded > 0 then
      insert into public.xp_events (user_id, task_id, day, delta)
        values (new.user_id, new.id, new.xp_day, new.xp_awarded);
    end if;
    insert into public.player_stats (user_id, total_xp, best_streak)
      values (new.user_id, new.xp_awarded, public.streak_ending(new.user_id, new.completed_day))
      on conflict (user_id) do update
        set total_xp = public.player_stats.total_xp + excluded.total_xp,
            best_streak = greatest(public.player_stats.best_streak, excluded.best_streak),
            updated_at = now();
  elsif old.completed_at is not null and new.completed_at is null and old.xp_awarded > 0 then
    insert into public.xp_events (user_id, task_id, day, delta)
      values (new.user_id, new.id, old.xp_day, -old.xp_awarded);
    update public.player_stats
      set total_xp = greatest(0, total_xp - old.xp_awarded), updated_at = now()
      where user_id = new.user_id;
  end if;
  return null;
end $$;

create trigger tasks_progress_before before insert or update on public.tasks
  for each row execute function public.tasks_progress_before();
create trigger tasks_progress_after after update on public.tasks
  for each row execute function public.tasks_progress_after();

create function public.get_progress(p_today date) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total_xp',           coalesce((select total_xp from public.player_stats where user_id = auth.uid()), 0),
    'best_streak',        coalesce((select best_streak from public.player_stats where user_id = auth.uid()), 0),
    'current_streak',     case when public.streak_ending(auth.uid(), p_today) > 0
                               then public.streak_ending(auth.uid(), p_today)
                               else public.streak_ending(auth.uid(), p_today - 1) end,
    'xp_today',           coalesce((select sum(delta) from public.xp_events where user_id = auth.uid() and day = p_today), 0),
    'last_completed_day', (select max(completed_day) from public.tasks where user_id = auth.uid())
  );
$$;

-- Solo get_progress es invocable desde el cliente; las demás funciones no.
revoke execute on function public.streak_ending(uuid, date), public.tasks_progress_before(),
  public.tasks_progress_after(), public.get_progress(date) from public, anon, authenticated;
grant execute on function public.get_progress(date) to authenticated;

-- Rollback (nueva migración):
--   drop trigger tasks_progress_after on public.tasks; drop trigger tasks_progress_before on public.tasks;
--   drop function public.get_progress(date), public.tasks_progress_after(), public.tasks_progress_before(),
--     public.streak_ending(uuid, date);
--   drop table public.xp_events, public.player_stats;
--   alter table public.tasks drop column completed_day, drop column xp_awarded, drop column xp_day;
```

Sin datos de ejemplo. `db push` previa verificación de la cuenta por id y con confirmación; antes, el cliente ya envía `completed_day`.

---

## Pantallas

| Pantalla de Stitch | Componente | Datos / acciones / estados |
|---|---|---|
| `lista-de-tareas` (franja) | `ProgressSummary` | Nivel, barra «X / Y XP» y racha («N días seguidos»; con «completa 1 tarea hoy para mantenerla» si la racha sigue viva); tocarla abre `/progreso`. Carga sin bloquear la lista y último dato conocido o «Reintentar» si falla |
| `pantalla-de-progreso` | `ProgressScreen` (`/progreso`) | Nivel, XP total, XP para el siguiente nivel, racha actual y mejor racha, **XP de hoy (X / 100)**, mensaje para usuario nuevo; atrás y cerrar |
| `celebracion-y-subida-de-nivel` | `LevelUp` (`/nivel/:level`) | Nivel nuevo y enhorabuena; **Continuar** o tocar en cualquier parte; atrás vuelve a la lista |
| (sin diseño) celebración | `Celebration` | «+10 XP» y «Llevas N días» (primera tarea del día), «Hoy ya has llegado al tope de XP», «−10 XP» al desmarcar; ≈ 1 s, no bloquea, estática con `prefers-reduced-motion`, sin sonido ni vibración |

Ignorado según `design/README.md`: simuladores, misiones, logros, tienda, perfil, rangos con nombre, «Actividad reciente», «Compañero de Metas», contador de tareas y «+25 XP».

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `scripts/progress-migration.test.mjs` | RLS solo lectura, sin escritura desde el cliente, restricciones, disparadores `before` y `after`, funciones sin ejecución pública salvo `get_progress`, sin `insert` de ejemplo | US-008-01 a 03 |
| `scripts/verify-progress.mjs` (real) | 10 XP al completar; desmarcar los quita; volver a completar los da otra vez; el bucle no genera XP; tope de 100 XP/día y tarea con 0 XP; quitar el XP del día de concesión; racha de 3 días, romperla al desmarcar el único de un día, mejor racha que no baja; borrar conserva el XP; aislamiento entre usuarios; el cliente no puede escribir en `player_stats` ni falsear `xp_awarded` | US-008-01 a 03 |
| `progress.constructor.service.spec.ts` | `25·N·(N−1)` y `levelOf` (cada umbral y los bordes), XP hacia el siguiente nivel, la subida y la bajada de nivel, `celebration()` (con tope, primera del día, desmarcar), textos sin términos técnicos | US-008-02, 05 |
| `progress.access.service.spec.ts` | `get_progress` con el día local, caché por `userId`, plazo de 8 s, errores y último dato, `afterToggle`, subida de nivel solo al subir, nada en consola | US-008-01, 02, 04 |
| `tasks.access.service.spec.ts` | `setCompleted` envía `completed_day` local (23:59, 00:01) y la tarea sigue sin XP inventado sin red | US-008-01, 03 |
| `progress-summary.spec.ts`, `progress-screen.spec.ts`, `level-up.spec.ts`, `celebration.spec.ts` | Estados (carga, error, usuario nuevo, racha viva y rota), accesibilidad, `OnPush`, `prefers-reduced-motion`, sin elementos de prototipo | US-008-04, 05 |
| `tasks-list.spec.ts`, `app.routes.spec.ts` | Resumen y celebración en la lista; rutas `progreso` y `nivel/:level` antes de `:id` | US-008-04 |

Cobertura ≥ 80 % en `progress.access.service.ts`. Revisión visual en navegador (claro y oscuro) y Android. `pnpm verify:progress` tras `db push`.

---

## Orden de implementación

1. Test de la migración y SQL (sin subirla); `verify-progress.mjs` escrito para ejecutarlo tras el `db push`.
2. Modelo, `ProgressConstructorService` (curva, nivel, celebración).
3. `TasksAccessService.setCompleted` con `completed_day` (tests de la 005 actualizados).
4. `ProgressAccessService`.
5. Iconos y componentes (resumen, celebración, progreso, subida de nivel) y rutas.
6. Integración en la lista.
7. `db push` (verificar cuenta por id, `db:push:dry` y confirmación), `verify:progress` y `verify:rls`.
8. Verificación en navegador y emulador; documentación.

---

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Un fallo en los disparadores rompe completar tareas | Media | Test de la migración, prueba real `verify:progress` antes de dar por buena la spec y SQL simple |
| La migración rompe a un cliente antiguo (`completed_day` obligatorio con `completed_at`) | Media | Cliente adaptado primero y migración al final; los datos de prueba se borran |
| El «día local» lo envía el cliente y puede ser falso | Baja | Aceptado: es una app personal sin clasificaciones; el tope sigue limitado por día enviado |
| Racha desfasada por cambios de zona horaria | Media | El día se fija al completar; no se recalcula con la zona actual |
| El nivel baja al desmarcar y desconcierta | Baja | Decisión del usuario; se actualiza solo el resumen, sin pantalla |
| Borrar una tarea completada cambia la racha pero no el XP | Baja | Decisión documentada; avisarlo en el `review.md` |
| Funciones `security definer` mal protegidas | Baja | `search_path` fijado y sin ejecución pública, comprobado en el test de la migración |
