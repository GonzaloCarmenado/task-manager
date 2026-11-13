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

## Reglas

- Sin datos reales ni seeds con información personal en las migraciones.
- La app solo accede a Supabase a través de `SupabaseService` (`src/app/core/services/supabase.ts`), desde los `*.access.service.ts`. ESLint prohíbe importar `@supabase/supabase-js` en otro sitio.
- Secretos y credenciales: ver la sección "Seguridad y secretos" de `CLAUDE.md`.

## Estado

Todavía no hay migraciones: el modelo de datos (tareas, XP, rachas…) llegará con las siguientes specs.
