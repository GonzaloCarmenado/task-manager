# Revisión — Spec 009: pruebas e2e con Cypress

**Fecha**: 2026-11-14 · **Resultado**: correcto

| Comprobación | Resultado |
|---|---|
| Coherencia spec → código | `cypress/`, `cypress.config.mjs`, `scripts/e2e.mjs`, configuración `e2e` de Angular y `environment.e2e.ts` presentes |
| `pnpm e2e` | 42/42 pruebas en verde (5 ficheros, ≈ 30 s) |
| `pnpm lint:fix`, `pnpm format`, `pnpm type-check` (incluye `cypress/tsconfig.json`) | Sin errores |
| `pnpm secrets:check` | OK; el entorno e2e usa valores ficticios y nada toca un Supabase real |
| `pnpm test:ci` / `pnpm test:scripts` | 553 / 78 en verde |
| Revisión visual / Android | No aplica (sin frontal) |

**Límites conocidos**: el simulador replica las reglas documentadas pero no ejecuta las migraciones SQL (las cubren `verify:rls` y `verify:progress`); sin tema oscuro, Android ni ejecución en CI.

Durante la escritura de las pruebas aparecieron suposiciones erróneas mías, no de la app: una tarea nueva nace con fecha de hoy, el borrado fallido deja el formulario abierto con su error y `postgrest-js` reintenta solo las lecturas que fallan por red.
