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
