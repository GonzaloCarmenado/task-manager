# Supabase

El backend es Supabase. **El esquema de la base de datos se define solo con migraciones SQL versionadas** en `supabase/migrations/`. Nunca se cambia desde el panel web: si alguien lo hace, el repo deja de ser reproducible.

Quien clone este repo puede crear todas las tablas en **su propio proyecto Supabase** siguiendo estos pasos.

## 1. Tu propio proyecto

1. Crea un proyecto en <https://supabase.com/dashboard> (cuenta propia).
2. Inicia sesión en la CLI **en una terminal normal** (abre el navegador): `pnpm exec supabase login`.
3. Vincula el repo con tu proyecto (el *project ref* es el identificador de la URL `https://<ref>.supabase.co`):

   ```bash
   pnpm exec supabase link --project-ref <ref>
   ```

   El enlace se guarda en `supabase/.temp/` (ignorado por git).

## 2. Configuración de la app

```bash
pnpm env:init     # crea src/environments/environment.ts desde el ejemplo (ya lo hace pnpm install)
```

Edita `src/environments/environment.ts` (ignorado por git) con la URL de tu proyecto y su clave **publishable/anon**. **Nunca** uses la clave `service_role` ni subas este fichero.

## 3. Migraciones

| Comando | Qué hace |
|---|---|
| `pnpm db:new <nombre>` | Crea `supabase/migrations/<timestamp>_<nombre>.sql` vacía |
| `pnpm db:status` | Lista migraciones locales y remotas |
| `pnpm db:push:dry` | Simula la subida (no escribe nada) |
| `pnpm db:push` | Aplica las migraciones pendientes en el proyecto remoto |
| `pnpm db:pull` | Trae el esquema remoto como migración (solo si alguien cambió algo fuera del flujo) |

Flujo de trabajo: `db:new` → escribir el SQL → revisarlo → `db:push:dry` → `db:push`. Cada tabla nueva lleva su **RLS** en la misma migración.

> La CLI 3.x apunta por defecto al entorno **local** (Docker). Por eso los scripts `db:*` usan `--remote` de forma explícita.

## Sesión anónima (spec 003)

La app crea **sola y en silencio** un usuario anónimo en Supabase en el primer arranque: una fila en `auth.users` con `is_anonymous = true`, sin correo ni contraseña. Es una identidad técnica, no una cuenta; registrarse, iniciar sesión en otro móvil y recuperar el progreso llegan con la spec de cuenta.

### Habilitarla en tu proyecto

La intención está versionada en `supabase/config.toml` (`enable_anonymous_sign_ins = true`, con el límite `anonymous_users` por hora e IP), pero **ese fichero es la plantilla por defecto de `supabase init`**, no un reflejo de tu proyecto. Antes de aplicar nada, mira qué cambiaría:

```bash
pnpm exec supabase config diff   # solo lectura
```

Con un proyecto real, `supabase config push` aplica **todas** las diferencias, no solo el registro anónimo. En el proyecto de desarrollo del repo habría desactivado la confirmación de email, el MFA y la confirmación por SMS, y cambiado `site_url`, el OTP y el pooler. **No uses `config push` sin revisar el diff.**

La forma segura de habilitar solo lo necesario es el panel: *Authentication → Sign In / Providers → Allow anonymous sign-ins*. Después comprueba que la única diferencia relacionada con el registro anónimo ha desaparecido (`config diff`) y ejecuta `pnpm verify:auth` (manual; crea un usuario anónimo real y solo imprime booleanos). Si el registro anónimo no está habilitado, la app muestra la pantalla «Servicio no disponible».

### Políticas RLS

Un usuario anónimo tiene el rol `authenticated`, así que `TO authenticated` y `auth.uid()` funcionan igual que con una cuenta:

```sql
create policy "datos propios" on public.mi_tabla
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

Para distinguir a los anónimos de las cuentas permanentes en una política:

```sql
-- solo cuentas permanentes
using ((auth.jwt() ->> 'is_anonymous')::boolean is false)
```

### Contrato de `ready` y de `userId` (para las capas de datos)

- `AuthAccessService` es el único que toca `supabase.auth`. Expone `status`, `userId`, `errorReason` y `autoRetryPending` como señales de solo lectura.
- **`ready` significa que hay identidad (`userId`), no que haya conexión ni un token vigente.** Con una sesión guardada la app abre al instante, aunque el token haya caducado y no haya red.
- Sin red y con el token caducado, `supabase-js` tarda **~25 s** en rendirse y devuelve sin sesión; durante ese tiempo **las consultas a datos también esperan**. Cada capa de datos debe aplicar **plazos propios** y tratar los 401 y el modo sin red por su cuenta.
- **Indexa los datos y las cachés por `userId()`.** Cambia solo si el servidor rechaza la sesión (se crea una identidad nueva): descarta entonces lo que perteneciera al `uid` anterior.
- No uses `getSession()` para decidir el arranque; la sesión guardada se lee directamente (`AUTH_STORAGE_KEY`, en `core/services/supabase.ts`).

### Comprobaciones manuales

| Comando | Qué comprueba |
|---|---|
| `pnpm verify:auth` | Contra tu proyecto real: el `uid` de `getUser()` coincide, `is_anonymous` es `true` y el claim `role` del token es `authenticated`. Solo imprime booleanos |
| `pnpm verify:supabase` | Local, sin red: los supuestos sobre `supabase-js` (ciclo de refresco de 30 s, enfriamiento de 60 s, `SIGNED_OUT` ante un rechazo definitivo, arranque sin red). Ejecútalo al actualizar la librería |

## Reglas

- Sin datos reales ni seeds con información personal en las migraciones.
- La app solo accede a Supabase a través de `SupabaseService` (`src/app/core/services/supabase.ts`), desde los `*.access.service.ts`. ESLint prohíbe importar `@supabase/supabase-js` en otro sitio.
- Secretos y credenciales: ver la sección "Seguridad y secretos" de `CLAUDE.md`.

## Tabla `tasks` (spec 005)

Migración `*_tasks.sql`. Una fila por tarea de un usuario:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` | clave primaria |
| `user_id` | `uuid` | por defecto `auth.uid()`; borrado en cascada con el usuario |
| `title` | `text` | 1 a 120 caracteres, sin espacios en los extremos |
| `due_date` | `date` | opcional; día local `YYYY-MM-DD` |
| `due_time` | `time` | opcional y **solo con `due_date`** |
| `completed_at` | `timestamptz` | `null` = pendiente |
| `created_at` | `timestamptz` | por defecto `now()` |
| `postponed_count` | `integer` | spec 007: veces pospuesta (por defecto 0, nunca negativa). Rollback: `alter table public.tasks drop column postponed_count;` |

**RLS**: una política por operación (`select`, `insert`, `update`, `delete`), todas `to authenticated` y con `user_id = (select auth.uid())`. Las sesiones anónimas usan el rol `authenticated`. Se revoca todo a `anon`. La app solo accede desde `TasksAccessService`.

Rollback: una nueva migración con `drop table public.tasks;`.

Verificación real (manual): `pnpm verify:rls` crea dos sesiones anónimas y comprueba que una no ve, edita, borra ni crea tareas de la otra, que sin sesión no se accede a nada y que se rechazan los títulos inválidos y la hora sin fecha; borra lo que crea y nunca imprime claves ni ids.

### Progreso (spec 008)

El progreso lo calcula la **base de datos**: el cliente solo envía el **día local** al completar una tarea (`completed_day`) y lee el resultado con `get_progress(hoy)`.

- Columnas nuevas en `tasks`: `completed_day` (día local en que se completó; es `null` si y solo si `completed_at` lo es), `xp_awarded` (0 a 10) y `xp_day`. Las escribe el disparador, no el cliente.
- `player_stats` (XP total y mejor racha, una fila por usuario) y `xp_events` (libro de movimientos de XP por día): **solo lectura** desde el cliente, con RLS por `user_id`; las escribe el disparador (`security definer`, `search_path` fijado).
- **Reglas**: una tarea completada da 10 XP, con tope de **100 XP por día local** (suma del libro de ese día). Desmarcarla quita el XP que dio, en el día en que se concedió. Volver a completarla lo da otra vez, respetando el tope. Borrar una tarea completada **no** quita XP.
- **Racha**: se deriva de los días con alguna tarea completada (`streak_ending`); la mejor racha solo sube.
- Solo `get_progress(date)` es ejecutable desde el cliente; las demás funciones no.
- Las tareas completadas antes de esta migración conservan su día (en UTC) y no dan XP.
- Rollback: ver el final de la migración `<marca>_progress.sql`. La migración `<marca>_progress_best_streak.sql` corrige la mejor racha (cuenta la racha completa que contiene el día completado).

## Cuenta de usuario (spec 011)

- Registro e inicio de sesión con **nombre de usuario + contraseña**, sin correo, sin verificación y sin recuperación. Internamente el nombre se guarda como `<usuario>@cuenta.invalid` (TLD reservado: nunca resuelve ni recibe correo); la persona no lo ve.
- Vincular la sesión anónima (`updateUser`) conserva el mismo `user_id`: tareas y progreso siguen siendo suyos.
- **Configuración remota (panel de Supabase, la hace el propietario; no se versiona)**: Authentication → Providers → Email: desactivar «Confirm email» y fijar longitud mínima de contraseña en 8. Sin esto, vincular deja la cuenta pendiente de verificar.
- Migración `<marca>_account.sql`: `delete_my_account()` (security definer, solo `authenticated` y no anónimo; borra `auth.users` y las tablas de datos caen en cascada). Rollback al final del fichero.
- Verificación real (manual): `pnpm verify:account` crea una cuenta de prueba aleatoria, la vincula, cambia la contraseña, la borra y comprueba que una sesión anónima no puede borrar. Solo imprime booleanos; no deja usuarios de prueba.
- **No se puede cambiar el nombre de usuario** (US-011-07 descartada tras el spike): el servicio rechaza (`email_address_invalid`) cambiar el identificador a una dirección `.invalid`. Quien quiera otro nombre crea una cuenta nueva.
- **Cerrar sesión** usa `signOut({ scope: 'local' })`: la librería quita la sesión local antes de la petición, así que solo se rechaza antes de empezar si el móvil declara estar sin conexión. Un fallo al revocar el token en el servidor no impide cerrar.
- **Iniciar sesión** va en dos fases con un cliente «sonda» (sin persistencia, almacenamiento en memoria): comprueba credenciales sin tocar la sesión anónima; solo `completeSignIn` cambia de identidad.
- Las contraseñas y los identificadores internos no se escriben nunca en consola ni en el repo.

## Estado

Migraciones: `tasks` (spec 005), `tasks_postponed_count` (007), `progress` y `progress_best_streak` (008), todas aplicadas al remoto y verificadas con `verify:rls` y `verify:progress`. La identidad anónima ya existe (spec 003).
