# Tasks 007 — Posponer tareas

**Plan**: [plan.md](./plan.md)
**Estado**: En curso (cliente hecho; falta `db push` y verificación en Android)
**Fecha**: 2026-11-14

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que Stitch añada y no esté en la spec se ignora (ver `design/README.md`). Se implementa **después de la 006**.

---

## Bloque 1 — Migración y modelo (US-007-02)

- [x] T-007-01 (Red): `scripts/postpone-migration.test.mjs`: columna `postponed_count integer not null default 0`, restricción `>= 0`; sin `insert`, `drop` ni cambios de RLS; rollback documentado
- [x] T-007-02 (Green): `supabase/migrations/<marca>_tasks_postponed_count.sql` (`pnpm db:new tasks_postponed_count`)
- [x] T-007-03 (Red): `tasks.access.service.spec.ts`: el mapeo de la fila incluye `postponedCount`; los tests existentes de la spec 005 usan el campo nuevo (`row()` y los modelos)
- [x] T-007-04 (Green): `core/models/task.ts` (`postponedCount`, `postponed_count`) y mapeo en `TasksAccessService`
- [x] T-007-05: `docs/supabase.md`: columna nueva

---

## Bloque 2 — `PostponeConstructorService` (US-007-01, 02)

- [x] T-007-06 (Red): `postpone.constructor.service.spec.ts`: *Mañana* y *La semana que viene* desde hoy (hora conservada), también desde tareas atrasadas y sin fecha; el lunes siguiente y +7 si hoy es lunes; fin de mes, de año y cambio de hora
- [x] T-007-07 (Green): `choices()` con `tomorrow` y `next-week` (`features/tasks/postpone/`)
- [x] T-007-08 (Red): *Más tarde hoy (+1 hora)*: solo con hora y fecha de hoy o anterior; una hora desde ahora sin segundos; cruce de medianoche (cambia de día y la etiqueta lo dice)
- [x] T-007-09 (Green): `later-today`
- [x] T-007-10 (Red): opciones ocultas si no son posteriores a (fecha, hora) de la tarea (una tarea de mañana no ofrece «Mañana»); tarea sin hora compara solo la fecha; si no queda ninguna, solo «Elegir fecha»
- [x] T-007-11 (Green): filtrado
- [x] T-007-12 (Red): `customMin()` (hoy si está atrasada o sin fecha; día siguiente a su fecha si es de hoy o futura), `customTarget()` (null si no es posterior) y `countsAsPostponed()` (solo si ya tenía fecha y el destino es posterior)
- [x] T-007-13 (Green): mínimo, destino y contador
- [x] T-007-14 (Red): etiquetas, detalles y texto del aviso («Tarea pospuesta a Mañana a las 16:30»; fechas lejanas), sin términos técnicos
- [x] T-007-15 (Green): textos
- [x] T-007-16 (Refactor): limpiar con los tests en verde

---

## Bloque 3 — `TasksAccessService.postpone()` (US-007-01, 02)

- [x] T-007-17 (Red): `postpone()` optimista: cambia fecha y hora al instante y guarda `due_date`, `due_time` y `postponed_count`
- [x] T-007-18 (Green): `postpone()` sobre `runMutation`
- [x] T-007-19 (Red): si falla, la tarea vuelve a su sitio; el contador sube solo si ya tenía fecha y no al ponerle fecha a una sin fecha ni al editar a mano; completar y desmarcar no lo tocan; sin identidad no consulta
- [x] T-007-20 (Green): reversión y contador
- [x] T-007-21 (Red): una recarga lanzada antes y resuelta después de posponer no deshace el cambio
- [x] T-007-22 (Green): ya cubierto por la época de cambios; ajustar si hace falta
- [x] T-007-23 (Refactor): limpiar y cobertura ≥ 80 % del servicio

---

## Bloque 4 — Aviso compartido (US-007-01)

- [x] T-007-24 (Red): `tasks-notice.service.spec.ts`: muestra el aviso, se borra solo a los 3 s, error con `role="alert"`, un aviso nuevo sustituye al anterior
- [x] T-007-25 (Green): `features/tasks/tasks-notice.service.ts`
- [x] T-007-26 (Red): `tasks-list.spec.ts`: la lista usa el servicio para sus avisos (mismo comportamiento que antes: completar, error, desaparece solo)
- [x] T-007-27 (Green): refactor del aviso de la lista

---

## Bloque 5 — Icono y hoja (US-007-01)

- [x] T-007-28 (Red): icono `snooze` en `Icon` (`icon.spec.ts`)
- [x] T-007-29 (Green): SVG propio
- [x] T-007-30 (Red): `postpone-sheet.spec.ts`: título de la tarea, opciones con su detalle, elegir una emite el destino; *Elegir fecha* con selector nativo y `min`; fecha no posterior no se acepta; cerrar sin elegir no cambia nada; `role="dialog"`, `aria-modal`; botones de tipo `button` con nombre accesible; sin elementos de prototipo; `OnPush`
- [x] T-007-31 (Green): `PostponeSheet` (`.ts`, `.html`, `.scss`; objetivos ≥ 44 px, safe-areas, claro y oscuro)
- [x] T-007-32 (Refactor): limpiar

---

## Bloque 6 — Integración (US-007-01)

- [x] T-007-33 (Red): `tasks-list.spec.ts`: botón **Posponer** solo en pendientes (no en completadas); abre la hoja; elegir una opción llama a `postpone()` y muestra «Tarea pospuesta a …»; con fallo, «No se pudo posponer la tarea…»; la tarea cambia de grupo
- [x] T-007-34 (Green): lista con botón, hoja y aviso
- [x] T-007-35 (Red): `task-form.spec.ts`: **Posponer** solo en modo editar; al elegir, se cierra el formulario, se vuelve a la lista y se muestra el aviso; con fallo, se queda y avisa
- [x] T-007-36 (Green): formulario
- [x] T-007-37 (en la hoja) (Red): el botón atrás de Android cierra la hoja sin cambios (`popstate`)
- [x] T-007-38 (en la hoja) (Green): cierre con atrás

---

## Bloque 7 — Base de datos remota *(efecto en el remoto: requiere confirmación del usuario)*

- [ ] T-007-39: verificar la cuenta de Supabase (organización por **id**, `supabase orgs list`); si no coincide, parar
- [ ] T-007-40: `pnpm db:push:dry` y revisar la migración
- [ ] T-007-41: `pnpm db:push --yes` — **requiere confirmación del usuario**
- [ ] T-007-42: `pnpm verify:rls` (ampliado: `postponed_count` no admite negativos) y borrar datos de prueba

---

## Bloque 8 — Verificación y cierre

- [x] T-007-43: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-007-44 *(hoja revisada en navegador; fila de la lista y tema oscuro pendientes de ver en el emulador, ver `review.md`)*: revisión visual en navegador con la extensión de Chrome (claro y oscuro): botón en la fila, hoja con cada opción y atrasada, selector de fecha, aviso de éxito y de error; área táctil, sin scroll horizontal, consola limpia
- [ ] T-007-45 *(manual)*: emulador Android: selector nativo con mínimo, botón atrás cierra la hoja, tarea cambia de grupo, el aviso del sistema se reprograma (con la 006) y la tarea pospuesta persiste al reabrir
- [ ] T-007-46: documentar lo comprobado, marcar la spec como Implementada, actualizar `specs/README.md` y el log

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar
- [ ] Criterios P1 de `spec.md` verificados (US-007-01 y 03)
- [ ] Revisión visual en navegador con la extensión de Chrome
- [ ] Comprobado en el emulador Android
- [ ] RLS comprobada contra el remoto
- [ ] Confirmación del usuario antes de `db push`, de cada commit y de cada push
