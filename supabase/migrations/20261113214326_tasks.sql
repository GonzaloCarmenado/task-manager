-- Spec 005: tareas básicas. Una tabla por usuario con RLS en la misma migración.

create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  due_date     date,
  due_time     time,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  constraint tasks_title_len       check (char_length(title) between 1 and 120),
  constraint tasks_title_trim      check (title = btrim(title)),
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
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_delete on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.tasks from anon;

-- Rollback (manual, con una nueva migración):
--   drop table public.tasks;
