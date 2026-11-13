# Plan 003 — Sesión anónima con Supabase

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: [design/](./design/README.md) · sistema de diseño [Playful Momentum](../_design/playful-momentum/DESIGN.md)
**Estado**: Aprobado (2026-11-13)
**Fecha**: 2026-11-13

**Decisiones tomadas al aprobar**: (1) tipografía: pila del sistema por ahora, sin descargar fuentes; (2) ruta solo de desarrollo para revisar las variantes de error (`isDevMode()`, inexistente en producción); (3) configuración remota: se decide en el paso 7 con `supabase config diff` delante.

---

## Enfoque técnico

Un único servicio, `AuthAccessService`, es el dueño de la identidad: decide el estado inicial, crea la sesión anónima si hace falta, clasifica los fallos y reintenta. Expone señales de solo lectura (`status`, `session`, `userId`, `errorReason`, `autoRetryPending`) y un método `retry()`. Solo él toca `supabase.auth`.

Dos decisiones de diseño dirigen todo lo demás, y las dos vienen de comprobar la librería real (`auth-js` 2.119.0), no de suponer:

1. **El arranque no pasa por `getSession()`.** Con un token caducado y sin red tarda ~25 s y devuelve `null`. El servicio lee la sesión guardada **directamente del almacenamiento** (con una `storageKey` fija que fija `SupabaseService`), valida su forma y decide el estado **antes del primer renderizado** mediante un inicializador de la app. Con sesión guardada, `ready` al instante; sin ella, `loading` y primer `signInAnonymously()`. `supabase-js` refresca por su cuenta en segundo plano.
2. **Una sola llamada en vuelo, siempre.** El plazo del primer inicio solo cambia lo que se ve (`error` con `timeout`); la llamada pendiente no se cancela (la librería no lo permite). `retry()` o un reintento automático se **unen** a ella en lugar de lanzar otra, y si resuelve con éxito se usa su sesión. Así no hay usuarios anónimos huérfanos ni gasto extra del límite por IP.

La interfaz es un componente presentacional, `SessionStatus`, con una variante de carga y cinco de error, sin lógica: recibe el estado y emite `retry`. El componente raíz decide si cubre la app o deja pasar el `router-outlet`.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `src/app/core/models/auth-status.ts` | Crear | Tipos `AuthStatus`, `AuthErrorReason` y constantes del módulo |
| `src/app/core/services/auth.access.service.ts` (+ `.spec.ts`) | Crear | Estado, sesión anónima, un solo intento, plazo, reintentos, `onAuthStateChange` |
| `src/app/core/services/auth-error.util.ts` (+ `.spec.ts`) | Crear | `mapAuthError()` pura: error de `auth-js` → `AuthErrorReason` |
| `src/app/core/services/supabase.ts` (+ `.spec.ts`) | Modificar | `storageKey` fija y exportada (`AUTH_STORAGE_KEY`) |
| `src/app/app.config.ts` | Modificar | `provideAppInitializer` que inicializa la identidad antes del primer render |
| `src/app/app.ts`, `app.html`, `app.scss`, `app.spec.ts` | Modificar | Cubrir la app con `SessionStatus` salvo `ready` |
| `src/app/shared/components/session-status/session-status.ts` (+ `.html`, `.scss`, `.spec.ts`) | Crear | Carga y 5 variantes de error, `OnPush`, standalone |
| `src/app/shared/components/session-status/session-status.constructor.service.ts` (+ `.spec.ts`) | Crear | Textos y variante por motivo (config estática) |
| `src/app/shared/components/icon/` (+ spec) | Crear | Iconos SVG propios (sin fuente de iconos externa) |
| `src/styles/_tokens.scss` | Modificar | Tokens de Playful Momentum (color, radios, espaciado, tipografía) claro y oscuro |
| `src/index.html` | Modificar | Sin enlaces a CDN; `color-scheme` ya está |
| `supabase/config.toml` | Modificar | `enable_anonymous_sign_ins = true`, `anonymous_users` entre 1 y 30 |
| `scripts/config-auth.test.mjs` | Crear | Comprueba `config.toml` |
| `scripts/verify-auth.mjs` (+ `.test.mjs`) | Crear | Verificación real manual; `decodeJwtRole` pura con test |
| `scripts/verify-supabase-assumptions.mjs` | Crear | Hechos de `supabase-js` (ciclo 30 s, enfriamiento 60 s, arranque sin red, sesión conservada) |
| `scripts/docs-auth.test.mjs` | Crear | `docs/supabase.md` documenta `is_anonymous`, `ready` y `userId` |
| `docs/supabase.md` | Modificar | Sesión anónima, RLS con `is_anonymous`, contrato de `ready`, cómo aplicar la config |
| `CLAUDE.md` | Modificar | Regla: datos por `auth.uid()`; capas de datos indexan por `userId()` y aplican plazos |
| `package.json` | Modificar | Scripts `verify:auth` y `verify:supabase` |
| `specs/README.md` | Modificar | Estado de la 003 |

Supabase remoto: habilitar el inicio de sesión anónimo (con confirmación y cuenta verificada). Sin migraciones: no hay tablas.

---

## Interfaces TypeScript

```typescript
// src/app/core/models/auth-status.ts
export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AuthErrorReason =
  | 'network'
  | 'rate_limited'
  | 'disabled'
  | 'timeout'
  | 'service_unavailable'
  | 'unknown';

/** Motivos que se reintentan solos; el resto espera al retry() manual. */
export const AUTO_RETRY_REASONS: readonly AuthErrorReason[] = [
  'network',
  'timeout',
  'service_unavailable',
];

export const ATTEMPT_TIMEOUT_MS = 10_000;
export const AUTO_RETRY_DELAYS_MS: readonly number[] = [2_000, 5_000, 15_000, 30_000];
```

```typescript
// src/app/core/services/auth.access.service.ts (API pública)
export class AuthAccessService {
  readonly status: Signal<AuthStatus>;
  readonly session: Signal<Session | null>;
  readonly userId: Signal<string | null>;            // computed de session
  readonly errorReason: Signal<AuthErrorReason | null>;
  readonly autoRetryPending: Signal<boolean>;
  initialize(): void;   // síncrono: decide el estado inicial leyendo el almacenamiento
  retry(): void;
}
```

```typescript
// src/app/core/services/auth-error.util.ts
export function mapAuthError(error: unknown): AuthErrorReason;
```

---

## Máquina de estados y flujos

- **`initialize()`** (síncrono, no espera a la red): lee `AUTH_STORAGE_KEY`; si hay una sesión con forma válida (usuario y token de refresco) → `session`, `status = 'ready'`, y suscripción a `onAuthStateChange`. Si no → `status = 'loading'` y `attempt()`.
- **`attempt()`**: si ya hay una llamada en vuelo, **se une a ella** y reinicia el plazo; si no, lanza `signInAnonymously()` y arranca el plazo (10 s). Éxito → `ready`, limpia error, cancela reintentos. Error → `mapAuthError()`; si el motivo está en `AUTO_RETRY_REASONS` programa el siguiente reintento con espera creciente (`autoRetryPending = true`), si no espera a `retry()`.
- **Plazo agotado** con la llamada aún pendiente: `status = 'error'`, `errorReason = 'timeout'`, sin cancelar la llamada; si luego resuelve con éxito, `ready`.
- **Disparadores de reintento** (solo con motivo en `AUTO_RETRY_REASONS` y sin llamada en vuelo): fin de la espera creciente (2, 5, 15 y 30 s) y después **sondeo lento cada 60 s**; además `visibilitychange` a visible y el evento `online` como aceleradores. El sondeo se pausa con la app en segundo plano. **El evento `online` no se dispara en el WebView de Android** (comprobado en emulador), por eso el sondeo es el mecanismo garantizado.
- **Eventos de `supabase-js`**: `TOKEN_REFRESHED` actualiza `session`. Todo `SIGNED_OUT` es un rechazo del servidor (no hay cierre de sesión en esta spec): `status = 'loading'`, `session = null` y nuevo `attempt()`; al terminar, `ready` con un `userId` nuevo.
- **Registro**: nunca se escribe un token en consola; los eventos se registran sin payload.

### Clasificación de errores (`mapAuthError`, códigos confirmados en `auth-js` 2.119.0)

| Condición | Motivo |
|---|---|
| `isAuthRetryableFetchError` con `status` 0 (sin red) | `network` |
| `isAuthRetryableFetchError` con `status` ≥ 500, o `AuthApiError` ≥ 500 | `service_unavailable` |
| `AuthApiError` con `status` 429 o código `over_request_rate_limit` | `rate_limited` |
| `AuthApiError` con código `anonymous_provider_disabled` | `disabled` |
| Cualquier otra cosa | `unknown` |

Rechazo definitivo del refresco (informativo; lo detecta `SIGNED_OUT`): `refresh_token_not_found`, `refresh_token_already_used`, `session_not_found`, `user_not_found`.

---

## Pantallas (diseño de Stitch → componentes)

| Pantalla de Stitch | Componente / variante | Datos | Acciones |
|---|---|---|---|
| `preparando-la-app` | `SessionStatus` · variante `loading` (`status` `loading`, `idle` y cambio de identidad) | mensaje breve y amable + indicador **indeterminado** | ninguna |
| `algo-no-ha-ido-bien` | `SessionStatus` · variante `error` con 5 mensajes | título y texto según `errorReason`; aviso de comprobación solo si `autoRetryPending` | **Reintentar** → `retry()` |

Mapa motivo → variante: `network` Sin conexión · `rate_limited` Demasiados intentos · `timeout` Tarda más de lo normal · `service_unavailable` y `disabled` Servicio no disponible · `unknown` Error inesperado.

Se descarta del diseño (ver `design/README.md`): barra de progreso y pasos, XP/racha/nivel, textos «en tu dispositivo» y «avances a salvo», selector de tema, simulador, herramienta de prueba y barra «System Recovery». El tema sigue al del sistema.

**Tokens**: de `DESIGN.md` se pasan a `_tokens.scss` los colores (claro/oscuro), radios, espaciado y la escala tipográfica, como variables CSS. Solo lo que usan estas pantallas; el resto, cuando haga falta.

**Iconos**: la maqueta usa Material Symbols por CDN de Google. No se carga nada externo: se dibujan **SVG propios** (wifi apagado, reloj, servidor, aviso, recarga) en un componente `Icon`.

**Tipografía**: la maqueta usa Plus Jakarta Sans por CDN. Hasta decidirlo, se usa la pila del sistema (`system-ui`). Ver decisiones abiertas.

---

## Estrategia de tests (TDD)

Cada fila es un ciclo Red → Green. Todos los nombres de `it` llevan el id `US-003-xx`.

| Fichero spec | Qué cubre | Criterios |
|---|---|---|
| `auth-error.util.spec.ts` | Tabla de clasificación completa, con un caso por fila y los desconocidos | US-003-04 CA 1 |
| `supabase.spec.ts` | `storageKey` fija y exportada | US-003-02 CA 2 |
| `auth.access.service.spec.ts` | Estado inicial leyendo el almacenamiento sin `getSession`; sesión inválida ignorada; `idle` nunca expuesto tras `initialize()`; `signInAnonymously` una vez; plazo → `timeout` sin cancelar; `retry()` se une a la llamada pendiente; éxito tardío usa su sesión; backoff, tope y `autoRetryPending`; `online` y primer plano; motivos sin reintento; `SIGNED_OUT` → `loading` y nueva sesión con `uid` nuevo; `TOKEN_REFRESHED`; ningún token en consola en cada flujo | US-003-01, 02, 04 |
| `session-status.spec.ts` | Variante de carga sin porcentaje, pasos, XP, racha ni nivel; 6 motivos → 5 variantes; aviso solo con `autoRetryPending`; Reintentar emite; sin textos prohibidos; `OnPush`; sin elementos de prototipo | US-003-06 |
| `session-status.constructor.service.spec.ts` | Tabla de textos por motivo | US-003-06 CA 2-3 |
| `app.spec.ts` | La app no pinta contenido hasta `ready`; con sesión guardada no se ve la carga | US-003-01 CA 4, US-003-06 CA 7 |
| `config-auth.test.mjs` | `enable_anonymous_sign_ins = true` y `anonymous_users` entre 1 y 30 | US-003-05 |
| `verify-auth.test.mjs` | `decodeJwtRole` | US-003-03 |
| `docs-auth.test.mjs` | `docs/supabase.md` documenta `is_anonymous`, `ready` y `userId` | US-003-03 CA 3 |

Verificación manual (obligatoria): `pnpm verify:auth` contra el proyecto real, `pnpm verify:supabase` (la lanza quien actualice `supabase-js`), revisión visual en navegador con la extensión de Chrome (viewport móvil, claro y oscuro, área táctil, safe-areas) y comprobación en Android: primer arranque, reinicio **con y sin red** (modo avión por `adb`), y que el evento `online` se dispara en el WebView.

Cobertura: ≥ 80 % en `auth.access.service` y `auth-error.util`, sin bajar la existente.

---

## Orden de implementación

1. `auth-status.ts` y `mapAuthError` (TDD).
2. `supabase.ts`: `storageKey` fija (TDD).
3. `AuthAccessService` en ciclos pequeños: lectura del almacenamiento → primer intento → plazo → un solo intento → backoff → disparadores → `SIGNED_OUT`.
4. Tokens de diseño, `Icon` y `SessionStatus` + su servicio de textos (TDD de componente).
5. `app.config.ts` (inicializador) y `app.ts`/`app.html`.
6. Scripts de verificación y tests de ficheros; `docs/supabase.md` y `CLAUDE.md`.
7. `config.toml`; con confirmación: `supabase config diff` y después `supabase config push` (o el ajuste equivalente en el panel).
8. `pnpm verify:auth`; revisión visual en navegador; prueba en Android.

---

## Riesgos y decisiones abiertas

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| El formato del almacenamiento de `supabase-js` cambia al actualizar la librería | Media | `verify:supabase` lo comprueba; `initialize()` valida la forma y, si no la reconoce, cae a «sin sesión» (nunca a un estado inconsistente) |
| `config push` sobrescribe ajustes del remoto que no están en `config.toml` | **Materializado** (diff del 2026-11-13: 11 diferencias no deseadas, entre ellas confirmación de email, MFA y SMS) | **No se usa `config push`**: se activa solo el proveedor anónimo desde el panel y se verifica con `config diff` y `pnpm verify:auth` |
| El evento `online` no se dispara en el WebView de Android | **Materializado** (emulador, 2026-11-13) | Sondeo lento de 1 llamada/min mientras haya error reintentable y la app esté a la vista; `online` y primer plano solo aceleran |
| Crear una sesión anónima en cada arranque por un fallo de lectura del almacenamiento | Baja | Test explícito; solo se llama a `signInAnonymously()` si no hay sesión válida ni llamada en vuelo |
| Las consultas a datos esperan hasta ~25 s sin red con token caducado | Cierta (futuro) | Documentado en el contrato de `ready`; las capas de datos aplican plazos propios |

**Decisiones abiertas (necesitan al usuario):**

1. **Tipografía**: autoalojar Plus Jakarta Sans exige **descargar** los ficheros de la fuente (licencia abierta). ¿La descargo y la incluyo, o arrancamos con la fuente del sistema y se decide después?
2. **Revisar los estados de error en el navegador**: para ver las cinco variantes hace falta forzarlas. Propuesta: una ruta **solo de desarrollo** (`isDevMode()`) que muestra `SessionStatus` con cada motivo. No existe en producción y no forma parte de la UI. La alternativa es revisar solo con los tests de componente y en el emulador.
3. **Aplicar la configuración al remoto**: ¿`config push` (reproducible, pero pisa ajustes) o el interruptor del panel? Se decide en el paso 7, con el diff delante.
