# Spec 012 — Tareas repetitivas

**Rama**: `interaction-logging-claude-md`
**Creada**: 2026-11-15
**Estado**: Aprobada (clarify cerrado)
**Ciclo**: simple
**Frontal**: sí

> `Ciclo: simple` por decisión del usuario (se descarta la revisión cruzada con DeepSeek). Sigue habiendo clarify, plan, tareas, TDD y revisión visual. `Frontal: sí`: tras el clarify hay que generar el prompt de Stitch.

---

## Objetivo

Que una persona pueda crear una tarea que se repite sola (todos los días, ciertos días de la semana, cada cierto intervalo o un día del mes) para no tener que volver a escribirla cada vez.

---

## Contexto

- Hoy cada tarea es única: `Task` (`core/models/task.ts`) tiene título, fecha y hora opcionales, `completedAt` y `postponedCount`. Una rutina («tomar la pastilla», «gimnasio los lunes y jueves») obliga a crear la tarea a mano cada día.
- Se modifican `TaskInput`/`Task`, el formulario de tarea (`features/tasks/task-form`), la lista (`tasks-list`), `TasksAccessService`/`TasksConstructorService`, las alarmas (`features/tasks/alarms`, spec 006), el posponer (spec 007) y el simulador e2e.
- Interacciones con otras specs:
  - **008 (XP)**: cada ocurrencia completada es una tarea completada y da su XP con las reglas actuales (10 XP, tope de 100 al día, racha). Una repetición no crea ningún XP extra por sí sola.
  - **006 (alarmas)**: una ocurrencia con hora avisa como cualquier tarea con hora.
  - **007 (posponer)**: posponer afecta a una sola ocurrencia.
  - **011 (cuenta)**: las series pertenecen al `user_id` y viajan con la cuenta; el traspaso de tareas del móvil al iniciar sesión debe conservar la repetición de las pendientes.
- Qué más conviene incluir («etc.»), propuesto aquí y a confirmar en `/clarify`:
  - **P1**: «todos los días» y «días concretos de la semana» (uno o varios), con la hora de la tarea si la tiene; completar una ocurrencia deja lista la siguiente; editar y borrar distinguiendo «solo esta» de «toda la serie».
  - **P2**: intervalos («cada N días», «cada N semanas») y «un día del mes» (con el caso de meses sin ese día); una fecha de fin opcional («hasta el…»); indicar en la lista que una tarea es repetitiva.
  - **P3** (fuera de esta spec, decidido en clarify): fin por número de repeticiones; saltar una ocurrencia sin completarla.

---

## Historias de usuario

### US-012-01 — Crear una tarea repetitiva (P1)

**Como** persona con rutinas, **quiero** elegir al crear o editar una tarea que se repita todos los días o en los días de la semana que yo marque, **para** no tener que crearla otra vez.

**Criterios de aceptación:**
- El formulario ofrece «No se repite» (por defecto), «Todos los días» y «Días de la semana», con selector de uno o varios días (lunes a domingo).
- Repetir exige fecha: sin fecha el selector queda desactivado y se explica por qué. La hora es opcional, como hoy.
- La primera ocurrencia es el día de la fecha elegida si coincide con la regla; si no, el primer día que cumple la regla desde esa fecha.
- «Días de la semana» sin ningún día marcado no se puede guardar y avisa.
- Al guardar, la tarea aparece en la lista en la fecha de su primera ocurrencia, igual que una tarea normal.
- Móvil: los días son botones con zona táctil ≥ 44 px, sin depender de hover; el teclado virtual no tapa el selector ni el botón de guardar.

### US-012-02 — Completar una ocurrencia y que aparezca la siguiente (P1)

**Como** persona con rutinas, **quiero** que al marcar una ocurrencia como hecha aparezca la siguiente en su día, **para** seguir con la rutina sin acordarme de recrearla.

**Criterios de aceptación:**
- Al completar una ocurrencia, esa tarea queda completada (con su XP, si procede) y se crea la siguiente ocurrencia con la misma hora, en el siguiente día que cumple la regla **posterior a la fecha de la ocurrencia completada y no anterior a hoy**.
- Si se completa una ocurrencia atrasada, la siguiente no se crea en el pasado: se crea en el próximo día válido desde hoy.
- Desmarcar una ocurrencia completada la deja pendiente de nuevo y **no duplica** la siguiente: sigue habiendo una sola ocurrencia pendiente por serie.
- Nunca hay más de una ocurrencia pendiente por serie.
- Sin conexión se aplican las mismas reglas que ya rigen para completar tareas (spec 005); no se crea ninguna ocurrencia duplicada al reintentar.
- Una ocurrencia con fecha posterior a hoy se ve en la lista pero **no se puede marcar como hecha** hasta que llega su día (decidido en clarify), así que no hay XP por adelantar días.
- Móvil: el gesto de completar es el actual (check de 28 px con zona táctil ≥ 44 px).

### US-012-03 — Editar, posponer y borrar una repetitiva (P1)

**Como** persona con rutinas, **quiero** poder cambiar o quitar solo la ocurrencia de hoy o toda la serie, **para** no romper mi rutina por un cambio puntual.

**Criterios de aceptación:**
- Al editar una tarea repetitiva se pregunta: «Solo esta» o «Toda la serie».
  - «Solo esta»: cambia título/fecha/hora de esa ocurrencia y la regla no cambia.
  - «Toda la serie»: cambia título, hora y regla; la ocurrencia pendiente se recoloca en el primer día válido desde hoy.
- Al borrar se pregunta lo mismo. «Solo esta» elimina la ocurrencia y crea la siguiente; «Toda la serie» elimina la ocurrencia pendiente y la serie deja de repetirse (las ya completadas se conservan).
- Posponer (spec 007) mueve solo esa ocurrencia; la regla no cambia, y al completarla la siguiente se calcula con la regla desde la fecha original.
- Una tarea no repetitiva se edita y se borra exactamente como hasta ahora (sin pregunta).
- Móvil: la elección «Solo esta / Toda la serie» es una hoja inferior con cierre por el botón atrás de Android (`OverlayBack`).

### US-012-04 — Ver qué tareas se repiten (P2)

**Como** persona con rutinas, **quiero** distinguir en la lista las tareas repetitivas y ver cada cuánto se repiten, **para** saber cuáles son rutinas.

**Criterios de aceptación:**
- Las tareas repetitivas muestran un icono de repetición y un texto corto («Todos los días», «Lun, jue», «Cada 2 semanas», «El día 15 de cada mes»).
- El formulario de edición muestra la regla actual.
- El icono y el texto no dependen solo del color (accesibles) y caben en 390 px sin desbordar.

### US-012-05 — Intervalos y día del mes (P2)

**Como** persona con rutinas, **quiero** repetir cada N días, cada N semanas o un día fijo del mes, **para** cubrir rutinas que no son diarias.

**Criterios de aceptación:**
- «Cada N días» y «Cada N semanas» con N de 1 a 30.
- «Cada N semanas» admite días concretos de la semana (por ejemplo, cada 2 semanas el viernes).
- «Día del mes»: del 1 al 31. En un mes sin ese día (p. ej., el 31 en abril) la ocurrencia cae en el **último día de ese mes**.
- El cálculo usa siempre la fecha local (nunca `toISOString()`), sin desfases de zona horaria ni de cambio de hora.

### US-012-06 — Fin de la repetición (P2)

**Como** persona con rutinas, **quiero** indicar hasta cuándo se repite, **para** que una rutina temporal acabe sola.

**Criterios de aceptación:**
- Opción «Hasta…» con una fecha; no puede ser anterior a la primera ocurrencia (se avisa).
- Al completar la última ocurrencia (o cuando la siguiente caería después de la fecha de fin) no se crea otra y la serie queda finalizada.
- Por defecto la repetición no termina nunca.

### US-012-07 — Saltar una ocurrencia y fin por número de veces (P3) — FUERA DE ALCANCE (resuelto en clarify)

**Como** persona con rutinas, **quiero** saltar la ocurrencia de hoy sin completarla y limitar la serie a un número de repeticiones, **para** gestionar días en que no toca y rutinas con un número cerrado de veces.

**Criterios de aceptación:**
- «Saltar» elimina la ocurrencia pendiente sin XP y crea la siguiente.
- «Terminar tras N veces» (N de 2 a 365) cuenta ocurrencias completadas.

---

## Plan de tests (TDD)

Cada criterio tiene al menos un test. El orden es el orden Red → Green.

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-012-01 … regla diaria y semanal válidas` | CA 1, 3, 4 de US-012-01 | `src/app/features/tasks/recurrence/recurrence.spec.ts` (por confirmar en /sdd-plan) | unit |
| `US-012-01 … repetir exige fecha` | CA 2 de US-012-01 | `src/app/features/tasks/task-form/task-form.spec.ts` | unit |
| `US-012-01 … crea la serie` | CA 5 de US-012-01 | `src/app/features/tasks/tasks.access.service.spec.ts` | unit |
| `US-012-02 … completar crea la siguiente` | CA 1, 4 de US-012-02 | `src/app/features/tasks/tasks.access.service.spec.ts` | unit |
| `US-012-02 … atrasada no crea en el pasado` | CA 2 de US-012-02 | `src/app/features/tasks/recurrence/recurrence.spec.ts` | unit |
| `US-012-02 … desmarcar no duplica` | CA 3 de US-012-02 | `src/app/features/tasks/tasks.access.service.spec.ts` | unit |
| `US-012-02 … reintento sin duplicar` | CA 5 de US-012-02 | `src/app/features/tasks/tasks.access.service.spec.ts` | unit |
| `US-012-03 … editar solo esta / serie` | CA 1 de US-012-03 | `src/app/features/tasks/tasks.access.service.spec.ts` | unit |
| `US-012-03 … borrar solo esta / serie` | CA 2 de US-012-03 | `src/app/features/tasks/tasks.access.service.spec.ts` | unit |
| `US-012-03 … posponer no cambia la regla` | CA 3 de US-012-03 | `src/app/features/tasks/postpone/` (spec existente) | unit |
| `US-012-03 … sin pregunta si no repite` | CA 4 de US-012-03 | `src/app/features/tasks/tasks-list/tasks-list.spec.ts` | unit |
| `US-012-03 … hoja y botón atrás` | CA 5 de US-012-03 | `src/app/features/tasks/tasks-list/tasks-list.spec.ts` | unit |
| `US-012-04 … icono y texto de repetición` | CA 1–3 de US-012-04 | `src/app/features/tasks/tasks.constructor.service.spec.ts` | unit |
| `US-012-05 … cada N y fin de mes` | CA 1–4 de US-012-05 | `src/app/features/tasks/recurrence/recurrence.spec.ts` | unit |
| `US-012-06 … hasta fecha` | CA 1–3 de US-012-06 | `src/app/features/tasks/recurrence/recurrence.spec.ts` | unit |
| Flujos completos (crear, completar, editar/borrar serie, atrasada) | US-012-01…03 | `cypress/e2e/repetitivas.cy.ts` | e2e |
| Migración (columnas, RLS, restricciones) | modelo de datos | `scripts/recurrence-migration.test.mjs` | script |
| Traspaso conserva la repetición | contexto (011) | `src/app/features/account/account.access.service.spec.ts` | unit |

Revisión visual en navegador con la extensión de Chrome (obligatoria, 390×844, claro y oscuro) y comprobación en Android (emulador) con alarma real de una ocurrencia.

---

## Ficheros afectados

(Por confirmar en `/sdd-plan`.)

**Crear:**
- `src/app/core/models/recurrence.ts` (regla, tipos y límites)
- `src/app/features/tasks/recurrence/` (cálculo de la siguiente ocurrencia, puro y sin dependencias; selector de repetición del formulario; hoja «Solo esta / Toda la serie»)
- `cypress/e2e/repetitivas.cy.ts`
- `scripts/recurrence-migration.test.mjs`

**Modificar:**
- `src/app/core/models/task.ts`
- `src/app/features/tasks/tasks.access.service.ts`, `tasks.constructor.service.ts`
- `src/app/features/tasks/task-form/`, `tasks-list/`, `alarms/`, `postpone/`
- `src/app/features/account/account.access.service.ts` (traspaso)
- `cypress/support/backend.ts` (simulador)
- `docs/supabase.md`, `CLAUDE.md`, `specs/README.md`

**Supabase:**
- `supabase/migrations/YYYYMMDDHHMMSS_task_recurrence.sql` (con RLS y rollback)

**Tauri / Android:** sin cambios previstos (las alarmas ya reciben el conjunto completo de avisos).

---

## Modelo de datos

Propuesta a validar en `/sdd-plan` (el modelo exacto —regla en la propia fila de `tasks` o tabla `task_series`— se decide allí):

```typescript
export type RecurrenceKind = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  readonly kind: RecurrenceKind;
  /** Cada N días/semanas/meses; 1 por defecto. */
  readonly interval: number;
  /** 1 = lunes … 7 = domingo; solo con `weekly`. */
  readonly weekdays: readonly number[];
  /** 1 a 31; solo con `monthly`. */
  readonly monthDay: number | null;
  /** Último día local `YYYY-MM-DD` en que puede haber ocurrencia; `null` = sin fin. */
  readonly until: string | null;
  /** Total de ocurrencias completadas tras las que termina; `null` = sin límite. */
  readonly maxCount: number | null;
}
```

- Toda tabla nueva lleva `user_id` y RLS con `auth.uid()` en la misma migración; las columnas nuevas de `tasks` no cambian su RLS.
- Una restricción en base de datos impide reglas incoherentes (semanal sin días, `monthDay` fuera de 1–31, repetición sin fecha).
- Las ocurrencias completadas se conservan como tareas normales (historial y XP intactos).

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any`.
- Sin Angular Material: UI con componentes propios de `shared/components` y mixins/tokens de la spec 010 (sin tamaños, colores ni sombras sueltos).
- Mobile-first: targets ≥ 44 px, safe-areas, sin depender de hover.
- Acceso a datos solo desde `TasksAccessService`; el cálculo de ocurrencias es una función pura y testeable.
- Fechas siempre en hora local (`getFullYear/getMonth/getDate`), nunca `toISOString()`.
- Repo público: sin secretos ni datos privados; `pnpm secrets:check` en verde.
- Cambios de esquema solo con migración versionada, aplicada al remoto (`db:push`, con confirmación y verificando la cuenta de la CLI) **antes** de ejecutar el cliente contra el remoto.
- Todo cambio de comportamiento visible añade o actualiza su prueba e2e.
- Las ocurrencias se **materializan una a una** (una tarea pendiente por serie), de modo que alarmas, lista, XP y RLS siguen funcionando sin cambios. No se generan ocurrencias futuras por adelantado.

---

## Out of scope

- Calendario o vista mensual con todas las ocurrencias futuras.
- Recordatorios distintos por ocurrencia, subtareas o plantillas.
- «Repetir tras completar» (cada N días desde que se completó, en lugar de desde la fecha prevista), salvo que el clarify lo pida.
- Excepciones por fecha concreta dentro de una serie (solo «saltar» en P3).
- Zonas horarias múltiples o viaje entre zonas.
- Estadísticas de cumplimiento por serie y logros por rachas de una rutina.
- Compartir tareas con otras personas.
