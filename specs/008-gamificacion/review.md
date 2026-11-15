# Revisión cruzada (DeepSeek) — spec 008

**Fecha**: 2026-11-14 · Una pasada tras cerrar el clarify.

El revisor lee lo versionado en HEAD: no veía las specs 006 y 007 ni el diseño de la 008 (aún sin versionar), lo que explica dos hallazgos.

| # | Hallazgo | Gravedad | Valoración |
|---|---|---|---|
| 1 | La racha exige el día local guardado en la tarea, pero no hay columna ni migración que lo guarde | alta | **Válido**: la spec añade las columnas `completed_day`, `xp_awarded` y `xp_day` en `tasks` y las lista en la migración; el cliente envía el día local |
| 2 | El cálculo vive en la base de datos, pero los tests lo asignan a servicios del cliente | media | **Válido**: los criterios de XP, tope y racha pasan a tests de script (SQL estático) y a `verify-progress.mjs` (prueba real); el cliente solo prueba lo suyo (día local, plazos, reversión) |
| 3 | La spec se apoya en la 007, que «no existe» | media | **Falso en el repo** (existe, sin versionar), **válido como orden**: se fija 006 → 007 → 008 y cuándo se comprueba «posponer no da XP» |
| 4 | El aviso «−10 XP» es incorrecto si la tarea se completó con tope (0 XP) | baja | **Válido**: la spec dice que el aviso indica los XP realmente quitados (0 → ninguno). El `clarify.md` (cerrado, no se reedita) habla de «−10 XP»; manda la spec |
| 5 | El ejemplo «340 / 500 XP» del clarify no está en el repositorio | baja | **Falso**: está en el diseño recibido (`design/`, aún sin versionar) |

---

# Implementación (estado al cerrar el cliente)

| Comprobación | Resultado |
|---|---|
| Tests de la app, de scripts y `secrets:check` | En verde |
| Resumen (normal, racha viva y usuario nuevo), pantalla de progreso, celebración, subida de nivel y estado de error en navegador (390 px): objetivos ≥ 44 px, sin scroll horizontal | OK |
| Tema oscuro; la lista con datos reales; completar y desmarcar de verdad | **NO VERIFICADO** (necesitan la migración aplicada y el emulador) |
| `db push` de `progress`, `verify:progress` y `verify:rls` | **PENDIENTE**: la CLI de Supabase no estaba en la cuenta del propietario y el inicio de sesión lo hace el usuario |
| Android: completar, desmarcar, tope, subir de nivel, racha entre días | **NO VERIFICADO** |

**Orden obligatorio**: las migraciones de la 007 y la 008 se aplican **antes** de ejecutar el cliente contra el remoto. El plan decía «cliente primero», pero mientras la migración no esté, el cliente nuevo falla contra el remoto (envía `completed_day` y exige `postponed_count`).

**Decisiones de implementación no previstas en el plan**: (1) la migración rellena `completed_day` de las tareas ya completadas (en UTC) antes de añadir la restricción, para que no falle con datos existentes; (2) el disparador de inserción pone a `null` `completed_at` y `completed_day`, para que no se pueda crear una tarea ya completada con XP; (3) los usuarios anónimos de prueba de `verify:progress` no se pueden borrar desde el cliente: solo se borran sus tareas.

---

# Verificación en remoto y en emulador (2026-11-14)

| Comprobación | Resultado |
|---|---|
| Migraciones `progress` y `progress_best_streak` aplicadas | HECHO |
| `verify:progress` | 27/27 OK (detectó que la mejor racha ignoraba los días posteriores al completado; corregido con `streak_run`) |
| `verify:rls` | 16/16 OK |
| Emulador: completar (+10 XP, «Llevas 1 día»), desmarcar (0 XP, sin racha), subida a nivel 2 con 50 XP, Continuar, pantalla de progreso, atrás, persistencia al reabrir | OK |
| Emulador: tema oscuro (lista, progreso y hoja de posponer) | OK |
| Racha entre días y tope de 100 XP en el emulador | No repetido: cubiertos por `verify:progress` y por las e2e |

Hallazgo: la celebración se solapaba con el aviso «Tarea completada»; se sube su posición.
