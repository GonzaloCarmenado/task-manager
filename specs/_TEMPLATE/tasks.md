# Tasks NNN — Título de la Feature

**Plan**: [plan.md](./plan.md)
**Estado**: Pendiente
**Fecha**: YYYY-MM-DD

> Cada historia sigue TDD: las tareas de test (Red) van SIEMPRE antes de las de implementación (Green).

---

## Bloque 1 — BBDD (si aplica)

- [ ] T-NNN-01: Crear migración `YYYYMMDDHHMMSS_descripcion.sql` con RLS (`supabase/migrations/`)
- [ ] T-NNN-02: `pnpm db:push:dry` y, tras confirmación del usuario, `pnpm db:push`

---

## Bloque 2 — US-NNN-01 (P1)

- [ ] T-NNN-03 (Red): Escribir tests de US-NNN-01 y comprobar que fallan por el motivo correcto (`src/app/.../x.spec.ts`)
- [ ] T-NNN-04 (Green): Implementar lo mínimo para que pasen (`src/app/.../x.ts`)
- [ ] T-NNN-05 (Refactor): Limpiar con los tests en verde

---

## Bloque 3 — US-NNN-02 (P2)

- [ ] ...

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` en verde, cobertura sin bajar
- [ ] Todos los criterios P1 de `spec.md` verificados
- [ ] Revisión visual en navegador con la extensión de Chrome (si hay frontal)
- [ ] Comprobado en Android (emulador o dispositivo)
