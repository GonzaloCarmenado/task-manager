-- Spec 008: la mejor racha debe contar la racha COMPLETA que contiene el día completado.
-- Antes solo contaba los días hasta ese día, así que completar un día anterior a otros ya
-- completados (cambio de zona horaria o de fecha del teléfono) infravaloraba la mejor racha.

-- Días consecutivos de la racha que contiene p_day, mirando hacia atrás y hacia delante
-- (0 si ese día no tiene tareas completadas).
create function public.streak_run(p_user uuid, p_day date) returns integer
language sql stable security definer set search_path = public as $$
  with days as (
    select distinct completed_day as d from public.tasks
    where user_id = p_user and completed_day is not null
  ), runs as (
    select d, d - (row_number() over (order by d))::integer as g from days
  )
  select coalesce(count(*) filter (where g = (select g from runs where d = p_day)), 0)::integer from runs;
$$;

create or replace function public.tasks_progress_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.completed_at is null and new.completed_at is not null then
    if new.xp_awarded > 0 then
      insert into public.xp_events (user_id, task_id, day, delta)
        values (new.user_id, new.id, new.xp_day, new.xp_awarded);
    end if;
    insert into public.player_stats (user_id, total_xp, best_streak)
      values (new.user_id, new.xp_awarded, public.streak_run(new.user_id, new.completed_day))
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

-- Solo get_progress es invocable desde el cliente.
revoke execute on function public.streak_run(uuid, date) from public, anon, authenticated;

-- Rollback (manual, con una nueva migración): restaurar tasks_progress_after de la migración
-- `progress` (usa streak_ending) y después `drop function public.streak_run(uuid, date);`.
