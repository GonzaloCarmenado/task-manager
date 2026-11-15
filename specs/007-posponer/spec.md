# Spec 007 — Posponer tareas

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-14
**Estado**: Implementada
**Ciclo**: completo
**Frontal**: sí (hoja de opciones para posponer desde la lista y desde el formulario)

---

## Objetivo

Que el usuario pueda mover una tarea a otro momento con un par de toques, sin tener que editarla a mano.

---

## Contexto

- Depende de la **spec 005** (tareas con fecha y hora) y se apoya en la **006** (alarmas): al posponer, el aviso se reprograma. Si la 006 aún no está, posponer solo cambia la fecha y la hora.
- **Orden de implementación**: la 006 (alarmas) se implementa **antes** que esta. US-007-03 solo se verifica cuando existe el servicio de alarmas; si por algún motivo no estuviera, posponer solo cambia fecha y hora y esa historia queda pendiente.
- Hoy cambiar la fecha exige abrir el formulario y editar. Las tareas atrasadas se acumulan en «Atrasadas» sin una salida rápida.
- Posponer **no es completar ni borrar**: la tarea sigue pendiente y no suma nada (la gamificación de la spec 008 decide más adelante cómo cuenta; esta spec solo **registra cuántas veces** se pospone cada tarea).
- Los cambios van por el mismo `TasksAccessService` de la 005, con su plazo propio, caché por `userId` y cambios optimistas con reversión.

---

## Historias de usuario

### US-007-01 — Posponer con opciones rápidas (P1)

**Como** usuario, **quiero** posponer una tarea con una opción rápida, **para** reorganizarme sin esfuerzo.

**Criterios de aceptación:**
- Cada tarea pendiente tiene una acción **Posponer** accesible desde la lista (sin abrir el formulario) y desde el formulario de edición.
- La acción abre una hoja con las opciones: **Más tarde hoy** (+1 hora), **Mañana**, **La semana que viene** (el próximo lunes; si hoy es lunes, el siguiente) y **Elegir fecha**. Con Mañana y La semana que viene se conserva la hora de la tarea si la tiene.
- **Más tarde hoy** solo se ofrece a tareas con hora y con fecha de hoy o anterior: pone la hora una hora **desde ahora** (hora local, sin segundos) y, si pasa de medianoche, avanza un día; la etiqueta indica el resultado («hoy a las 17:30», «mañana a las 00:20»).
- Se ocultan las opciones cuya fecha no sea **posterior** a la actual de la tarea (una tarea de mañana no ofrece «Mañana»); si ninguna aplica, queda «Elegir fecha».
- Si la tarea tenía fecha, las opciones se calculan a partir de **hoy** (no de la fecha antigua): una tarea atrasada pospuesta a «Mañana» pasa a mañana, no a un día pasado.
- Si la tarea no tenía fecha, posponerla le pone fecha (con las mismas opciones).
- «Elegir fecha» usa el selector nativo del sistema y solo admite fechas **posteriores a la actual de la tarea**: el mínimo es hoy si la tarea está atrasada o sin fecha, y el día siguiente a su fecha si ya es de hoy o futura. Así nunca se «pospone» hacia atrás.
- Tras posponer, la tarea se mueve al grupo que corresponda de la lista de inmediato (optimista); si falla el guardado, vuelve a su sitio y se avisa.
- Se muestra un aviso breve («Tarea pospuesta a …») con la nueva fecha legible, **sin botón Deshacer**.
- Móvil: la hoja se alcanza con el pulgar, objetivos ≥ 44 px, y se cierra con el botón atrás de Android.

### US-007-02 — Cuántas veces se ha pospuesto (P2)

**Como** usuario, **quiero** que la app sepa cuánto pospongo una tarea, **para** que más adelante pueda ayudarme con ello.

**Criterios de aceptación:**
- Cada tarea guarda un contador de **veces pospuesta**, que sube en uno cada vez que una tarea que **ya tenía fecha** pasa a una fecha u hora posterior, y no baja al completar ni desmarcar. Ponerle fecha a una tarea sin fecha no cuenta.
- Editar la fecha a mano en el formulario **no** cuenta como posponer.
- El contador no se muestra todavía en pantalla ni afecta a nada (queda disponible para la spec 008).

### US-007-03 — El aviso sigue a la tarea (P1)

**Como** usuario, **quiero** que el aviso de una tarea pospuesta suene en la nueva hora, **para** no perder el recordatorio.

**Criterios de aceptación:**
- Con alarmas disponibles (spec 006), el aviso anterior se cancela y se programa el nuevo para la nueva fecha y hora, sin duplicados.
- Si la tarea pospuesta ya no tiene hora futura (por ejemplo, sin hora) no queda ningún aviso programado.

---

## Plan de tests (TDD)

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-007-01 …` cálculo de «+1 hora» (cruce de medianoche, solo con hora y fecha de hoy o anterior), «Mañana» y «La semana que viene» (también si hoy es lunes) desde hoy, atrasadas y sin fecha; opciones ocultas | CA 2 a 5 | `postpone.constructor.service.spec.ts` | unit |
| `US-007-01 …` fin de mes, de año y cambio de hora | CA 2 | `postpone.constructor.service.spec.ts` | unit |
| `US-007-01 …` «Elegir fecha» no admite fechas pasadas | CA 5 | `postpone-sheet.spec.ts` | unit |
| `US-007-01 …` la hoja abre desde la lista y el formulario y se cierra | CA 1, 8 | `postpone-sheet.spec.ts`, `tasks-list.spec.ts`, `task-form.spec.ts` | unit |
| `US-007-01 …` optimismo, reversión y aviso con la fecha | CA 6, 7 | `tasks.access.service.spec.ts`, `tasks-list.spec.ts` | unit |
| `US-007-02 …` el contador sube solo si la tarea ya tenía fecha y pasa a algo posterior; no sube al ponerle fecha a una sin fecha, ni al editar a mano, ni al completar o desmarcar | CA 1 a 3 | `tasks.access.service.spec.ts` | unit |
| `US-007-01 …` «Elegir fecha»: mínimo según la fecha actual de la tarea y la misma fecha no cambia nada | CA 5 | `postpone-sheet.spec.ts`, `postpone.constructor.service.spec.ts` | unit |
| `US-007-02 …` migración: columna con valor por defecto y sin datos de ejemplo | modelo | `scripts/postpone-migration.test.mjs` | script |
| `US-007-03 …` cancela y reprograma el aviso | CA 1, 2 | `alarms.access.service.spec.ts` | unit |

Si hay frontal: revisión visual en navegador (obligatoria) y en Android (selector de fecha y botón atrás); prueba real de RLS tras `db push`, con confirmación.

---

## Ficheros afectados

**Crear:**
- `src/app/features/tasks/postpone/` (hoja, textos y cálculo de fechas), *(por confirmar en `/sdd-plan`)*
- `scripts/postpone-migration.test.mjs`

**Modificar:**
- `src/app/core/models/task.ts` (contador `postponedCount`)
- `src/app/features/tasks/tasks.access.service.ts` (`postpone()`)
- `src/app/features/tasks/tasks-list/` y `task-form/` (acción Posponer)

**Supabase:**
- `supabase/migrations/<marca>_tasks_postponed_count.sql` (columna `postponed_count integer not null default 0` con `check (postponed_count >= 0)`; las políticas de la 005 ya cubren la fila)

---

## Modelo de datos

```typescript
export interface Task {
  // … campos de la spec 005
  readonly postponedCount: number; // veces pospuesta, ≥ 0
}
export type PostponeOption = 'later-today' | 'tomorrow' | 'next-week' | 'custom';
```

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any`, patrón de 3 servicios.
- Fechas en hora local (`YYYY-MM-DD` construido a mano); «próximo lunes» y «mañana» sin `toISOString()`.
- Cambios de esquema solo con migración versionada; `db push` previa verificación de cuenta por id y con confirmación.
- Mobile-first: targets ≥ 44 px, safe-areas, sin depender de hover; la hoja no usa `window.confirm`.
- Repo público: sin secretos ni datos privados.

---

## Out of scope

- Posponer desde la notificación y posponer por otros intervalos de minutos u horas (se decide en la spec de ajustes de alarmas).
- Sugerencias automáticas de cuándo posponer y avisos por posponer demasiado.
- Posponer varias tareas a la vez.
- XP, penalizaciones o rachas (spec 008).
