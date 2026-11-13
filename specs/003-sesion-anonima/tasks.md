# Tasks 003 — Sesión anónima con Supabase

**Plan**: [plan.md](./plan.md)
**Estado**: Completadas (2026-11-13)
**Fecha**: 2026-11-13

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto.

---

## Bloque 1 — Modelos y clasificación de errores (US-003-04)

- [x] T-003-01 (Red): tests de `mapAuthError`: una fila de la tabla de clasificación por caso (`network`, `service_unavailable`, `rate_limited` por 429 y por código, `disabled`) y los desconocidos → `unknown` (`src/app/core/services/auth-error.util.spec.ts`)
- [x] T-003-02 (Green): crear `auth-status.ts` (tipos y constantes) y `auth-error.util.ts` (`src/app/core/models/auth-status.ts`, `src/app/core/services/auth-error.util.ts`)
- [x] T-003-03 (Refactor): limpiar con los tests en verde

---

## Bloque 2 — `storageKey` fija en `SupabaseService` (US-003-02)

- [x] T-003-04 (Red): test de que el cliente se crea con una `storageKey` fija y que `AUTH_STORAGE_KEY` se exporta (`src/app/core/services/supabase.spec.ts`)
- [x] T-003-05 (Green): añadir `storageKey` a las opciones de auth y exportar la constante (`src/app/core/services/supabase.ts`)

---

## Bloque 3 — `AuthAccessService` (US-003-01, 02, 04)

- [x] T-003-06 (Red): estado inicial: con sesión válida en el almacenamiento → `ready` sin llamar a `getSession`; con forma inválida → se ignora y `loading`; `idle` no se expone tras `initialize()` (`src/app/core/services/auth.access.service.spec.ts`)
- [x] T-003-07 (Green): `initialize()`, lectura y validación de la sesión guardada, señales de solo lectura (`src/app/core/services/auth.access.service.ts`)
- [x] T-003-08 (Red): sin sesión llama **una vez** a `signInAnonymously`; éxito → `ready`, `userId` y error limpio; fallo → `errorReason` por `mapAuthError`
- [x] T-003-09 (Green): `attempt()` con el primer inicio
- [x] T-003-10 (Red): plazo de 10 s → `error` con `timeout` **sin cancelar** la llamada; si resuelve con éxito después, `ready` con su sesión
- [x] T-003-11 (Green): plazo por intento sin abandonar la llamada pendiente
- [x] T-003-12 (Red): un solo intento: `retry()` o un reintento automático con la llamada pendiente **se une** a ella y no lanza otra; tras un timeout también
- [x] T-003-13 (Green): llamada única en vuelo y `retry()`
- [x] T-003-14 (Red): reintento automático solo para `network`, `timeout`, `service_unavailable`, con espera creciente y después sondeo lento de 60 s (añadido tras comprobar en Android que `online` no se dispara); `autoRetryPending` solo mientras haya reintentos programados; `rate_limited`, `disabled` y `unknown` esperan al `retry()`
- [x] T-003-15 (Green): backoff, tope y señal `autoRetryPending`
- [x] T-003-16 (Red): el evento `online` y la vuelta a primer plano disparan un reintento (solo con motivo reintentable y sin llamada en vuelo)
- [x] T-003-17 (Green): disparadores `online` y `visibilitychange`
- [x] T-003-18 (Red): `TOKEN_REFRESHED` actualiza la sesión; `SIGNED_OUT` → `loading`, `session` nula y nueva sesión con `userId` distinto, pasando por `loading`
- [x] T-003-19 (Green): suscripción a `onAuthStateChange` y cambio de identidad
- [x] T-003-20 (Red): ningún token en consola en cada flujo (inicio anónimo, refresco, error y cambio de identidad), con un espía de `console`
- [x] T-003-21 (Green): registro sin payload; limpiar cualquier traza
- [x] T-003-22 (Refactor): simplificar y comprobar cobertura ≥ 80 % de `auth.access.service` y `auth-error.util`

---

## Bloque 4 — Tokens, iconos y `SessionStatus` (US-003-06)

- [x] T-003-23: pasar a `_tokens.scss` los tokens que usan estas pantallas desde `specs/_design/playful-momentum/DESIGN.md` (color claro/oscuro, radios, espaciado, escala tipográfica); tipografía = pila del sistema (`src/styles/_tokens.scss`) *(configuración, sin test)*
- [x] T-003-24 (Red): test del componente `Icon` (nombre válido pinta SVG, desconocido no pinta nada, accesible) (`src/app/shared/components/icon/icon.spec.ts`)
- [x] T-003-25 (Green): componente `Icon` con los SVG propios (wifi apagado, reloj, servidor, aviso, recarga, ayuda)
- [x] T-003-26 (Red): tabla de textos por motivo: 6 motivos → 5 variantes (`disabled` como servicio no disponible), sin términos técnicos ni textos prohibidos (`session-status.constructor.service.spec.ts`)
- [x] T-003-27 (Green): `SessionStatusConstructorService`
- [x] T-003-28 (Red): `SessionStatus`: carga sin porcentaje, pasos, XP, racha ni nivel; las 5 variantes de error; aviso de comprobación solo con `autoRetryPending`; Reintentar emite; sin elementos de prototipo; `OnPush` (`src/app/shared/components/session-status/session-status.spec.ts`)
- [x] T-003-29 (Green): `session-status.ts`, `.html` y `.scss` (área táctil ≥ 44 px, safe-areas, modo claro y oscuro con los tokens)
- [x] T-003-30 (Red): la ruta de desarrollo `__dev/session-status` solo existe con `isDevMode()` y no se registra en producción (`src/app/app.routes.spec.ts`)
- [x] T-003-31 (Green): ruta de desarrollo que muestra `SessionStatus` con cada motivo (`src/app/features/dev/session-status-preview.ts` y `app.routes.ts`)

---

## Bloque 5 — Integración en la app (US-003-01, 06)

- [x] T-003-32 (Red): `App` no pinta contenido hasta `ready`; con sesión guardada no se ve la carga; `loading` pinta `SessionStatus` de carga y `error` la de error (`src/app/app.spec.ts`)
- [x] T-003-33 (Green): `provideAppInitializer` en `app.config.ts` y `app.ts`/`app.html` con el control de estado

---

## Bloque 6 — Scripts de verificación y documentación (US-003-03, 05)

- [x] T-003-34 (Red): `config-auth.test.mjs` (registro anónimo activado y `anonymous_users` entre 1 y 30)
- [x] T-003-35 (Green): `supabase/config.toml`
- [x] T-003-36 (Red): `verify-auth.test.mjs` de la función pura `decodeJwtRole` (rol correcto, token mal formado sin lanzar y sin mostrar el token)
- [x] T-003-37 (Green): `scripts/verify-auth.mjs` (manual; solo booleanos; marcar con `secrets:allow` cualquier valor ficticio) y script `verify:auth` en `package.json`
- [x] T-003-38: `scripts/verify-supabase-assumptions.mjs` (manual, a partir del experimento: ciclo 30 s, enfriamiento 60 s, arranque sin red, sesión conservada) y script `verify:supabase` *(valores ficticios con `secrets:allow`)*
- [x] T-003-39 (Red): `docs-auth.test.mjs` (la documentación menciona `is_anonymous`, `ready` y `userId`)
- [x] T-003-40 (Green): `docs/supabase.md` (sesión anónima, RLS con `is_anonymous`, contrato de `ready` y `userId`, plazos propios de la capa de datos, cómo aplicar la configuración) y regla en `CLAUDE.md`

---

## Bloque 7 — Remoto (requiere confirmación del usuario)

- [x] T-003-41: verificar la cuenta de la CLI por id de organización y ejecutar `supabase config diff`; **mostrar el diff al usuario** y esperar confirmación. *Resultado (2026-11-13): 12 diferencias; solo `enable_anonymous_sign_ins` es deseada. `config push` degradaría confirmación de email, MFA y SMS y cambiaría `site_url`, OTP y pooler.*
- [x] T-003-42: aplicar el cambio **con el interruptor del panel** (*Allow anonymous sign-ins*), no con `config push` (ver T-003-41); lo hace el usuario
- [x] T-003-43: ejecutar `pnpm verify:auth` contra el proyecto real y comprobar los tres booleanos

---

## Bloque 8 — Verificación final

- [x] T-003-44: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-003-45 (hecha en claro; el modo oscuro y las safe-areas se comprueban en Android, T-003-46): revisión visual en navegador con la extensión de Chrome (viewport móvil): carga y 5 variantes de error por la ruta de desarrollo, claro y oscuro, área táctil, safe-areas, sin scroll horizontal, consola sin errores
- [x] T-003-46: comprobación en Android (emulador, 2026-11-13). Primer arranque con datos borrados y red: llega a la app. Reinicio con sesión guardada: abre a los 2 s. **Sin red y con el reloj +2 h (token caducado): abre al instante** y sigue sin mostrar error a los 40 s. Al restaurar reloj y red, sigue en la app. Además: modo claro y oscuro, safe-areas, y arranque sin red con aviso de reintento y recuperación sola (el evento `online` no se dispara en el WebView; lo cubre el sondeo lento)
- [x] T-003-47: marcar la spec como Implementada, actualizar `specs/README.md` y el log

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar
- [ ] Todos los criterios P1 de `spec.md` verificados (US-003-01, 02, 03 y 06)
- [ ] Revisión visual en navegador con la extensión de Chrome
- [ ] Comprobado en Android (emulador o dispositivo)
- [ ] Confirmación del usuario antes de tocar el remoto y antes de cada commit y push
