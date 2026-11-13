# Spec 005 — Tareas básicas

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-13
**Estado**: Implementada
**Ciclo**: completo
**Frontal**: sí (lista de tareas, formulario de crear y editar, estados vacío, carga y error)

---

## Objetivo

Que el usuario pueda crear, ver, editar, completar y borrar sus tareas, planificadas por fecha, guardadas en su espacio de Supabase.

---

## Contexto

- Es el núcleo del producto (gestor de tareas gamificado para usuarios no profesionales). Hoy la app solo tiene la pantalla «Hola» (`features/home`), la sesión anónima (spec 003) y el bloqueo con huella (spec 004).
- Depende de la **spec 003**: cada tarea pertenece a un `userId` anónimo. `ready` significa que hay identidad, **no** que haya red ni token vigente: la capa de datos aplica sus propios plazos, trata los 401 y el modo sin red, e **indexa sus cachés por `userId()`**.
- Depende de la **spec 002**: el esquema solo cambia con migraciones versionadas y **toda tabla de datos de usuario lleva `user_id` y RLS con `auth.uid()` en la misma migración**.
- Esta spec solo cubre lo básico. **Fuera**: alarmas, posponer, XP, rachas, niveles y repetición de tareas (specs posteriores). Se deja el modelo preparado (fecha de completado) sin construir nada de eso.
- Diseño: los de Stitch (flujo con prompt) se piden tras el clarify, siguiendo la regla de que la spec manda y el diseño es solo referencia.

---

## Historias de usuario

### US-005-01 — Crear una tarea (P1)

**Como** usuario, **quiero** apuntar una tarea con su título y, si quiero, una fecha, **para** no olvidarla.

**Criterios de aceptación:**
- Hay una acción visible para crear tarea (alcanzable con el pulgar) que abre un formulario con **título** (obligatorio), **fecha** (opcional) y **hora** (opcional, solo si hay fecha; al quitar la fecha se quita la hora).
- El título se recorta de espacios y no puede quedar vacío ni pasar de 120 caracteres; si no es válido, el botón de guardar queda deshabilitado y se explica el motivo.
- Sin fecha, la tarea se guarda como «sin fecha» y sin hora. La fecha por defecto del formulario es **hoy** (hora local).
- Al guardar aparece en la lista sin recargar, en el grupo de su fecha, y el formulario se cierra.
- Si falla el guardado (sin red, error del servicio), se muestra un mensaje y **el texto escrito se conserva** para reintentar.
- Móvil: el teclado virtual no tapa el campo ni el botón de guardar; objetivos táctiles ≥ 44 px; safe-areas respetadas.

### US-005-02 — Ver mis tareas por fecha (P1)

**Como** usuario, **quiero** ver mis tareas ordenadas por día, **para** saber qué toca hoy y qué viene después.

**Criterios de aceptación:**
- La lista agrupa por fecha en este orden: **Atrasadas** (fecha anterior a hoy y sin completar), **Hoy**, **Mañana**, **fechas posteriores** (cada día con su fecha legible) y **Sin fecha**. Los grupos vacíos no se muestran.
- Dentro de un día: primero las que tienen hora (de más temprana a más tardía), luego las que no tienen (por orden de creación). La hora no afecta a «Atrasadas».
- Las tareas **completadas en los últimos 30 días** se muestran aparte, en una sección «Completadas» plegada por defecto, de la más reciente a la más antigua.
- «Hoy» y «Mañana» se calculan con la **fecha local** del móvil, nunca con UTC.
- Estados: **carga** (indicador, sin parpadeos al volver), **vacío** (mensaje amistoso que invita a crear la primera tarea) y **error** (mensaje claro con botón de reintentar).
- Solo se muestran las tareas del usuario actual (RLS) y los datos en memoria se indexan por `userId`.
- Móvil: scroll fluido, sin scroll horizontal, tema claro y oscuro.

### US-005-03 — Completar una tarea (P1)

**Como** usuario, **quiero** marcar una tarea como hecha con un toque, **para** sentir que avanzo.

**Criterios de aceptación:**
- Cada tarea tiene un control de completar con área táctil ≥ 44 px; al tocarlo pasa a completada de inmediato (actualización optimista) y se mueve a «Completadas».
- Se guarda la fecha y hora de completado.
- Se puede **desmarcar** una tarea completada (vuelve a su grupo).
- Si falla el guardado, la tarea vuelve a su estado anterior y se avisa del fallo.
- Sin celebraciones, XP ni rachas (spec posterior): solo el cambio de estado.

### US-005-04 — Editar y borrar una tarea (P2)

**Como** usuario, **quiero** corregir una tarea o eliminarla, **para** mantener mi lista al día.

**Criterios de aceptación:**
- Tocar una tarea abre el mismo formulario con sus datos; se puede cambiar título y fecha (incluido quitarla).
- Desde el formulario se puede **borrar** la tarea, con una confirmación explícita antes de eliminarla; el borrado es definitivo.
- Cambios y borrado se reflejan en la lista sin recargar; si fallan, se conserva el estado anterior y se avisa.

### US-005-05 — Datos privados y persistentes (P1)

**Como** usuario, **quiero** que mis tareas sean solo mías y sigan ahí al volver, **para** poder confiar en la app.

**Criterios de aceptación:**
- La tabla de tareas tiene `user_id` y RLS: un usuario solo puede leer, crear, editar y borrar sus tareas, y no puede crearlas a nombre de otro.
- Al cerrar y abrir la app, las tareas siguen ahí.
- Con la sesión sin red (spec 003) la app abre; la lista muestra el estado de error o los datos ya cargados en esta apertura, **sin quedarse cargando indefinidamente** (plazo propio de la capa de datos).
- Los errores del servicio no se escriben en consola con datos del usuario.

---

## Plan de tests (TDD)

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-005-01 …` valida título (vacío, solo espacios, >120) y recorta | CA 2 | `tasks.access.service.spec.ts` / `task-form.spec.ts` | unit |
| `US-005-01 …` crear con y sin fecha; fecha por defecto hoy local | CA 1, 3 | `task-form.spec.ts`, `tasks.access.service.spec.ts` | unit |
| `US-005-01 …` al guardar aparece en la lista; si falla conserva el texto | CA 4, 5 | `tasks-list.spec.ts` | unit |
| `US-005-02 …` agrupa en Atrasadas, Hoy, Mañana, fechas y Sin fecha; omite vacíos | CA 1 | `tasks.constructor.service.spec.ts` | unit |
| `US-005-02 …` hoy y mañana con fecha local (también cerca de medianoche y en cambio de mes) | CA 3 | `tasks.constructor.service.spec.ts` | unit |
| `US-005-02 …` carga, vacío y error con reintento | CA 4 | `tasks-list.spec.ts` | unit |
| `US-005-02 …` datos indexados por `userId` | CA 5 | `tasks.access.service.spec.ts` | unit |
| `US-005-03 …` completa de forma optimista, desmarca y revierte si falla | CA 1 a 4 | `tasks-list.spec.ts` | unit |
| `US-005-04 …` editar, quitar fecha y borrar con confirmación | CA 1 a 3 | `task-form.spec.ts` | unit |
| `US-005-05 …` migración: RLS y `user_id` presentes, sin datos de ejemplo | CA 1 | `scripts/tasks-migration.test.mjs` | script |
| `US-005-05 …` plazo de la capa de datos sin red | CA 3 | `tasks.access.service.spec.ts` | unit |
| `US-005-05 …` las tareas guardadas se recuperan al abrir de nuevo (carga inicial por `userId`) | CA 2 | `tasks.access.service.spec.ts` | unit |
| `US-005-05 …` ningún error del servicio se escribe en consola | CA 4 | `tasks.access.service.spec.ts` | unit |
| `US-005-01 …` la hora solo se admite con fecha y se quita al quitar la fecha | CA 1 | `task-form.spec.ts` | unit |
| `US-005-02 …` orden dentro del día: con hora ascendente, luego sin hora por creación | CA 2 | `tasks.constructor.service.spec.ts` | unit |
| `US-005-02 …` solo se cargan las completadas de los últimos 30 días | CA 2 | `tasks.access.service.spec.ts` | unit |
| `US-005-01 …` se permiten títulos repetidos | CA 2 | `tasks.access.service.spec.ts` | unit |

Si hay frontal: revisión visual en navegador con la extensión de Chrome (obligatoria; claro y oscuro; vacío, carga, error) y comprobación en Android. Además, prueba real de RLS contra el proyecto remoto tras `db push` (con dos sesiones anónimas distintas), solo con confirmación del usuario.

---

## Ficheros afectados

**Crear:**
- `src/app/core/models/task.ts`
- `src/app/features/tasks/` (lista, formulario y servicios de textos y acceso, patrón de 3 servicios) *(por confirmar en `/sdd-plan`)*
- `scripts/tasks-migration.test.mjs`

**Modificar:**
- `src/app/app.routes.ts` (ruta principal pasa a la lista; `features/home` se retira o sustituye)
- `docs/supabase.md`

**Supabase:**
- `supabase/migrations/<marca de tiempo>_tasks.sql` (con RLS y `user_id`)

---

## Modelo de datos

```typescript
export interface Task {
  readonly id: string;
  readonly title: string;            // 1–120 caracteres, sin espacios en los extremos
  readonly dueDate: string | null;   // 'YYYY-MM-DD' en hora local; null = sin fecha
  readonly dueTime: string | null;   // 'HH:MM' en hora local; solo con fecha
  readonly completedAt: string | null; // instante ISO; null = pendiente
  readonly createdAt: string;
}
```

Tabla `tasks`: `id uuid`, `user_id uuid` (por defecto `auth.uid()`), `title`, `due_date date`, `due_time time` (solo con fecha), `completed_at timestamptz`, `created_at timestamptz`. RLS con `auth.uid() = user_id` para las cuatro operaciones y comprobación de longitud del título.

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any`; lazy loading.
- Sin Angular Material: UI con componentes propios de `shared/components`.
- Mobile-first: targets ≥ 44 px, safe-areas, teclado virtual, sin depender de hover.
- Acceso a datos solo desde el `access.service`; solo `AuthAccessService` toca `supabase.auth`.
- Fechas siempre en hora local (`YYYY-MM-DD` construido a mano, nunca `toISOString()` para el día).
- Repo público: sin secretos ni datos privados en código, specs ni docs; `pnpm secrets:check` en verde.
- Cambios de esquema solo con migración versionada y RLS por usuario; `db push` contra el remoto solo tras verificar la cuenta de Supabase y con confirmación.

---

## Out of scope

- Alarmas y notificaciones (la hora se guarda pero no dispara nada), posponer, repetición, subtareas, etiquetas, prioridades, búsqueda y orden manual.
- XP, rachas, niveles, misiones y celebraciones.
- Trabajo sin red con cola de cambios (solo se tratan el error y el plazo).
- Compartir tareas y cuentas de usuario (spec de vincular cuenta).
