# Tasks 012 — Tareas repetitivas

**Plan**: [plan.md](./plan.md)
**Estado**: Completadas
**Fecha**: 2026-11-15

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. **Fidelidad al diseño**: cada pantalla termina con una tarea de **medidas** en el navegador y otra de **comparación lado a lado** con su `screen.png` (`specs/012-tareas-repetitivas/design/`), teniendo en cuenta lo ignorado y corregido en `design/README.md`. Todo lo que toca el remoto (`db push`) lleva la nota «requiere confirmación del usuario» y antes se verifica la cuenta de la CLI por **id de organización**. Ciclo simple: no hay revisión cruzada.

---

## Bloque 1 — BBDD (modelo de datos)

- [x] T-012-01 (Red): `scripts/recurrence-migration.test.mjs`: `task_series` con las 4 políticas por `user_id = (select auth.uid())`, `revoke … from anon`, restricciones (semanal con días, mensual con día e intervalo 1, `until >= start`, títulos), `series_id`/`series_date` en `tasks` con `on delete set null`, índice único parcial `tasks_series_one_pending`, disparador `tasks_series_guard` (futura rechazada, desmarcar borra la pendiente, sin `security definer`), sin `drop table` ni `truncate` fuera del rollback comentado, rollback documentado. Comprobar que falla porque la migración no existe
- [x] T-012-02 (Green): migración `supabase/migrations/20261116100000_task_series.sql` según el plan
- [x] T-012-03: `pnpm db:push:dry` y, tras confirmación del usuario y verificar la cuenta de la CLI por id de organización, `pnpm db:push` *(requiere confirmación del usuario)*
- [x] T-012-04: comprobación real manual con una tarea y serie de prueba (índice único, futura rechazada, desmarcar borra la pendiente) sin dejar datos *(requiere confirmación del usuario)*

---

## Bloque 2 — Modelos y reglas puras (US-012-01, 02, 05, 06: núcleo de cálculo)

- [x] T-012-05 (Red): `core/utils/local-date.spec.ts`: `daysBetween`, `daysInMonth` (años bisiestos), `weekdayOf` (1 = lunes … 7 = domingo) y que nada usa `toISOString()`
- [x] T-012-06 (Green): `daysBetween`, `daysInMonth`, `weekdayOf` en `core/utils/local-date.ts`
- [x] T-012-07: modelos `core/models/recurrence.ts` (`Recurrence`, `TaskSeries`, `SeriesRow`, límites) y cambios de tipos en `core/models/task.ts` (`seriesId`, `seriesDate`, `recurrence?`, `seriesDate?`, `series_id`, `series_date`) *(solo tipos; los literales de `Task` existentes se completan con `null`)*
- [x] T-012-08 (Red): `core/utils/recurrence.spec.ts`: `isRecurrenceValid` (días vacíos, día del mes fuera de rango, intervalos 0 y 31, `until` anterior), `occursOn` (diaria cada 1 y cada N, semanal con fase de N semanas, mensual con 29/30/31 en meses cortos y bisiestos, antes de `startDate`), `firstOnOrAfter` (el mismo día vale, `until` incluido y pasado → `null`, «cada 30 semanas» dentro de 400 días), `nextAfter` (posterior a la ocurrencia, no anterior a hoy, atrasada), cambios de hora de marzo y octubre
- [x] T-012-09 (Green): `core/utils/recurrence.ts`
- [x] T-012-10 (Refactor): limpiar con los tests en verde y `pnpm type-check`

---

## Bloque 3 — Acceso a datos y simulador (US-012-01, 02, 03: capa de datos)

- [x] T-012-11: `cypress/support/backend.ts`: tabla `task_series` (varios usuarios, RLS por usuario), `series_id`/`series_date` en tareas, índice único parcial (23505), disparador de guarda (futura → error `P0001`; desmarcar borra la pendiente), `on delete set null` al borrar la serie, rutas `/rest/v1/task_series`
- [x] T-012-12 (Red): `tasks.access.service.spec.ts` · carga: series en paralelo con las tareas, caché indexada por `userId()`, `forget` limpia las series, `seriesOf`; fallo de red al cargar mantiene el estado actual
- [x] T-012-13 (Green): carga de series y `seriesOf` en `tasks.access.service.ts`
- [x] T-012-14 (Red): `tasks.access.service.spec.ts` · `create` con `recurrence`: inserta la serie (título, hora, regla, `start_date`) y la ocurrencia con `series_id`/`series_date`; si falla la ocurrencia borra la serie; sin fecha se rechaza; las tareas sueltas se crean como hasta ahora
- [x] T-012-15 (Green): `create` con serie
- [x] T-012-16 (Red): `tasks.access.service.spec.ts` · completar: crea la siguiente (`nextAfter`) con título y hora de la serie; reintento con 23505 no duplica; fallo al crear la siguiente no revierte lo completado; la última ocurrencia (por `until`) no crea otra; ocurrencia atrasada → siguiente desde hoy; futura rechazada por el servidor (`P0001`) y revertida; resultado con `next`
- [x] T-012-17 (Green): `setCompleted` devuelve `CompleteResult` y crea la siguiente
- [x] T-012-18 (Red): `tasks.access.service.spec.ts` · desmarcar una ocurrencia: sale de la caché la pendiente de esa serie y vuelve la desmarcada; fallo del servidor revierte las dos cosas
- [x] T-012-19 (Green): desmarcar con una sola pendiente por serie
- [x] T-012-20 (Red): `tasks.access.service.spec.ts` · autorreparación en `load()`: serie sin pendiente → se crea la siguiente; con `inFlight > 0` no; serie terminada no crea nada; 23505 ignorado; no escribe en consola
- [x] T-012-21 (Green): autorreparación
- [x] T-012-22 (Red): `tasks.access.service.spec.ts` · `updateOccurrence` (cambia la fila, no la serie ni `series_date`, no permite quitar la fecha), `updateSeries` (serie: título, hora, regla, `start_date` = fecha del formulario y pendiente recolocada en el primer día válido desde `max(fecha, hoy)`; suelta → serie; serie → suelta desenlaza y borra la serie), `removeOccurrence` (borra y crea la siguiente), `removeSeries` (borra la serie y después la fila; si lo segundo falla, queda suelta); reversión en fallos
- [x] T-012-23 (Green): `updateOccurrence`, `updateSeries`, `removeOccurrence`, `removeSeries`
- [x] T-012-24 (Red): `account.access.service.spec.ts` y `core/models/account.ts`: la instantánea de tareas locales incluye `recurrence`, el traspaso recrea la serie con `recurrence` y `seriesDate`, y un buffer antiguo (sin `recurrence`) sigue siendo válido; las completadas no se traspasan
- [x] T-012-25 (Green): `LocalTask.recurrence?` y cambios en `account.access.service.ts`
- [x] T-012-26 (Refactor): limpiar `tasks.access.service.ts` con los tests en verde; comprobar cobertura ≥ 80 %

---

## Bloque 4 — US-012-01 · Crear una tarea repetitiva (P1)

- [x] T-012-27 (Red): `recurrence.constructor.service.spec.ts`: opciones de frecuencia, nombres de día (L M X J V S D), validación («Elige al menos un día»), resumen en lenguaje natural («Todos los días», «Lun, jue») y «Primera ocurrencia: …»
- [x] T-012-28 (Green): `features/tasks/recurrence/recurrence.constructor.service.ts` (hasta «Todos los días» y «Días de la semana»; el resto llega en el Bloque 8)
- [x] T-012-29: iconos nuevos en `shared/components/icon/` (repetir, repetición de evento, candado, candado con reloj, uno, infinito, saltar, escudo verificado, barrido de papelera) y su test; comprobar que el paquete inicial sigue dentro de presupuesto
- [x] T-012-30 (Red): `recurrence-sheet.spec.ts`: la hoja muestra las opciones y, en «Días de la semana», siete botones de ≥ 44 px; «Listo» desactivado sin días; «Descartar», cerrar y atrás descartan; «Listo» emite la regla; OnPush; capa en `OverlayBack`
- [x] T-012-31 (Green): `recurrence-sheet.{ts,html,scss}` con tokens y mixins (No se repite, Todos los días, Días de la semana, resumen y primera ocurrencia)
- [x] T-012-32 (Red): `task-form.spec.ts`: fila «Repetir» («No se repite» por defecto; desactivada y con «Elige una fecha para repetir la tarea» sin fecha; quitar la fecha con regla la deja en «No se repite» y avisa), guardar con regla llama a `create` con la regla, `startDate` y primera ocurrencia, sin tocar el comportamiento de las tareas sueltas
- [x] T-012-33 (Green): fila «Repetir» y apertura de la hoja en `task-form.{ts,html,scss}`
- [x] T-012-34: vistas previas de desarrollo `/__dev/tasks/repetir-formulario` y `/__dev/tasks/repetir-hoja/<estado>` (con su test)
- [x] T-012-35: Medidas en el navegador del formulario y la hoja a 390 px y comparación lado a lado con `formulario-configurar-repeticion/screen.png` (claro y oscuro, consola limpia)
- [x] T-012-36 (Refactor): limpiar con los tests en verde

---

## Bloque 5 — US-012-02 · Completar una ocurrencia y que aparezca la siguiente (P1) y US-012-04 (parte de la lista)

- [x] T-012-37 (Red): `tasks.constructor.service.spec.ts`: `isFuture` (serie y fecha posterior a hoy), «Disponible el <día>», textos «Hecho. Próxima: <día>» y «Hecho. Era la última repetición», chip de repetición de la regla
- [x] T-012-38 (Green): textos y `isFuture` en `tasks.constructor.service.ts`
- [x] T-012-39 (Red): `tasks-list.spec.ts`: chip con icono y texto en las repetitivas (accesible sin color); futura con el check desactivado, candado y «Disponible el <día>»; atrasada con su chip; completar muestra «Próxima» o «última repetición»; desmarcar deja una sola pendiente; tareas sueltas sin cambios
- [x] T-012-40 (Green): cambios en `tasks-list.{ts,html,scss}`
- [x] T-012-41 (sustituida: la lista se revisa con capturas de Cypress en el Bloque 9, porque necesita datos): vista previa `/__dev/tasks/lista-repetidas`
- [x] T-012-42 (en el Bloque 9, con las capturas de Cypress): Medidas en el navegador de la lista (chip, futura, atrasada, aviso) y comparación lado a lado con `lista-series-y-decision/screen.png` (claro y oscuro, consola limpia)
- [x] T-012-43 (Refactor): limpiar con los tests en verde

---

## Bloque 6 — US-012-03 · Editar, posponer y borrar una repetitiva (P1)

- [x] T-012-44 (Red): `series-choice-sheet.spec.ts`: modos `edit` y `delete`, «Solo esta» / «Toda la serie» emiten su opción, «Cancelar»/«Volver atrás» y atrás de Android cierran, textos corregidos (sin «para hoy», sin «todas las futuras»), mensaje de historial conservado
- [x] T-012-45 (Green): `series-choice-sheet.{ts,html,scss}`
- [x] T-012-46 (Red): `task-form.spec.ts` · edición: regla igual y título/fecha/hora distintos → hoja; regla distinta (incluido «No se repite» o quitar la fecha) → serie entera sin preguntar; nada cambia → no hay hoja; borrar una ocurrencia abre la hoja y elige `removeOccurrence`/`removeSeries`; una tarea suelta se borra con su confirmación de siempre; errores con los textos actuales; se espera `close()` antes de navegar
- [x] T-012-47 (Green): cambios de guardado y borrado en `task-form.ts`/`.html`
- [x] T-012-48 (Red): `postpone-sheet.spec.ts`/`tasks.access.service.spec.ts`: posponer una ocurrencia mueve solo esa fila y no cambia la regla ni `series_date`; completarla después calcula la siguiente desde la fecha original
- [x] T-012-49 (Green): ajustes mínimos de posponer si el test lo exige
- [x] T-012-50 (sustituida: las hojas se revisan con capturas de Cypress en el Bloque 9): vistas previas `/__dev/tasks/editar-serie` y `/__dev/tasks/borrar-serie`
- [x] T-012-51 (en el Bloque 9, con las capturas de Cypress): Medidas en el navegador de las hojas de edición y de borrado y comparación lado a lado con `lista-series-y-decision/screen.png` (claro y oscuro, consola limpia)
- [x] T-012-52 (Refactor): limpiar con los tests en verde

---

## Bloque 7 — US-012-04 · Ver qué tareas se repiten (P2)

- [x] T-012-53 (Red): `recurrence.constructor.service.spec.ts` · `describe`: «Todos los días», «Cada 3 días», «Lun, jue», «Cada 2 semanas: vie», «El día 15 de cada mes», «hasta 30 jun»; el formulario de edición muestra la regla actual; el texto cabe sin desbordar en 390 px
- [x] T-012-54 (Green): `describe` completo y uso en lista y formulario
- [x] T-012-55 (Refactor): limpiar con los tests en verde

---

## Bloque 8 — US-012-05 y US-012-06 · Intervalos, día del mes y fin (P2)

- [x] T-012-56 (Red): `recurrence-sheet.spec.ts`: «Cada N días» y «Cada N semanas» con selector 1–30 (también con los siete días en semanas), «Un día del mes» 1–31 con el aviso de fin de mes, «Finalización» Nunca / El día…, error si la fecha de fin es anterior a la primera ocurrencia (el mismo día vale) y «Listo» desactivado; el resumen y la primera ocurrencia se actualizan
- [x] T-012-57 (Green): resto de frecuencias y finalización en `recurrence-sheet` y `recurrence.constructor.service.ts`
- [x] T-012-58 (Red): `tasks.access.service.spec.ts` · la última ocurrencia (por fecha de fin) no crea otra y el aviso lo refleja; cambio de regla con fin recoloca la pendiente
- [x] T-012-59 (Green): ajustes mínimos si el test lo exige
- [x] T-012-60: Medidas en el navegador de cada configuración y del error de fecha, y comparación lado a lado (claro y oscuro, consola limpia)
- [x] T-012-61 (Refactor): limpiar con los tests en verde

---

## Bloque 9 — Pruebas e2e, cierre y documentación

- [x] T-012-62 (Red): `cypress/e2e/repetitivas.cy.ts`: crear diaria y semanal (lo que se ve y lo que llega al servidor); completar → siguiente y aviso; futura desactivada; atrasada; desmarcar sin duplicar; editar «solo esta» / «toda la serie»; borrar «solo esta» / «toda la serie»; cada N, día del mes y fin; sin fecha; atrás de Android con las hojas
- [x] T-012-63 (Green): ajustes para que pasen
- [x] T-012-64: `cypress/e2e/cuenta.cy.ts`: el traspaso de una pendiente repetitiva conserva la repetición
- [x] T-012-65: `cypress/e2e/repetitivas-fidelidad.cy.ts`: medidas del diseño a 390 px (fila, hoja, chips, hojas de decisión), zonas táctiles ≥ 44 px y sin desbordes
- [x] T-012-66: `scripts/design-tokens.test.mjs` y `scripts/initial-bundle.test.mjs`: hojas y componentes nuevos con tokens y mixins; el paquete inicial y los presupuestos siguen en verde
- [x] T-012-67: documentación: `docs/supabase.md` (tabla, reglas, orden de despliegue), `CLAUDE.md` (sección de tareas repetitivas), `specs/README.md` (012 = Implementada)
- [x] T-012-68: comprobación en Android (emulador): crear, completar con aviso, alarma real de una ocurrencia con hora, atrás con las hojas, teclado y arranque en frío
- [x] T-012-69: `specs/012-tareas-repetitivas/review.md` con `/pr-review`

---

## Checklist de cierre

- [x] `pnpm lint:fix && pnpm format` sin errores
- [x] `pnpm secrets:check` sin hallazgos y revisión manual de `git diff --cached`
- [x] `pnpm test:ci` en verde, cobertura sin bajar (≥ 80 % en `TasksAccessService` y `core/utils/recurrence.ts`)
- [x] `pnpm test:scripts` y `pnpm e2e` en verde
- [x] `pnpm type-check` y `pnpm build` sin avisos
- [x] Todos los criterios P1 de `spec.md` verificados (US-012-01, 02, 03)
- [x] Criterios P2 verificados (US-012-04, 05, 06)
- [x] Migración aplicada al remoto con confirmación del usuario antes de ejecutar el cliente contra él
- [x] Revisión visual en navegador con la extensión de Chrome (390×844, claro y oscuro, estados, consola)
- [x] Comprobado en Android (emulador o dispositivo)
