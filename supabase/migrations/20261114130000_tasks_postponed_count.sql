-- Spec 007: contador de veces que se pospone una tarea.
-- Las políticas RLS de la spec 005 ya cubren la columna (por fila).

alter table public.tasks
  add column postponed_count integer not null default 0,
  add constraint tasks_postponed_count_nonneg check (postponed_count >= 0);

-- Rollback (manual, con una nueva migración):
--   alter table public.tasks drop column postponed_count;
