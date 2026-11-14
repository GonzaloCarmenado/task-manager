# Tasks 008 — Gamificación: XP, niveles y rachas

**Plan**: [plan.md](./plan.md)
**Estado**: Implementada (verificada en emulador Android; la racha entre días solo con `verify:progress` y e2e)
**Fecha**: 2026-11-14

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que Stitch añada y no esté en la spec se ignora (ver `design/README.md`). Se implementa **después de la 006 y la 007**. El cliente se adapta primero y la migración se sube **al final**.

---

## Bloque 1 — Migración y sus tests estáticos (US-008-01, 02, 03)

- [x] T-008-01 (Red): `scripts/progress-migration.test.mjs`: columnas `completed_day`, `xp_awarded`, `xp_day` y sus restricciones; tablas `player_stats` y `xp_events` con `user_id`, RLS y solo lectura desde el cliente (`revoke` y `grant select`); disparadores `before insert or update` y `after update`; `get_progress` ejecutable solo por `authenticated` y las demás funciones sin ejecución pública; `security definer` con `search_path` fijado; sin `insert` de ejemplo; rollback documentado
- [x] T-008-02 (Green): `supabase/migrations/<marca>_progress.sql` (`pnpm db:new progress`) con el SQL del plan *(solo local; no se sube todavía)*
- [x] T-008-03: `docs/supabase.md`: tablas, funciones, reglas de XP, tope y racha

---

## Bloque 2 — Modelo y `ProgressConstructorService` (US-008-02, 05)

- [x] T-008-04: `core/models/progress.ts` (`Progress`, `ProgressRow`, `XP_PER_TASK`, `DAILY_XP_CAP`) *(solo tipos)*
- [x] T-008-05 (Red): `progress.constructor.service.spec.ts`: `xpToReach(N) = 25·N·(N−1)` (50, 150, 300, 500…) y `levelOf()` en cada umbral y en los bordes (49, 50, 149, 150, 0); XP dentro del nivel y para el siguiente
- [x] T-008-06 (Green): curva y nivel (`features/progress/`)
- [x] T-008-07 (Red): `toProgress()` desde `ProgressRow`; usuario nuevo (nivel 1, 0 XP, racha 0)
- [x] T-008-08 (Green): `toProgress()`
- [x] T-008-09 (Red): `celebration()`: «+10 XP», tope alcanzado (0 XP), primera tarea del día con racha, desmarcar («−N XP» con los XP realmente quitados; 0 → sin cifra), subida de nivel (nivel final una sola vez) y bajada de nivel sin pantalla
- [x] T-008-10 (Green): `celebration()`
- [x] T-008-11 (Red): textos en español, sin términos técnicos ni rangos con nombre
- [x] T-008-12 (Green): textos
- [x] T-008-13 (Refactor): limpiar con los tests en verde

---

## Bloque 3 — `TasksAccessService`: día local (US-008-01, 03)

- [x] T-008-14 (Red): `tasks.access.service.spec.ts`: `setCompleted(true)` envía `completed_at` y `completed_day` **local** (también 23:59 y 00:01); `setCompleted(false)` envía ambos a `null`; sin red no se inventa nada; los tests de la 005 siguen en verde
- [x] T-008-15 (Green): `setCompleted` con `completed_day`

---

## Bloque 4 — `ProgressAccessService` (US-008-01, 02, 04)

- [x] T-008-16 (Red): `progress.access.service.spec.ts` (cliente simulado): `load()` llama a `get_progress` con el **día local**, mapea la respuesta, estados `loading`, `ready` y `error`, plazo de 8 s, caché por `userId`, nada en consola
- [x] T-008-17 (Green): `load()`
- [x] T-008-18 (Red): `afterToggle()`: recarga y emite la celebración comparando antes y después; solo con dato confirmado (con error no hay celebración ni XP); subida de nivel solo al subir completando
- [x] T-008-19 (Green): `afterToggle()` y `levelUp`
- [x] T-008-20 (Red): un fallo al recargar conserva el último dato de la apertura; recarga lanzada antes no pisa una más nueva
- [x] T-008-21 (Green): robustez
- [x] T-008-22 (Refactor): limpiar y cobertura ≥ 80 % de `progress.access.service.ts`

---

## Bloque 5 — Iconos y componentes (US-008-04, 05)

- [x] T-008-23 (Red): iconos `flame`, `star`, `trophy` en `Icon` (`icon.spec.ts`)
- [x] T-008-24 (Green): SVG propios
- [x] T-008-25 (Red): `progress-summary.spec.ts`: nivel, barra «X / Y XP» y racha; racha viva con «completa 1 tarea hoy para mantenerla»; carga sin bloquear; error con último dato o **Reintentar**; tocar abre `/progreso`; `OnPush`
- [x] T-008-26 (Green): `ProgressSummary`
- [x] T-008-27 (Red): `progress-screen.spec.ts`: nivel, XP total, XP para el siguiente, racha actual, mejor racha, **XP de hoy (X / 100)**, usuario nuevo, carga y error con Reintentar; atrás y cerrar; sin simuladores, misiones, tienda ni rangos
- [x] T-008-28 (Green): `ProgressScreen` (`/progreso`)
- [x] T-008-29 (Red): `level-up.spec.ts`: nivel nuevo y enhorabuena; **Continuar** y tocar en cualquier parte vuelven a la lista; sin «Completadas», «+25 XP» ni flujo de huella
- [x] T-008-30 (Green): `LevelUp` (`/nivel/:level`)
- [x] T-008-31 (Red): `celebration.spec.ts`: «+10 XP», tope, «Llevas N días» y «−N XP»; dura ≈ 1 s, no bloquea, versión estática con `prefers-reduced-motion`, sin sonido ni vibración
- [x] T-008-32 (Green): `Celebration`
- [x] T-008-33 (Refactor): limpiar

---

## Bloque 6 — Integración y rutas (US-008-04)

- [x] T-008-34 (Red): `app.routes.spec.ts`: `progreso` y `nivel/:level` lazy y **antes** de `:id`
- [x] T-008-35 (Green): rutas
- [x] T-008-36 (Red): `tasks-list.spec.ts`: resumen arriba de la lista; completar dispara `afterToggle` y muestra la celebración; subir de nivel lleva a la pantalla de subida; desmarcar muestra «−N XP»; nada de esto cambia el comportamiento de completar con fallo
- [x] T-008-37 (Green): lista con resumen, celebración y subida de nivel

---

## Bloque 7 — Base de datos remota *(efecto en el remoto: requiere confirmación del usuario)*

- [x] T-008-38 (Red): `scripts/verify-progress.mjs` escrito (prueba real, manual) con los escenarios del plan; se ejecuta tras el `db push`
- [x] T-008-39: verificar la cuenta de Supabase (organización por **id**); si no coincide, parar
- [x] T-008-40: `pnpm db:push:dry`, revisar la migración con el usuario
- [x] T-008-41: `pnpm db:push --yes` — **requiere confirmación del usuario**
- [x] T-008-42 (Green): `pnpm verify:progress` y `pnpm verify:rls` en verde: XP, tope, desmarcar, racha, borrar, aislamiento y escrituras denegadas; borrar los datos de prueba

---

## Bloque 8 — Verificación y cierre

- [x] T-008-43: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-008-44 *(parcial: resumen, racha viva, pantalla, celebración, subida de nivel y error en navegador; tema oscuro y la lista con datos reales, pendientes del emulador)*: revisión visual en navegador con la extensión de Chrome (claro y oscuro): resumen, celebración, progreso, subida de nivel, usuario nuevo, tope, racha viva y rota; área táctil, sin scroll horizontal, consola limpia
- [x] T-008-45 *(manual, hecho en el emulador el 2026-11-14; la racha entre días y el tope de 100 XP no se repitieron en el emulador: los cubren `verify:progress` y las e2e)*: emulador Android: completar, desmarcar, tope de 100 XP, subir de nivel, racha entre días (cambiando la fecha del emulador) y persistencia al reabrir
- [x] T-008-46: `docs/supabase.md`, `CLAUDE.md` (comandos `verify:progress`), marcar la spec como Implementada, actualizar `specs/README.md` y el log

---

## Checklist de cierre

- [x] `pnpm lint:fix && pnpm format` sin errores
- [x] `pnpm secrets:check` sin hallazgos
- [x] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar
- [x] Criterios P1 de `spec.md` verificados (US-008-01, 02 y 03)
- [x] Revisión visual en navegador con la extensión de Chrome
- [x] Comprobado en el emulador Android
- [x] `verify:progress` y `verify:rls` contra el remoto
- [x] Confirmación del usuario antes de `db push`, de cada commit y de cada push
