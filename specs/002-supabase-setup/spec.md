# Spec 002 — Conexión con Supabase

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-13
**Estado**: Implementada

---

## Objetivo

Dejar el proyecto vinculado a un proyecto Supabase propio (CLI, estructura de migraciones y cliente en Angular), sin tablas ni autenticación todavía, para que toda evolución posterior del esquema pase por migraciones desde el primer día.

---

## Contexto

- Spec 001 implementada: Angular 22 zoneless + Tauri Android; no hay backend ni capa de datos.
- Referencia: proyecto privado anterior (`supabase/`, `core/services/supabase`, `environment.ts` ignorado por git).
- Supabase CLI 3.1.0 disponible vía `npx` y **sesión iniciada** en esta máquina. Docker 29 instalado (necesario solo para `supabase start`/`db diff` local).
- La cuenta tiene 3 proyectos ajenos a esta app (2 `ACTIVE_HEALTHY`, 1 `INACTIVE`), en 2 organizaciones. El plan gratuito limita a 2 proyectos activos: crear uno nuevo puede exigir plan de pago o pausar otro.
- El repo es **público**: ninguna clave puede entrar en git.
- La CLI debe estar iniciada con la cuenta del propietario del proyecto (ver `CLAUDE.md` → "Cuenta de Supabase"); verificarlo antes de `link`/`db push`.

---

## Historias de usuario

### US-002-01 — Proyecto Supabase dedicado y vinculado (P1)

**Como** desarrollador, **quiero** un proyecto Supabase exclusivo de esta app vinculado al repo, **para** gestionar el esquema con migraciones versionadas.

**Criterios de aceptación:**
- Existe un proyecto remoto dedicado (creado por el usuario, región `eu-north-1`) y `supabase link` lo asocia al repo.
- `supabase/config.toml` versionado con `project_id = "task-manager"` (nombre local; no tiene por qué coincidir con el nombre del proyecto remoto).
- `supabase/.temp/` y cualquier fichero con ref/credenciales de enlace quedan fuera de git.
- La contraseña de la base de datos se genera aleatoria y **no** se guarda en el repo ni en el chat; el usuario la custodia.
- El proyecto remoto lo crea el usuario en el panel (puede tener coste); Claude solo lo vincula.

### US-002-02 — CLI y flujo de migraciones (P1)

**Criterios de aceptación:**
- `supabase` como devDependency (pnpm), versión fijada; scripts `db:link`, `db:push`, `db:pull`, `db:new`, `db:status` en `package.json`.
- `supabase/migrations/` existe en git (con `.gitkeep`); no se crea ninguna migración de tablas en esta spec.
- `pnpm db:push --dry-run` termina sin errores contra el proyecto vinculado.
- Documentado en `docs/supabase.md` el flujo: crear migración → revisar SQL → `db:push`; nunca cambiar esquema desde el panel web.

### US-002-03 — Configuración por entorno sin secretos en git (P1)

**Criterios de aceptación:**
- `src/environments/environment.ts` (ignorado por git) contiene `supabaseUrl` y `supabaseKey` (clave *publishable/anon*).
- `src/environments/environment.example.ts` versionado con placeholders; script `env:init` lo copia si falta y se ejecuta antes de `start` y `build`.
- La app **nunca** usa la clave `service_role`.
- Una clonación limpia + `pnpm install && pnpm env:init` compila (con placeholders) y los tests pasan sin red.

### US-002-04 — Cliente Supabase en Angular (P1)

**Como** desarrollador, **quiero** un único servicio que cree el cliente, **para** que los `access.service` lo inyecten y nada más importe `@supabase/supabase-js` directamente.

**Criterios de aceptación:**
- `SupabaseService` (`core/services/supabase.ts`) expone el cliente creado a partir del token `SUPABASE_CONFIG` (`InjectionToken`), proporcionado en `app.config.ts` desde `environment`.
- Opciones de auth: `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false` (no hay redirecciones web en Tauri).
- Si `url` o `key` están vacías o son los placeholders del ejemplo, el servicio lanza un error claro al instanciarse.
- Solo los `*.access.service.ts` pueden depender de `SupabaseService` (regla de ESLint `no-restricted-imports` para `@supabase/supabase-js` fuera de `core/services/supabase.ts`).

### US-002-05 — Conectividad verificada en navegador y Android (P2)

**Criterios de aceptación:**
- Se comprueba con una consulta real (p. ej. `auth.getSession()` o `GET /auth/v1/health`) que el cliente alcanza el proyecto desde el navegador (viewport móvil) **y** desde el APK en el emulador.
- Sin pantalla nueva: la comprobación es manual/en consola; no se añade UI.
- La CSP de Tauri permite `https://*.supabase.co` (hoy `csp: null`; se deja explícito o se documenta por qué no se restringe aún).

---

## Plan de tests (TDD)

| Test | Criterio | Fichero | Tipo |
|---|---|---|---|
| `US-002-04 crea el cliente con url y key del token` | CA 1 | `src/app/core/services/supabase.spec.ts` | unit (mock `createClient` con `vi.hoisted`) |
| `US-002-04 configura persistSession/autoRefreshToken/detectSessionInUrl` | CA 2 | idem | unit |
| `US-002-04 lanza error si url o key están vacías` | CA 3 | idem | unit |
| `US-002-04 lanza error con los placeholders del ejemplo` | CA 3 | idem | unit |
| `US-002-03 environment.example tiene las claves esperadas` | CA 2 | `src/environments/environment.spec.ts` | unit |
| `US-002-04 ESLint prohíbe importar supabase-js fuera del servicio` | CA 4 | verificación: `pnpm lint` falla en fichero de prueba temporal | manual |
| `US-002-02 db:push --dry-run` | CA 3 | comando | manual |
| `US-002-05 conectividad navegador + APK` | CA 1 | comando / extensión Chrome / adb | manual |

Sin UI nueva: la revisión visual en navegador no aplica en esta spec.

---

## Ficheros afectados

**Crear:**
- `supabase/config.toml`, `supabase/migrations/.gitkeep`, `supabase/.gitignore`
- `src/app/core/services/supabase.ts`, `supabase.spec.ts`, `supabase.config.ts` (token + tipo)
- `src/environments/environment.example.ts`, `environment.spec.ts`
- `scripts/env-init.mjs`
- `docs/supabase.md`

**Modificar:**
- `package.json` (dependencia `@supabase/supabase-js`, devDependency `supabase`, scripts)
- `src/app/app.config.ts` (provider del token)
- `eslint.config.js` (restricción de import)
- `.gitignore` (`src/environments/environment.ts`, `supabase/.temp`, `supabase/.env*`)
- `CLAUDE.md` (Supabase confirmado en el stack; comandos `db:*`)
- `specs/README.md`

---

## Restricciones técnicas

- pnpm obligatorio; `@supabase/supabase-js` ^2, CLI fijada.
- Sin `any`; OnPush no aplica (sin componentes).
- Cliente creado una sola vez (`providedIn: 'root'`).
- Cambios de esquema **solo** por migración versionada; nada desde el panel web.
- Tipos de BBDD (`supabase gen types`) quedan para la primera spec con tablas.
- Secretos: nada en git; el repo es público.

---

## Preguntas abiertas

1. **Proyecto remoto** → decidido: lo crea el usuario en el panel de Supabase (controla organización, plan y coste) y entrega a Claude el *project ref* y la URL; Claude hace `link`, migraciones y cliente. La clave publishable la pega el usuario en `src/environments/environment.ts` (no pasa por el chat ni por git).
2. **Nombre y región** → se usa el proyecto ya creado por el usuario (región `eu-north-1`, nombre por defecto; renombrable en el panel). El *project ref* concreto no se escribe en la spec: se vincula con `supabase link` y vive en `supabase/.temp` (ignorado).

---

## Out of scope

- Tablas, RLS y modelo de datos (tareas, XP, rachas).
- Autenticación y registro de usuarios.
- Entorno local con Docker (`supabase start`) y seeds.
- CI/CD y despliegue de edge functions.
- Notificaciones/alarmas.

---

## Verificación realizada

- Red: 3 ficheros de test fallan por módulos inexistentes → Green: 13/13 tests pasan, cobertura 100 %.
- Un test se corrigió por un fallo del propio test (`TestBed` reconfigurado dos veces en la misma prueba), no del código.
- `pnpm lint`, `format:check`, `type-check`, `secrets:check`, `build` en verde.
- Regla ESLint comprobada: importar `@supabase/supabase-js` fuera del servicio falla.
- Cuenta de la CLI verificada por id de organización antes de vincular; `supabase link` OK.
- `db push --remote --dry-run` y `migration list --remote`: remoto al día, 0 migraciones, sin pedir contraseña de BBDD.
- `secrets:check` afinado: ignora referencias `env(VAR)` de `config.toml` (falso positivo) y sigue detectando literales.
- Descubierto: la CLI 3.x apunta a **local** por defecto; los scripts `db:*` usan `--remote` explícito.
- US-002-05 verificada con una sonda temporal (revertida, no commiteada) que consulta una tabla inexistente: navegador (extensión de Chrome) y APK en emulador devuelven `404 PGRST205`, es decir, la petición llega al proyecto y este responde. La clave se validó por tipo (*publishable*) sin imprimirla.
- La CSP de Tauri sigue en `null` (sin restricción) y la conexión funciona; se endurecerá en una spec de seguridad posterior.
