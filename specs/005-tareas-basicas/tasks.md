# Tasks 005 — Tareas básicas

**Plan**: [plan.md](./plan.md)
**Estado**: Completadas (excepto el commit)
**Fecha**: 2026-11-13

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que Stitch añada y no esté en la spec se ignora (ver `design/README.md`).

---

## Bloque 1 — Migración y modelo (US-005-05)

- [x] T-005-01 (Red): `scripts/tasks-migration.test.mjs`: la migración activa RLS, define `user_id` con `auth.uid()`, las 4 políticas, longitud y recorte del título, hora solo con fecha, `revoke` a `anon` y ninguna sentencia `insert` de ejemplo
- [x] T-005-02 (Green): `supabase/migrations/<marca>_tasks.sql` (`pnpm db:new tasks`) con tabla, restricciones, índices, RLS y rollback comentado
- [x] T-005-03: `docs/supabase.md`: sección de la tabla `tasks` y sus políticas
- [x] T-005-04: `core/models/task.ts` (`Task`, `TaskInput`, `TaskRow`, constantes) *(solo tipos; lo cubren los tests de los servicios)*

---

## Bloque 2 — Fechas y reloj (US-005-02 CA 3)

- [x] T-005-05 (Red): `core/utils/local-date.spec.ts`: `toLocalDay` cerca de medianoche, en cambio de mes y de año; `addDays`; `parseLocalDay`; `formatTime` (`HH:MM:SS` → `HH:MM`)
- [x] T-005-06 (Green): `core/utils/local-date.ts` y `core/services/clock.ts` (`CLOCK`)
- [x] T-005-07 (Refactor): limpiar con los tests en verde

---

## Bloque 3 — `TasksConstructorService` (US-005-02)

- [x] T-005-08 (Red): `tasks.constructor.service.spec.ts`: grupos Atrasadas, Hoy, Mañana, fechas posteriores y Sin fecha en su orden; grupos vacíos omitidos; hoy y mañana con reloj simulado (también 23:59 y 00:01 y fin de mes)
- [x] T-005-09 (Green): agrupado en `tasks.constructor.service.ts`
- [x] T-005-10 (Red): orden dentro del día (con hora ascendente y luego sin hora por creación), completadas por fecha de completado descendente, etiquetas legibles de fecha, «Atrasada» solo con fecha anterior a hoy
- [x] T-005-11 (Green): orden y etiquetas
- [x] T-005-12 (Red): textos estáticos en español, sin XP, rachas, niveles ni términos técnicos
- [x] T-005-13 (Green): textos del servicio
- [x] T-005-14 (Refactor): limpiar con los tests en verde

---

## Bloque 4 — `TasksAccessService` (US-005-01, 02, 03, 04, 05)

- [x] T-005-15 (Red): cargar: consulta de pendientes y completadas de los últimos 30 días, mapeo de `HH:MM:SS` a `HH:MM`, estados `loading`, `ready` y `error`, y `loading` solo sin datos previos (`tasks.access.service.spec.ts`, con el cliente simulado)
- [x] T-005-16 (Green): `load()` y estado
- [x] T-005-17 (Red): plazo de 8 s (reloj simulado) → error `network`; nunca se escribe en consola; los errores del servidor no se propagan como texto
- [x] T-005-18 (Green): plazo con `AbortSignal` y clasificación `network` / `unknown`
- [x] T-005-19 (Red): caché por `userId`: otro usuario no ve datos ajenos, cambio de usuario recarga; las tareas siguen al reabrir (carga inicial)
- [x] T-005-20 (Green): `Map<userId, Task[]>` y recarga al cambiar de usuario
- [x] T-005-21 (Red): crear: recorta el título, hora a `null` sin fecha, duplicados permitidos, aparece en la lista; si falla, no cambia el estado
- [x] T-005-22 (Green): `create()`
- [x] T-005-23 (Red): completar y desmarcar optimistas con `completed_at`, y reversión si falla
- [x] T-005-24 (Green): `setCompleted()`
- [x] T-005-25 (Red): editar (incluido quitar la fecha y con ella la hora) y borrar con reversión si falla
- [x] T-005-26 (Green): `update()` y `remove()`
- [x] T-005-27 (Refactor): limpiar; cobertura ≥ 80 % del servicio

---

## Bloque 5 — Iconos (US-005-02, 03)

- [x] T-005-28 (Red): iconos nuevos (`plus`, `check`, `chevron-down`, `chevron-right`, `trash`, `calendar`) pintan SVG con contenido y son decorativos por defecto (`icon.spec.ts`)
- [x] T-005-29 (Green): añadir los SVG propios

---

## Bloque 6 — `TasksList` (US-005-02, 03)

- [x] T-005-30 (Red): `tasks-list.spec.ts`: carga (solo sin datos previos), vacío con «Crear primera tarea», error con Reintentar, grupos con contador, hora en cada tarea, etiqueta «Atrasada»
- [x] T-005-31 (Green): `tasks-list.{ts,html,scss}` con los estados
- [x] T-005-32 (Red): completar y desmarcar, aviso breve «Tarea completada», aviso de error con reversión, plegar y desplegar Completadas, Completadas sin recientes
- [x] T-005-33 (Green): acciones, avisos y sección Completadas
- [x] T-005-34 (Red): navegación (tocar tarea → `/:id`, «Nueva tarea» → `/nueva`), accesibilidad (nombre accesible del control, roles, área táctil ≥ 44 px), ningún elemento de prototipo (simulador, avatar, saludo, barra inferior), `OnPush`
- [x] T-005-35 (Green): navegación y accesibilidad; recalcular «hoy» al volver a primer plano
- [x] T-005-36 (Refactor): limpiar con los tests en verde

---

## Bloque 7 — `TaskForm` (US-005-01, 04)

- [x] T-005-37 (Red): `task-form.spec.ts`: título obligatorio, recorte, 120 y 121 caracteres, contador `n / 120`, Guardar deshabilitado con el motivo explicado
- [x] T-005-38 (Green): `task-form.{ts,html,scss}` con título y validación
- [x] T-005-39 (Red): fecha por defecto hoy, Hoy, Mañana, Elegir fecha, Quitar fecha; hora solo con fecha y se quita al quitar la fecha
- [x] T-005-40 (Green): fecha y hora
- [x] T-005-41 (Red): guardar (crear y editar) cierra y vuelve a la lista; si falla, el texto se conserva y se avisa; tarea inexistente vuelve a la lista
- [x] T-005-42 (Green): guardar y errores
- [x] T-005-43 (Red): borrar solo en modo editar, confirmación dentro de la pantalla («no se puede deshacer»), cancelar no borra, error con aviso; cerrar sin guardar; accesibilidad y `OnPush`
- [x] T-005-44 (Green): borrado con confirmación
- [x] T-005-45 (Refactor): limpiar con los tests en verde

---

## Bloque 8 — Rutas e integración

- [x] T-005-46 (Red): `app.routes.spec.ts`: `''` carga `TasksList`, `nueva` y `:id` cargan `TaskForm`, todas lazy; el test US-001-01 pasa a comprobar la lista
- [x] T-005-47 (Green): `app.routes.ts` y retirada de `features/home` (con su spec)
- [x] T-005-48: comprobar que `App` (spec 003/004) sigue en verde con la nueva ruta principal

---

## Bloque 9 — Base de datos remota *(efecto en el remoto: requiere confirmación del usuario)*

- [x] T-005-49: verificar la cuenta de Supabase (organización por **id**, `supabase orgs list`) antes de cualquier comando remoto; si no coincide, parar
- [x] T-005-50: `pnpm db:push:dry` y revisar la migración que se aplicaría
- [x] T-005-51: `pnpm db:push` — **requiere confirmación del usuario**
- [x] T-005-52: prueba real de RLS con dos sesiones anónimas distintas (una no ve ni toca las tareas de la otra) y borrar los datos de prueba; sin dejar credenciales en el repo

---

## Bloque 10 — Verificación y cierre

- [x] T-005-53: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` en verde
- [x] T-005-54: revisión visual en navegador con la extensión de Chrome (viewport móvil; claro y oscuro; lista con grupos y atrasadas, carga, vacío, error, formulario con validación, teclado y confirmación de borrado; área táctil ≥ 44 px, sin scroll horizontal, consola limpia)
- [x] T-005-55: comprobar en el emulador Android: selectores nativos de fecha y hora, teclado virtual sin tapar Guardar, safe-areas, completar y borrar, volver con el botón atrás, y tareas persistentes al reabrir
- [x] T-005-56: documentar lo comprobado, marcar la spec como Implementada, actualizar `specs/README.md` y el log

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar (≥ 80 % en `TasksAccessService`)
- [ ] Todos los criterios P1 de `spec.md` verificados (US-005-01, 02, 03 y 05)
- [ ] Revisión visual en navegador con la extensión de Chrome
- [ ] Comprobado en el emulador Android
- [ ] RLS comprobada contra el remoto con dos sesiones
- [ ] Confirmación del usuario antes de `db push`, de cada commit y de cada push
