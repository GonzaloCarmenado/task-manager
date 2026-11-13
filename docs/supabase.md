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

## Estado

Todavía no hay migraciones: el modelo de datos (tareas, XP, rachas…) llegará con las siguientes specs. La identidad anónima ya existe (spec 003).
