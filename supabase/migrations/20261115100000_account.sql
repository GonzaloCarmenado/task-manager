-- Spec 011: cuenta de usuario.
-- La cuenta (nombre de usuario + contraseña) vive en Supabase Auth; aquí solo se añade el borrado
-- de la propia cuenta. Las tablas de datos ya se borran en cascada con `auth.users`.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  anonymous boolean;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select is_anonymous into anonymous from auth.users where id = uid;
  if anonymous is distinct from false then
    raise exception 'anonymous sessions cannot delete an account' using errcode = '42501';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Rollback:
--   drop function public.delete_my_account();
