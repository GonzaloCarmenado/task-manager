# Plan 011 — Cuenta de usuario

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: pantallas generadas a partir de [stitch-prompt.md](./stitch-prompt.md); referencia en [`design/`](./design/README.md) (`screen.png` y `code.html` de cada pantalla; el HTML se lee como texto, no se ejecuta)
**Estado**: Aprobado
**Fecha**: 2026-11-14

---

## Enfoque técnico

**Identidad.** La cuenta es un usuario de Supabase Auth con un identificador interno con forma de correo (`<usuario>@cuenta.invalid`, dominio reservado que nunca resuelve; la persona solo ve y escribe el nombre de usuario). Todo lo que toca `supabase.auth` sigue viviendo en `AuthAccessService`, que gana: vincular la sesión anónima (`updateUser`, mismo `user_id`), iniciar sesión en **dos fases** (comprobar credenciales con un cliente sonda sin almacenamiento, decidir qué hacer con las tareas locales y solo entonces cambiar la sesión real con `setSession`), cerrar sesión (sesión anónima nueva), cambiar contraseña y nombre de usuario (re-autenticando con la contraseña actual en el cliente sonda) y borrar la cuenta (función de servidor `delete_my_account`). El cliente sonda se crea con `SUPABASE_CLIENT_FACTORY` (spec 009) y almacenamiento en memoria: así **cancelar el inicio de sesión no destruye la sesión anónima** y los tokens nunca salen de `AuthAccessService`. `AuthSession` gana `username` (derivado del identificador interno, que no se expone).

**Orquestación y datos.** `AccountAccessService` (feature `account`) coordina los flujos con las capas de datos sin tocar la autenticación: instantánea de las tareas pendientes antes de entrar, traspaso tras entrar (las pendientes se **recrean en la cuenta con `TasksAccessService.create`**; no hace falta función de servidor ni mover filas entre usuarios), buffer de traspaso en `localStorage` para reanudar si la app se cierra a mitad, y el recordatorio de 14 días. Como todas las capas ya indexan por `userId()`, cambiar de identidad cambia lo que se ve sin recargas manuales; solo hay que limpiar en `ProgressAccessService` la celebración y la subida de nivel pendientes y comprobar que `AlarmsAccessService` cancela y reconcilia. Solo hay **una migración**: `delete_my_account()` (borra al propio usuario no anónimo; las tareas, estadísticas y libro de XP caen por `on delete cascade`).

**Interfaz.** Se reproduce el diseño de Stitch con la máxima fidelidad (ver «Pantallas»): cabecera fija con desenfoque y las medidas exactas de cada pantalla, reutilizando los tokens y mixins de la spec 010. Piezas compartidas para no repetir valores (`AccountHeader`, `AccountField`, `RuleList`, `OfflineBanner`, `AccountToast`, hoja y diálogos con el patrón de botón atrás de `PostponeSheet`), tokens nuevos solo para lo que el diseño usa y no existía, y un componente de iconos ampliado (con variante rellena) porque el diseño usa iconos propios de Material Symbols y **no se puede cargar esa fuente** (offline y sin servicios externos). La fidelidad se protege con: la tabla de medidas de este plan, una prueba e2e de medidas a 390 px (`cuenta-fidelidad.cy.ts`), la comparación lado a lado con cada `screen.png` en la revisión visual y los tests estáticos de tokens.

**Remoto.** Dos ajustes en el proyecto Supabase (no hay API sin token, así que los hace el propietario en el panel, con tu confirmación): **desactivar «Confirm email»** y **longitud mínima de contraseña 8**. `supabase/config.toml` es la configuración local por defecto: **no se usa `config push`** (sobrescribiría ajustes remotos). Antes de implementar las pantallas, un **spike** (`pnpm verify:account`) comprueba contra el proyecto que el servicio acepta el identificador interno, que vincular, iniciar sesión, cambiar y borrar funcionan sin verificación; si algo no encajara, el plan se revisa antes de seguir.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `supabase/migrations/<marca>_account.sql` | Crear | `delete_my_account()` (security definer, solo no anónimos, sin parámetros), permisos y rollback documentado |
| `scripts/account-migration.test.mjs` | Crear | Test estático de la migración |
| `scripts/verify-account.mjs`, `package.json` | Crear / modificar | `pnpm verify:account` (manual, remoto, con confirmación): alta, entrada, cambios, borrado y límites |
| `src/app/core/utils/username.ts` (+ spec) | Crear | `toInternalIdentifier`, `fromInternalIdentifier`, `normalizeUsername` |
| `src/app/core/models/account.ts` | Crear | `AccountErrorReason`, `AccountResult`, `LocalTasksSnapshot`, reglas |
| `src/app/core/models/auth-session.ts` | Modificar | `user.username: string \| null` |
| `src/app/core/services/auth-error.util.ts` (+ spec) | Modificar | `mapAccountError` (credenciales, nombre ocupado, límite, red, plazo…) |
| `src/app/core/services/auth.access.service.ts` (+ spec) | Modificar | `linkAccount`, `checkCredentials` / `completeSignIn` / `cancelSignIn`, `signOut`, `changePassword`, `deleteOwnAccount`; evento `USER_UPDATED`; `SIGNED_OUT` esperado sin aviso |
| `src/app/features/account/account.constructor.service.ts` (+ spec) | Crear | Textos de todas las pantallas y reglas puras de usuario/contraseña |
| `src/app/features/account/account.access.service.ts` (+ spec) | Crear | Flujos, traspaso de tareas pendientes con buffer, recordatorio de 14 días |
| `src/app/features/account/shared/` | Crear | `account-header`, `account-field`, `rule-list`, `offline-banner`, `account-toast` (+ servicio), `overlay-back` (botón atrás) con specs |
| `src/app/features/account/account-screen/` | Crear | Pantalla Cuenta (sin cuenta / con cuenta) y diálogo de cerrar sesión |
| `src/app/features/account/create-account/` | Crear | Crear cuenta |
| `src/app/features/account/sign-in/` | Crear | Iniciar sesión, hoja de tareas de este móvil y confirmación de descarte |
| `src/app/features/account/change-password/`, `change-username/`, `delete-account/` | Crear | Derivadas de los formularios existentes |
| `src/app/features/account/account-reminder/` | Crear | Tarjeta de recordatorio de la lista |
| `src/app/features/account/profile-button/` | Crear | Botón de perfil de la cabecera de la lista |
| `src/app/shared/components/icon/icon.ts` (+ spec) | Modificar | Nuevos iconos propios y variante `filled` |
| `src/styles/_tokens.scss`, `scripts/design-tokens.test.mjs` | Modificar | Tokens nuevos del diseño (ver «Tokens nuevos») y sus tests |
| `src/app/app.routes.ts` (+ spec) | Modificar | Rutas `cuenta`, `cuenta/crear`, `cuenta/entrar`, `cuenta/contrasena`, `cuenta/borrar` (antes de `:id`) |
| `src/app/app.html`, `app.ts` | Modificar | `<app-account-toast />` y reanudar el traspaso pendiente |
| `src/app/features/tasks/tasks-list/*` | Modificar | Botón de perfil en la cabecera y tarjeta de recordatorio bajo el resumen |
| `src/app/features/progress/progress.access.service.ts` (+ spec) | Modificar | Limpiar celebración y subida de nivel al cambiar de `userId` |
| `src/app/features/tasks/alarms/alarms.access.service.spec.ts` | Modificar | Test de cancelación y reconciliación al cambiar de usuario |
| `src/app/features/dev/account-preview.ts` (+ spec), `app.routes.ts` | Crear / modificar | Vistas previas `__dev/account/<pantalla>/<estado>` para revisar cada estado sin backend |
| `cypress/support/backend.ts` | Modificar | Varios usuarios, tokens, `POST /auth/v1/token`, `PUT /auth/v1/user`, `POST /auth/v1/logout`, `rpc/delete_my_account` |
| `cypress/e2e/cuenta.cy.ts`, `cuenta-fidelidad.cy.ts` | Crear | Flujos completos y medidas de cada pantalla |
| `docs/supabase.md`, `docs/setup-android.md`, `CLAUDE.md`, `specs/README.md`, `docs/interacciones.md` | Modificar | Ajustes remotos, identificador interno, reglas de cuenta |

---

## Tokens nuevos (solo los que el diseño usa y la spec 010 no tenía)

Claro (valores del `DESIGN.md` / de las clases de Stitch) y oscuro (derivados con la misma lógica que la spec 010; el test de contraste los valida):

| Token | Claro | Para qué |
|---|---|---|
| `--color-surface-highest` | `#e3dfff` | Botón principal deshabilitado (`surface-container-highest`) |
| `--color-inverse-surface` / `--color-inverse-on-surface` | `#2d2a5b` / `#f3eeff` | Aviso pequeño inferior; velo de diálogos |
| `--color-tertiary-soft-dim` | `#4edea3` | Icono del aviso pequeño y aviso «guardado en tu cuenta» (`tertiary-fixed-dim`) |
| `--color-on-primary-soft-strong` | `#07006c` | Icono sobre `primary-soft` en la tarjeta de copia (`on-primary-fixed`) |
| `--glass-bar` | `rgba(252,248,255,.85)` | Fondo de la cabecera fija (`surface/85`) |
| `--tint-secondary` | `rgba(255,221,184,.30)` | Bloque de aviso (`secondary-fixed/30`) |
| `--tint-error` | `rgba(255,218,214,.30)` | Zona de peligro (`error-container/30`) |
| `--tint-surface-high` | `rgba(233,229,255,.60)` | Tarjeta «¿Cambias de móvil pronto?» (`surface-container-high/60`) |
| `--tint-tertiary` | `rgba(78,222,163,.30)` | Aviso «guardado en tu cuenta» (`tertiary-fixed-dim/30`) |
| `--scrim-inverse-40` / `-60` / `-75` | `rgba(45,42,91,.40/.60/.75)` | Velos de diálogo y hoja (con desenfoque 4 / 12 / 12 px) |
| `--shadow-field` | `0 4px 20px -2px rgba(70,72,212,.06)` | Tarjetas de campo de Crear cuenta |
| `--shadow-input` | `0 2px 12px rgba(96,99,238,.06)` | Campos de Iniciar sesión |
| `--shadow-pop` | `0 25px 50px -12px rgba(0,0,0,.25)` | Diálogos y hoja (`shadow-2xl`) |
| `--shadow-soft` | `0 1px 2px rgba(0,0,0,.05)` | Tarjetas de Cuenta (`shadow-sm`) |
| `--shadow-header` | `0 1px 8px rgba(0,0,0,.04)` | Cabecera fija |

Equivalencias de Tailwind (config del export) a tokens: `rounded-2xl` = 1 rem = `--radius-md`; `rounded-3xl` = 1,5 rem = `--radius-lg`; `rounded-lg` (personalizado) = 2 rem = `--radius-xl`; `rounded-full` = `--radius-full`. `p-space-md` = 16 px, `space-lg` = 24 px, `margin` = 1,25 rem, `space-sm` = 8 px, `space-xs` = 4 px. Tipografía por mixins de `_type.scss` (`headline-sm`, `body-sm`, `label-md`…); `tracking-tight` = −0,025 em; `tracking-wider` = 0,05 em. Colores: `surface` y `background` = `--color-bg`; `surface-container-lowest` = `--color-surface`; `-low` = `--color-surface-low`; `surface-container` = `--color-surface-soft`; `-high` = `--color-surface-high`; `primary-fixed` = `--color-primary-soft`; `secondary-fixed` = `--color-secondary-soft`; `tertiary-fixed` = `--color-tertiary-soft`; `outline` = `--color-outline-strong`; `outline-variant` = `--color-outline`; `error-container` = `--color-error-soft`.

---

## Interfaces TypeScript

```typescript
// src/app/core/models/account.ts
export type AccountErrorReason =
  | 'invalid-credentials'   // inicio de sesión o contraseña actual incorrectos (mensaje siempre igual)
  | 'username-taken'        // «Nombre de usuario no disponible»
  | 'weak-password'         // el servicio rechazó la contraseña (mínimo remoto)
  | 'same-password'         // la nueva es igual a la actual
  | 'rate-limited'          // «Demasiados intentos. Espera unos minutos.»
  | 'network'               // sin conexión
  | 'timeout'               // sin respuesta en el plazo
  | 'unauthorized'          // sesión caducada o no válida
  | 'unknown';

export type AccountResult = { readonly ok: true } | { readonly ok: false; readonly reason: AccountErrorReason };

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const REMINDER_SNOOZE_DAYS = 14;

/** Rojo = no cumple · gris = aún sin tocar · verde = cumple. */
export type RuleState = 'idle' | 'ok' | 'error';
export interface RuleView { readonly key: string; readonly text: string; readonly state: RuleState }

/** Tareas anónimas del móvil, capturadas antes de iniciar sesión. */
export interface LocalTasksSnapshot {
  readonly pending: readonly { title: string; dueDate: string | null; dueTime: string | null }[];
  readonly completed: number; // completadas recientes (no se traspasan)
}

// src/app/core/models/auth-session.ts
export interface AuthSession {
  readonly user: { readonly id: string; readonly isAnonymous: boolean; readonly username: string | null };
  readonly expiresAt: number | null;
}
```

```typescript
// src/app/core/utils/username.ts
export const INTERNAL_DOMAIN = 'cuenta.invalid';
export const normalizeUsername = (raw: string): string => raw.trim().toLowerCase();
export const toInternalIdentifier = (username: string): string => `${normalizeUsername(username)}@${INTERNAL_DOMAIN}`;
export const fromInternalIdentifier = (identifier: string | null | undefined): string | null => /* quita @cuenta.invalid; null si no cuadra */;
```

```typescript
// AuthAccessService (añadidos; devuelven AccountResult y nunca lanzan ni escriben en consola)
linkAccount(username: string, password: string): Promise<AccountResult>;      // anónimo → cuenta, mismo user_id
checkCredentials(username: string, password: string): Promise<AccountResult>; // cliente sonda; guarda los tokens en privado
completeSignIn(): Promise<AccountResult>;   // setSession con lo comprobado; cambia la identidad
cancelSignIn(): void;                       // descarta lo comprobado; la sesión anónima sigue intacta
signOut(): Promise<AccountResult>;          // sesión anónima nueva; SIGNED_OUT esperado
changePassword(current: string, next: string): Promise<AccountResult>;
deleteOwnAccount(password: string): Promise<AccountResult>;                    // sonda + rpc + sesión anónima nueva
```

```typescript
// AccountAccessService (features/account)
readonly isAnonymous: Signal<boolean>;
readonly username: Signal<string | null>;
readonly localTasks: Signal<LocalTasksSnapshot>;          // de la identidad anónima actual
readonly reminderVisible: Signal<boolean>;                // anónimo + ≥1 tarea completada alguna vez + fuera del aplazamiento
createAccount(username, password): Promise<AccountResult>;
startSignIn(username, password): Promise<AccountResult>;  // checkCredentials + captura de tareas locales
finishSignIn(mode: 'merge' | 'discard' | 'none'): Promise<AccountResult>;
cancelSignIn(): void;
signOut(); changePassword(); deleteAccount();
snoozeReminder(): void;                                   // 14 días, con CLOCK
resumePendingTransfer(): Promise<void>;                   // reanuda el buffer de localStorage
```

```typescript
// AccountConstructorService (puro): textos y reglas
usernameRules(value: string, touched: boolean): RuleView[];
passwordRules(password: string, username: string, touched: boolean, extra?: { notSameAs?: string }): RuleView[];
matchState(password: string, repeat: string): { state: RuleState; label: 'Sin verificar' | 'Coinciden' | 'No coinciden' };
errorText(reason: AccountErrorReason, context: 'create' | 'signin' | 'change-password' | 'delete'): string;
```

---

## Esquema SQL

```sql
-- supabase/migrations/<marca>_account.sql
-- Spec 011: borrar la propia cuenta. Las tareas, estadísticas y el libro de XP caen por on delete cascade.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sin sesión' using errcode = '28000';
  end if;
  if coalesce((select is_anonymous from auth.users where id = uid), true) then
    raise exception 'las sesiones anónimas no pueden borrar cuenta' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Rollback (manual, con una nueva migración):
--   drop function public.delete_my_account();
```

Sin tablas nuevas, así que no hay RLS que añadir. La función no acepta ningún identificador del cliente. `db push` solo con tu confirmación y tras verificar la cuenta de la CLI por **id de organización**.

---

## Pantallas

Todas se montan en `app-account-header` + contenido, a 390 px, con las **medidas exactas del HTML de Stitch** (las cifras son px salvo indicación). Cada `screen.png` y `code.html` está en `design/`. Donde Stitch no diseñó una pantalla, se **deriva de Crear cuenta** (mismas tarjetas de campo, reglas en vivo y estados).

### Cabecera común (`AccountHeader`)
Fija arriba, ancho completo, `z-index` 50, fondo `--glass-bar` con `backdrop-filter: blur(24px)`, sombra `--shadow-header`, `padding-top: env(safe-area-inset-top)`. Interior de **64** de alto y **20** (`--space-margin`) a los lados. Izquierda: botón atrás **44×44**, `margin-left: −8`, redondo, icono flecha de **24** (`on-surface`), activo con escala 0,95; título `headline-sm` con `letter-spacing: −0,025em` y separación de 8. Derecha, decorativo (`aria-hidden`): círculo **32** `--color-primary` con icono `person` de **18** `on-primary`. El contenido empieza a **64** + zona segura y respeta `padding-bottom` de la zona segura inferior; fondo `--color-bg`.

### 1. Botón de perfil (lista de tareas)
En la cabecera de la lista, a la derecha del título «Tareas». Zona **44×44**, círculo visible **36** `--color-primary` con sombra `0 4px 14px -2px rgba(70,72,212,.35)`, icono `person` de **20** `on-primary`; activo escala 0,95; `aria-label="Cuenta"`. Abre `/cuenta`.

### 2. Tarjeta de recordatorio (`AccountReminder`, bajo el resumen de nivel)
Fondo `--color-surface-soft`, radio `--radius-lg` (24), relleno 16, margen inferior 16, sombra `0 8px 24px -4px rgba(70,72,212,.12)`. Fila superior (separación 4, alineada arriba): a la izquierda separación 10: **tesela 40×40** radio 16 fondo `--color-primary-soft` con icono `cloud-sync` relleno de 22 (`on-primary-soft-strong`) y, al lado, la etiqueta `label-sm` `--color-primary-text` negrita **«Asegura tu progreso»** sobre el título `body-lg` negrita `leading-tight` **«Crea tu respaldo personal»**; a la derecha, botón **32×32** redondo con icono `x` de 18 `on-surface-variant` (`aria-label="Descartar recordatorio"`). Párrafo `body-md` `on-surface-variant` `leading-relaxed`, margen superior 10: «Tus datos solo están en este móvil. Crea una cuenta para no perderlos al cambiar de teléfono.» Fila de acciones, margen superior 16, separación 8: **«Crear cuenta»** `flex: 1`, alto **46**, redondo, fondo `primary`, texto `label-lg` negrita `on-primary`, sombra `0 4px 14px -2px rgba(70,72,212,.35)`, icono `shield` relleno de 20 (lleva a `/cuenta/crear`); y el botón de texto **«En 14 días»** (relleno horizontal 14, alto **46**, `label-sm` semibold `on-surface-variant`, `aria-label="Recordármelo dentro de 14 días"`). El aspa y «En 14 días» hacen lo mismo: ocultar la tarjeta 14 días.
- **Visible** solo si: sesión anónima, **al menos una tarea completada alguna vez** (`ProgressAccessService.progress().lastCompletedDay !== null`) y no estar en el aplazamiento (marca en `localStorage`, comparada con `CLOCK`). Sin red sigue visible (no depende de ella).

### 3. Cuenta — sin cuenta
Contenido en columna con separación **24**.
- **Tarjeta de estado**: fondo `--color-surface`, radio `--radius-xl` (32), relleno 24, sombra `--shadow-soft`, centrada, `overflow: hidden`. Dos halos decorativos desenfocados (esquina superior derecha −48/−48, 128×128, `secondary-container` al 20 %, blur 40; esquina inferior izquierda −40/−40, 112×112, `primary` al 10 %). **Mascota** 112×112, margen inferior 16: círculo **96** `--color-surface-high` con sombra interior y icono `phone-lock` relleno de **48** `primary`; insignia **36** `--color-secondary-container` abajo derecha (bottom 0, right 4), sombra media, icono `shield` relleno de 20 `on-secondary-container`, **rebote** continuo (se anula con «reducir movimiento»). **Píldora** (relleno 4/12, radio total, fondo `--color-surface-high`, margen inferior 8, separación 6): punto **8** `tertiary-container` con pulso + `label-sm` «ALMACENAMIENTO LOCAL ACTIVO». Título `headline-md` margen inferior 4: «Tus datos viven solo en este móvil». Párrafo `body-md` `on-surface-variant` `leading-relaxed`, ancho máximo 20 rem: «Tus tareas, tu racha y tus puntos de XP se guardan en la memoria de este móvil y se perderían si lo cambias o desinstalas la app.» (redacción corregida; sin «100 % seguros»). **Sin** la rejilla de racha y XP.
- **Tarjeta «¿Cambias de móvil pronto?»**: fondo `--tint-surface-high`, radio 32, relleno 16, separación 16, alineada arriba: icono en círculo **40** `--color-primary-soft` con `cloud-sync` de 22 (`on-primary-soft-strong`); título `headline-sm` `leading-tight` margen inferior 4 y texto `body-sm` `leading-snug`: «Si quieres recuperar tus tareas y tu progreso en otro teléfono, crea una cuenta gratuita.» (sin «sincronizar en vivo» ni «5 segundos»).
- **Acciones**, margen superior 4, separación 8: **«Crear cuenta gratuita»** alto **54**, redondo, `primary`, `label-lg`, sombra `0 8px 24px -4px rgba(70,72,212,.35)`, icono `cloud-up` relleno de 22 (→ `/cuenta/crear`); **«Ya tengo cuenta, iniciar sesión»** alto **50**, fondo `--color-surface-soft`, texto `primary` `label-lg`, icono `log-in` de 20 (→ `/cuenta/entrar`).
- **Pie**: separación 8, relleno 16/8, centrado: icono `badge-check` de 16 `outline` + `label-sm` `on-surface-variant`: «La cuenta es opcional y no necesita correo electrónico.»

### 4. Cuenta — con cuenta
- **Tarjeta de usuario**: fondo `--color-surface`, radio 32, relleno 24, sombra `--shadow-soft`, `overflow: hidden`, halo decorativo arriba a la derecha (112×112, `primary` al 10 %). Fila (separación 16, margen inferior 16): **avatar 64×64** con anillo degradado `primary` → `primary-container` de 2 de grosor, sombra media, interior círculo `--color-surface` con icono `person` relleno de 32 `primary` (sin imagen), insignia **20** `tertiary` abajo derecha con `check` de 13 `on-tertiary`; a la derecha el nombre de usuario como `headline-sm` `on-surface` (truncado) con prefijo «@» (sin nombre visible, sin estrella, sin nivel). Debajo, bloque de estado: fondo `--tint-tertiary`, radio 16, relleno 12, separación 8: icono `cloud-check` relleno de 20 `tertiary` y `label-md` semibold `on-surface`: «Tus tareas y tu XP están guardados en tu cuenta» (sin «última copia»).
- **«AJUSTES DE CUENTA»**: etiqueta `label-md` `on-surface-variant` mayúsculas `tracking-wider`, relleno horizontal 4, separación 6 con el panel. **Panel**: fondo `--color-surface`, radio 32, `overflow: hidden`, sombra `--shadow-soft`. Filas con relleno 16, separación 16, texto a la izquierda, `chevron-right` de 20 `outline` a la derecha; divisor de 1 `--color-surface-high` con margen horizontal 16. Cada fila: círculo **40** (`--color-surface-soft`; el de cerrar sesión `--color-surface-high`) con icono de 20 `on-surface-variant` (cerrar sesión `on-surface`); título `body-lg` `leading-tight` y subtítulo `body-sm` `on-surface-variant`. Filas: **«Cambiar contraseña»** (icono `key`, «Protección con clave segura») → `/cuenta/contrasena`; **«Cerrar sesión»** (icono `log-out`, «Tus datos seguirán en tu cuenta») → diálogo.
- **Zona de peligro**: margen superior 24, relleno superior 16, separación 4. Etiqueta «ZONA DE PELIGRO» `label-md` `error` semibold mayúsculas `tracking-wider`. Caja: fondo `--tint-error`, radio 32, relleno 16, separación 16: fila de separación 8 con `alert` de 22 `error` (margen superior 2) y, al lado, título `headline-sm` `leading-tight` «Borrar cuenta permanentemente» + `body-sm` `on-surface-variant` `leading-normal` margen superior 4: «Esta acción eliminará tu nombre de usuario, todas tus tareas guardadas, tus rachas y tu nivel de XP. No se puede revertir.»; botón alto **48**, fondo `--color-surface`, texto `error` `label-md`, sombra suave, icono `trash` de 18: **«Borrar cuenta y datos»** (→ `/cuenta/borrar`).
- **Diálogo «¿Cerrar sesión?»** (`AccountLogoutDialog`, rol `alertdialog`): velo `--scrim-inverse-40` con desenfoque 4, abajo (`items-end`) con margen 20; caja ancho completo (máx. 24 rem), fondo `--color-surface`, radio 32, relleno 24, sombra `--shadow-pop`, separación 16, entra subiendo 24 px en 200 ms. Icono `log-out` de 28 `primary` en círculo **48** `--color-surface-high` centrado; título `headline-sm` y texto `body-md` `on-surface-variant` `leading-relaxed`, centrados: «Tus tareas y tu progreso permanecerán guardados en tu cuenta. Este teléfono quedará sin tareas hasta que vuelvas a iniciar sesión.» Botones (separación 4, margen superior 8): **«Sí, cerrar sesión»** alto 48 `primary` `label-lg` sombra media; **«Cancelar»** alto 48 `--color-surface-soft` `on-surface`. Botón atrás de Android cierra el diálogo.
- Tras cerrar sesión: aviso pequeño «Sesión cerrada» y vuelta a la lista (vacía).

### 5. Crear cuenta
Contenido con separación 16 entre bloques, relleno inferior 40.
- **Banner sin conexión** (solo si no hay red): fondo `--color-error-soft`, texto `on-error-soft`, relleno 16, radio 16, margen inferior 16, separación 8: `wifi-off` de 22 `error`; `label-lg` negrita «Sin conexión a Internet», `body-sm` «No se pudo contactar con el servidor. Tus tareas locales permanecen a salvo.» y botón (relleno 4/12, radio total, fondo `error`, texto `on-error`, `label-sm` negrita, icono `refresh` de 14): «Reintentar ahora».
- **Tarjeta ilustrada**: fondo `--color-surface`, radio 16, relleno 16, sombra `0 4px 20px -2px rgba(70,72,212,.08)`, separación 16, margen inferior 16. Círculo **56** `--color-primary-soft` con sombra interior e icono `shield-user` relleno de 28 `primary`; insignia **24** `--color-secondary-container` (abajo derecha, −4/−4) con `lock-reset` de 14 `on-secondary-container`. Texto: `body-md` semibold `leading-snug` «Sin correos ni verificaciones.» y `body-sm` `on-surface-variant` `leading-tight` «Solo tu nombre de usuario y tu contraseña.» (sin la etiqueta «PRIVACIDAD MÁXIMA»).
- **Tarjetas de campo** (3): fondo `--color-surface`, relleno 16, radio 16, sombra `--shadow-field`. Fila de etiqueta (margen inferior 6): etiqueta `label-lg` negrita con icono de 18 `primary` (separación 6) y a la derecha una indicación `label-sm` medium. **Entrada**: alto **48**, fondo `--color-surface-low`, texto `body-lg`, radio total, relleno horizontal 16 (derecho 44 en usuario, 48 en contraseñas), marcador de posición `outline`, **foco**: fondo `--color-surface` y anillo de 2 `primary` (`box-shadow`, sin contorno). Lista de reglas: margen superior 10, separación 4; cada una con icono de 16 (separación 6) y `body-sm` `on-surface-variant`: sin tocar `circle` `outline`; cumple `check-circle` `tertiary`; incumple `circle` `error`. Mensaje de error (oculto salvo que aplique): margen superior 8, `label-md` `error`, icono `alert-circle` de 16, separación 4.
  - **Nombre de usuario**: icono `at`; indicación `0/24` (cuenta en vivo); entrada con `autocapitalize="none"`, `autocomplete="username"`, `autocorrect="off"`, `spellcheck="false"`, marcador «ej. carlos_ritmo», icono `id-card` de 20 `outline` a la derecha (14 del borde); reglas «De 3 a 24 caracteres» y «Minúsculas, números, punto, guion y guion bajo»; error «El formato de usuario no es válido.» (también «Nombre de usuario no disponible» cuando el servicio lo indica).
  - **Contraseña**: icono `key`; indicación «Mín. 8»; `autocomplete="new-password"`, marcador «••••••••••••»; botón mostrar/ocultar **36×36** a 8 del borde (icono `eye`/`eye-off` de 20 `on-surface-variant`, `aria-label` «Mostrar u ocultar contraseña»); reglas «De 8 a 64 caracteres» y «Distinta del nombre de usuario» (la comparación ignora mayúsculas); error «La contraseña debe cumplir con los requisitos.»
  - **Repetir contraseña**: icono `verified-user`; indicación **«Sin verificar»** (`outline` semibold) / **«Coinciden»** (`tertiary` negrita) / **«No coinciden»** (`error` negrita); mismo campo y botón; regla «Coincidencia exacta con la anterior»; error «Las contraseñas no coinciden.»
- **Aviso importante**: fondo `--tint-secondary`, radio 16, relleno 16. Cabecera (separación 8, margen inferior 8): círculo **28** `secondary-container` con `alert` de 18 `on-secondary-container` y `headline-sm` negrita `secondary` «Aviso importante sobre tu cuenta». Casilla (separación 8, alineada arriba): **24** redonda fondo `--color-surface`, marcada fondo `tertiary` con `check` de 16 `on-tertiary`; texto `body-md` medium `leading-relaxed`: «Si olvidas tu contraseña no podremos recuperar tu cuenta.» y, en negrita `error`, «Entiendo que no hay forma de recuperarla.» (toda la fila es la etiqueta de la casilla).
- **Acciones**: margen superior 8, separación 8. **«Crear cuenta»** alto **52**, radio total, `label-lg`, icono `user-plus` de 20, separación 8. Estados: **deshabilitado** (hay errores o falta la casilla) fondo `--color-surface-highest`, texto `outline`, sin sombra; **habilitado** `primary`/`on-primary` con sombra `0 8px 24px -4px rgba(70,72,212,.35)`; **cargando** fondo `primary-container`, texto `on-primary-container`, icono sustituido por un círculo giratorio de 20 (borde 2 `on-primary`, parte superior transparente) y texto «Creando tu cuenta…». **«Cancelar y volver»** alto **44**, radio total, `label-lg` `on-surface-variant`, icono `x` de 18, separación 6. Pie `body-sm` `outline` centrado: «Mantienes tus tareas locales intactas en este dispositivo.»
- **Aviso de éxito** (abajo, a 24 y 20 de los lados, `z-index` 50): fondo `--color-tertiary`, `on-tertiary`, relleno 16, radio 16, sombra `--shadow-pop`, separación 8: icono `badge-check` de 24; `label-lg` negrita «¡Cuenta creada con éxito!» y `body-sm` (opacidad .9) **«Tus tareas y tu progreso siguen aquí.»** (texto corregido). Entra deslizando desde abajo 300 ms y se va a los 3,2 s.
- **Reglas de interacción**: las reglas pasan de gris a verde/rojo cuando el campo se ha tocado; los mensajes de error aparecen al perder el foco o al intentar enviar; el botón se habilita solo con todo válido **y** la casilla marcada; el botón atrás de Android vuelve sin perder lo escrito (el estado del formulario vive en el componente mientras la ruta está viva).

### 6. Iniciar sesión
Relleno inferior de 36. Separación 24 en el formulario.
- **Tarjeta de bienvenida**: radio 24, relleno 16, margen inferior 24, fondo degradado diagonal `surface-low` → `surface-soft` → `surface-high`, sombra suave, `overflow: hidden`, halo abajo a la derecha (96×96, `primary` al 10 %). Fila (separación 16): **tesela 56×56** radio 16 con degradado `primary` → `primary-container`, sombra `0 8px 20px -4px rgba(70,72,212,.35)` e icono `cloud-sync` relleno de 28 `on-primary`; texto: etiqueta (relleno 2/10, radio total, fondo `--color-secondary-soft`, `on-secondary-soft`, `label-sm`, icono `bolt` de 14) **«RECUPERA TU NIVEL»**, `headline-sm` «Bienvenido de nuevo» (truncado) y `body-sm` `on-surface-variant` (una línea): «Inicia sesión para recuperar tus tareas y tu racha.»
- **Aviso de error de acceso** (si procede), margen inferior 16: fondo `--color-error-soft`, texto `on-error-soft`, radio 16, relleno 16, separación 12: círculo **36** `error` con `alert-circle` de 20 `on-error`; `label-lg` `error` «Acceso no válido» y `body-sm` «Nombre de usuario o contraseña incorrectos. Comprueba tus datos e inténtalo de nuevo.» Para el límite de intentos: «Demasiados intentos. Espera unos minutos.» (mismo bloque).
- **Banner sin conexión** como en Crear cuenta.
- **Nombre de usuario**: fila de etiqueta (`label-md` `on-surface-variant`, relleno horizontal 4, separación 6): «Nombre de usuario» y, a la derecha, `body-sm` `outline` «Identificador único». Entrada: alto **56**, fondo `--color-surface`, radio **16** (no es píldora), `body-lg`, relleno izquierdo **48** (icono `id-card` de 22 `primary` a 16 del borde) y derecho 16, sombra `--shadow-input`, marcador «tu nombre de usuario» (`outline` al 70 %), `autocomplete="username"`. **Foco**: anillo de 2 `primary` (se añade; el diseño lo omitía y es necesario para el teclado y el lector de pantalla).
- **Contraseña**: etiqueta «Contraseña»; entrada igual con icono `lock` de 22 a la izquierda, relleno derecho **56**, `autocomplete="current-password"`, botón mostrar/ocultar **44×44** a 8 del borde (icono de 22). Sin «¿Has olvidado…?» ni mensajes de seguridad.
- **Acciones**: relleno superior 16, separación 8. **«Iniciar sesión»** alto **52**, `primary`, `label-lg`, icono `arrow-right` de 20, sombra `0 8px 24px -4px rgba(70,72,212,.4)` (comprueba las credenciales, **no** cambia la sesión todavía); **«Cancelar»** alto **52**, fondo `--color-surface-soft`, texto `on-surface`.
- **Hoja «Tareas de este móvil»** (`LocalTasksSheet`, rol `dialog`, `aria-modal`): se muestra tras comprobar las credenciales solo si hay tareas pendientes locales. Velo `--scrim-inverse-60` con desenfoque 12; hoja abajo, fondo `--color-bg`, radio superior 24, relleno 24, sombra `--shadow-pop`, alto máximo 813 y scroll interno. **Asa** 48×6 `surface-variant` centrada (margen inferior 16). Cabecera (separación 12, margen inferior 4): círculo **40** `--color-secondary-soft` con `swap` relleno de 22 `on-secondary-soft`; `label-sm` `secondary` negrita mayúsculas `tracking-wider` «Tareas encontradas» + `headline-sm` `leading-tight` «¿Qué quieres hacer con las tareas de este móvil?». Texto `body-md` `on-surface-variant` (margen 8/16): «Este dispositivo tiene tareas creadas sin cuenta. Decide qué hacer con ellas al entrar en tu cuenta.» Caja de recuento (fondo `--color-surface-low`, radio 16, relleno 8/16, margen inferior 16, entre extremos): punto **10** `secondary` + `label-md` «N tareas locales sin cuenta» y etiqueta `label-sm` negrita `primary` sobre `primary-soft` (relleno 2/10, radio total) «Pendientes». Opciones (separación 16, margen inferior 24):
  - **A «Traer mis tareas pendientes a mi cuenta»**: fondo `--color-surface`, radio 16, relleno 16, sombra `0 6px 20px -2px rgba(70,72,212,.12)`; al tocarla queda **seleccionada** con anillo de 2 `primary`. Fila (separación 14): círculo **28** `primary` con `list-plus` de 18 `on-primary`; título `headline-sm` de 16; `body-sm` `leading-relaxed` «Se añadirán **N tareas pendientes** de este móvil a tu cuenta.» y nota (margen superior 10, relleno 8, radio 16, fondo `--tint-surface-high`, separación 8): `info` de 16 `secondary` + texto de 11 `leading-tight` «Nota: El XP y las tareas ya completadas de este móvil no se sumarán.» (sin etiqueta «Recomendado»).
  - **B «Usar solo mi cuenta»**: fondo `--color-surface-low` (pulsada `--color-surface-soft`), radio 16, relleno 16; círculo **28** `surface-variant` con `cloud-check` de 18 `on-surface`; título de 16; `body-sm` «Las tareas de este móvil se descartarán para mostrar únicamente tu cuenta.» Al tocarla abre la confirmación.
  - Botones (margen superior automático, separación 8): **«Traer tareas y continuar»** alto 52 `primary` sombra `.4`, icono `check` de 20 (completa el inicio de sesión y traspasa); **«Cancelar inicio de sesión»** alto 44, texto `on-surface-variant` `label-md` (descarta lo comprobado; sesión anónima intacta).
  - Botón atrás de Android = «Cancelar inicio de sesión».
- **Confirmación de descarte** (`alertdialog`): velo `--scrim-inverse-75` con desenfoque 12, centrada con relleno horizontal 16; caja máx. 24 rem, fondo `--color-bg`, radio 24, relleno 24, sombra `--shadow-pop`, centrada. Círculo **56** `--color-error-soft` con `trash-sweep` relleno de 30 `error` y sombra media, margen inferior 16; `headline-sm` «¿Descartar tareas de este móvil?» (margen inferior 8); `body-md` `on-surface-variant` (margen inferior 24): «Esta acción no se puede deshacer. Las N tareas pendientes de este móvil se perderán y se cargará tu cuenta.» Botones (separación 10): **«Sí, descartar tareas locales»** alto 50, fondo `error`, `on-error`, `label-lg`, sombra suave; **«Volver a opciones»** alto 46, fondo `--color-surface-soft`, `on-surface`, `label-md`.
- **Variante derivada (sin referencia de Stitch)**: si no hay tareas pendientes pero sí completadas locales, se salta la hoja y se muestra directamente una confirmación con el mismo diseño: «¿Continuar sin las tareas de este móvil?» / «Las N tareas completadas de este móvil y su XP no se sumarán a tu cuenta. No se puede deshacer.» / «Sí, continuar» / «Cancelar inicio de sesión».
- **Aviso pequeño** al terminar: «Tareas añadidas a tu cuenta» o «Sesión iniciada».

### 7. Cambiar contraseña (derivada de Crear cuenta)
Título «Cambiar contraseña». Banner sin conexión. Tarjetas de campo: **«Contraseña actual»** (icono `lock`, botón mostrar/ocultar, sin reglas, error «La contraseña actual no es correcta.»); **«Contraseña nueva»** (icono `key`, «Mín. 8», reglas «De 8 a 64 caracteres», «Distinta del nombre de usuario» y «Distinta de la contraseña actual»); **«Repetir contraseña nueva»** (como en Crear cuenta). Acciones: **«Cambiar contraseña»** (icono `key`, estados deshabilitado/habilitado/cargando «Cambiando tu contraseña…») y «Cancelar y volver». Éxito: aviso pequeño «Contraseña cambiada» y vuelta a Cuenta.

### 8. Cambiar nombre de usuario — DESCARTADA
DESCARTADA tras el spike (2026-11-14): el servicio rechaza (`email_address_invalid`) cambiar el identificador a una dirección `.invalid`; el nombre de usuario no se puede cambiar (ver Out of scope).

### 9. Borrar cuenta (derivada)
Título «Borrar cuenta». Primero la **caja de peligro** de la pantalla Cuenta (mismos título y texto). Tarjeta **«Contraseña»** (icono `lock`, error «La contraseña no es correcta.»). **Bloque de confirmación** como el aviso de Crear cuenta pero con fondo `--tint-error` y casilla: «Entiendo que se borrarán mi cuenta y todos mis datos para siempre.» (negrita `error`). Acciones: **«Borrar mi cuenta»** alto 52, fondo `error`, texto `on-error`, icono `trash` de 20 (deshabilitado hasta casilla y contraseña, como el botón de Crear cuenta; cargando «Borrando tu cuenta…») y «Cancelar y volver». Error del servidor: banner «No se ha borrado nada. Inténtalo de nuevo.» Éxito: aviso pequeño «Cuenta eliminada» y vuelta a la lista (vacía, sin cuenta).

### Aviso pequeño (`AccountToast`)
Abajo y centrado a 24 del borde, fondo `--color-inverse-surface`, texto `inverse-on-surface`, relleno 10/16, radio total, sombra grande, separación 8, icono de 18 `tertiary-soft-dim` + `label-sm`; entra con opacidad y 12 px de desplazamiento en 300 ms; dura 2,8 s; `role="status"`.

### Estados comunes
Vacío (sin tocar), con errores, cargando (botón principal con el círculo giratorio y el texto «…ando…»; no se puede pulsar dos veces) y sin conexión (banner + «Reintentar ahora», que reintenta la última acción). El teclado virtual no tapa el campo en uso ni el botón (la página hace scroll hasta el campo enfocado).

---

## Estrategia de tests (TDD)

Los nombres de los `it` empiezan por el id del criterio (`US-011-xx`).

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `core/utils/username.spec.ts` | Normalización, identificador interno y su inverso (casos borde: mayúsculas, espacios, dominio ajeno) | US-011-01, 02, 07 |
| `core/services/auth-error.util.spec.ts` | `mapAccountError` por código (credenciales, ya existe, débil, igual, 429, red, plazo, 401) | US-011-01, 02, 05 |
| `core/services/auth.access.service.spec.ts` (ampliar) | `linkAccount` conserva `user_id` y deja `username`; `checkCredentials`/`completeSignIn`/`cancelSignIn` (la sesión anónima no cambia hasta completar; los tokens no salen del servicio); `signOut` crea una sesión anónima nueva sin aviso de «rechazo»; `changePassword`/`deleteOwnAccount` re-autentican y no hacen nada a medias; plazos; sin consola | US-011-01, 02, 03, 05, 06, 07 |
| `features/account/account.constructor.service.spec.ts` | Reglas de usuario y contraseña con sus estados y mensajes, coincidencia, textos | US-011-01, 05, 07 |
| `features/account/account.access.service.spec.ts` | Instantánea de tareas locales; traspaso de pendientes (solo pendientes, sin XP) con buffer y reanudación; descarte; recordatorio (anónimo + primera tarea + 14 días con `CLOCK`); no mostrar datos ajenos al cambiar de identidad | US-011-02, 03, 08 |
| `features/account/shared/*.spec.ts` | Cabecera (atrás, título, decorativa), campo (contador, mostrar/ocultar, foco, `autocomplete`), reglas, banner, aviso pequeño, botón atrás de overlays | US-011-01, 03 |
| `account-screen.spec.ts` | Sin cuenta / con cuenta, filas, destinos, zona de peligro, diálogo de cerrar sesión (confirmar, cancelar, atrás), anónima no ve «Borrar» | US-011-03, 06 |
| `create-account.spec.ts` | Reglas en vivo, botón deshabilitado sin casilla, estados cargando/ocupado/sin conexión, conserva lo escrito, éxito | US-011-01 |
| `sign-in.spec.ts` | Error genérico y límite; hoja con tareas pendientes; A selecciona y completa; B pide confirmación; cancelar deja la sesión anónima; variante solo completadas | US-011-02 |
| `change-password.spec.ts`, `delete-account.spec.ts` | Reglas, contraseña actual incorrecta, rechazo de igual/ocupado, confirmación, fallo sin cambios | US-011-05, 06, 07 |
| `account-reminder.spec.ts`, `profile-button.spec.ts`, `tasks-list.spec.ts` (ampliar) | Visibilidad, aspa y «En 14 días», icono de perfil con zona de 44 | US-011-03, 08 |
| `progress.access.service.spec.ts`, `alarms.access.service.spec.ts` (ampliar) | Limpiar celebración al cambiar de usuario; cancelar y reconciliar alarmas | US-011-03, 08 |
| `shared/components/icon/icon.spec.ts` | Nuevos iconos y `filled` | US-011-01–03 |
| `scripts/account-migration.test.mjs` | `delete_my_account`: `security definer`, `search_path`, comprobación de anónimo, sin parámetros, `revoke`/`grant`, sin `drop table` | US-011-06 |
| `scripts/design-tokens.test.mjs` (ampliar) | Tokens nuevos (valores claros del diseño, definidos en oscuro, contraste de los pares nuevos) | US-011-01–03 |
| `cypress/e2e/cuenta.cy.ts` | Crear cuenta, nombre ocupado, sin conexión; iniciar sesión (error, límite, con y sin tareas locales: traer pendientes sin XP, usar solo la cuenta); cerrar sesión; cambiar contraseña y nombre; borrar; recordatorio (aparece tras completar, aspa, «En 14 días», 14 días con reloj); persistencia tras recargar; sin datos ajenos al cambiar de identidad | US-011-01–08 |
| `cypress/e2e/cuenta-fidelidad.cy.ts` | A 390 px, medidas de cada pantalla frente a la tabla de «Pantallas» (cabecera 64, atrás 44, entradas 48/56, botones 52/54/50/48/46/44, tarjetas, radios, iconos, tipografía) | Fidelidad al diseño |
| `pnpm verify:account` (manual, remoto) | Spike y comprobación real: alta con identificador interno, mismo `user_id`, entrada en otro cliente, cambio de contraseña y de nombre, borrado y fallo de anónimo | US-011-01–07 |

Cobertura ≥ 80 % en `AuthAccessService` y `AccountAccessService`.

---

## Orden de implementación

Cada bloque: **Red → Green → Refactor**, revisión visual en navegador (claro y oscuro, comparando con el `screen.png`) y `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` (y `pnpm e2e` cuando toque). Commit y push solo con tu confirmación.

1. **Núcleo y spike (US-011-01/02 técnico)**: modelos, `username`, `mapAccountError`, `AuthAccessService` ampliado, migración y su test estático, `verify-account.mjs`. **Parada con confirmación**: ajustes del panel (confirmación de correo desactivada, contraseña mínima 8), verificar la cuenta de la CLI por id, `db push` y primera ejecución de `verify:account`. Si el spike falla, se revisa el plan antes de seguir.
2. **Base visual compartida**: tokens nuevos y sus tests, iconos nuevos con `filled`, `AccountHeader`, `AccountField`, `RuleList`, `OfflineBanner`, `AccountToast`, patrón de botón atrás de overlays y vistas previas `__dev/account/*`.
3. **Cuenta + cerrar sesión + botón de perfil (US-011-03, P1)**.
4. **Crear cuenta (US-011-01, P1)**, con `AccountAccessService.createAccount`.
5. **Iniciar sesión y tareas de este móvil (US-011-02, P1)**, con el traspaso, el buffer y la reanudación.
6. **Recordatorio, identidad y datos ajenos (US-011-08, P1)**: tarjeta, aplazamiento, limpieza de progreso, alarmas.
7. **Cambiar contraseña y borrar cuenta (US-011-05/06, P2)**.
8. ~~Cambiar nombre de usuario (US-011-07)~~ — descartada tras el spike.
9. **Cierre**: e2e de flujos y de fidelidad, recorrido completo en navegador (claro y oscuro) comparando cada pantalla con su `screen.png`, emulador Android (arranque en frío, claro y oscuro, teclado, botón atrás), `pnpm verify:account` final con confirmación, documentación, `review.md` y estado de la spec.

---

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| El servicio rechaza el identificador interno (`@cuenta.invalid`) o exige confirmar al vincular | Media | Spike en el bloque 1 antes de tocar pantallas; alternativas: otro dominio reservado, o ajustar el flujo (`updateUser` en dos llamadas) |
| «Confirm email» desactivado no basta para que cambiar el identificador sea inmediato (`double_confirm_changes`) | Media | El spike lo comprueba; si no, el cambio de nombre pasa a «borrar y crear» o se aplaza (P3) |
| `delete_my_account` no puede borrar de `auth.users` con el rol propietario | Baja | El spike lo prueba; alternativa: una función de borrado en el esquema `auth` con permisos explícitos |
| Límite de intentos del servicio sin control fino | Media | Mensaje claro y bloqueo temporal del botón en el cliente tras el 429 |
| Traspaso de tareas parcial (se cierra la app a mitad) | Media | Buffer en `localStorage` y reanudación al arrancar; reintento sin duplicar (se descuenta lo ya creado) |
| Las medidas de Stitch no son uniformes entre pantallas (entradas de 48 y de 56, botones de 46 a 54, radios distintos) | Alta | Se reproduce cada pantalla con **sus** medidas (tabla) y una e2e de medidas lo protege |
| El diseño pide `rounded-xl` de 3 rem en la nota de la hoja (no hay captura de ese estado) | Baja | Se usa 16 y se anota; se revisa en el emulador |
| Cabecera fija + teclado virtual tapan el campo | Media | Scroll al campo enfocado, relleno inferior con la zona segura y prueba en emulador |
| Iconos: el diseño usa una fuente externa de iconos | Alta | Iconos propios en SVG (con `filled`), nunca la fuente de Google; test de que no hay referencias externas |
| Contraste de los colores nuevos en oscuro | Media | Tokens validados por el test de contraste; excepciones documentadas |
| Alcance: cuenta sin recuperación puede percibirse como un fallo | Media | Aviso claro y casilla obligatoria al crear; textos de la spec |
| Nombres de usuario ocupables por cualquiera | Aceptado | Decisión del clarify |
