# Review NNN — Título de la Feature

**Rama**: `<usuario>/NNN-nombre-kebab`
**Fecha**: YYYY-MM-DD
**Resultado**: PENDIENTE / APROBADO / BLOQUEADO

---

## Coherencia documental

| Check | Estado | Notas |
|---|---|---|
| Todos los criterios P1 tienen tarea `[x]` y test | PASS / FAIL | |
| Todos los ficheros del plan aparecen en el diff | PASS / FAIL | |
| Decisiones de `clarify.md` reflejadas en código | PASS / FAIL | |

---

## Calidad de código

| Check | Estado | Notas |
|---|---|---|
| `pnpm lint:fix && pnpm format` sin errores | PASS / FAIL | |
| `pnpm secrets:check` sin hallazgos | PASS / FAIL | |
| `pnpm test:ci` en verde | PASS / FAIL | Cobertura: XX % |
| Sin `any` en ficheros nuevos/modificados | PASS / FAIL | |
| OnPush en componentes nuevos/modificados | PASS / FAIL | |
| Sin `console.log` de debug | PASS / FAIL | |
| Migraciones con RLS y rollback documentado | PASS / FAIL / N/A | |

---

## Verificación visual (si hay frontal)

| Check | Estado | Notas |
|---|---|---|
| Navegador (extensión de Chrome, viewport móvil) | PASS / FAIL / N/A | |
| Android (emulador o dispositivo) | PASS / FAIL / N/A | |

---

## Revisión cruzada (DeepSeek)

| Revisión | Resultado | Notas |
|---|---|---|
| Spec + clarify | Sin hallazgos / Hallazgos aceptados / Omitida (ciclo simple) | |
| Diff antes del push | Sin hallazgos / Hallazgos aceptados / Omitida | |

---

## Integridad de la rama

| Check | Estado | Notas |
|---|---|---|
| Rama basada en `main` actualizado | PASS / FAIL | |
| `git status` limpio | PASS / FAIL | |

---

## Issues encontrados

> Vacío si todos los checks pasan.

- **[BLOQUEANTE]** Descripción del problema y fichero afectado.
- **[AVISO]** Algo mejorable (no bloquea la PR).

---

## Resumen

**Resultado final**: APROBADO / BLOQUEADO
**Commits incluidos**: N
**Tests**: NNN passed, XX % cobertura
