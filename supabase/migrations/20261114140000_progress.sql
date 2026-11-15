-- Spec 008: gamificación (XP, niveles y rachas). El progreso lo calcula la base de datos con
-- disparadores sobre `tasks`; el cliente solo envía el día local y lee `get_progress`.
-- RLS de las tablas nuevas en la misma migración; el cliente solo puede leer.

alter table public.tasks
  add column completed_day date,
  add column xp_awarded smallint not null default 0,
  add column xp_day date;

-- Las tareas ya completadas conservan su fecha (en UTC: aún no se conocía el día local) y no dan XP.
update public.tasks set completed_day = (completed_at at time zone 'UTC')::date
  where completed_at is not null;

alter table public.tasks
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
  task_id    uuid,
  day        date not null,
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
grant select on public.player_stats, public.xp_events to authenticated;

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
    new.xp_awarded := 0;
    new.xp_day := null;
    new.completed_at := null;
    new.completed_day := null;
    return new;
  end if;
  if old.completed_at is null and new.completed_at is not null then
    select coalesce(sum(delta), 0) into used from public.xp_events
      where user_id = new.user_id and day = new.completed_day;
    new.xp_awarded := greatest(0, least(10, 100 - used));
    new.xp_day := new.completed_day;
  elsif old.completed_at is not null and new.completed_at is null then
    new.xp_awarded := 0;
    new.xp_day := null;
    new.completed_day := null;
  else
    new.xp_awarded := old.xp_awarded;
    new.xp_day := old.xp_day;
    new.completed_day := old.completed_day;
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

-- Rollback (manual, con una nueva migración):
--   drop trigger tasks_progress_after on public.tasks;
--   drop trigger tasks_progress_before on public.tasks;
--   drop function public.get_progress(date), public.tasks_progress_after(),
--     public.tasks_progress_before(), public.streak_ending(uuid, date);
--   drop table public.xp_events, public.player_stats;
--   alter table public.tasks drop column completed_day, drop column xp_awarded, drop column xp_day;
