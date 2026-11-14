# Revisión — spec 005 (Tareas básicas)

**Fecha**: 2026-11-14 · Commit revisado: `f045a53` (ya en `main`) + correcciones de esta revisión.
**Resultado**: **CORRECTO** (con dos mejoras menores aplicadas durante la revisión).

> La rama se empujó directamente a `main` por decisión del usuario, así que no hay PR que abrir; esta revisión cierra la spec.

---

## 1. Coherencia documental

| Check | Resultado |
|---|---|
| Todas las tareas de `tasks.md` marcadas `[x]` (56) | OK (0 sin marcar) |
| Criterios P1 con tarea y test | OK: US-005-01 (`task-form.spec.ts`, `tasks.access.service.spec.ts`), US-005-02 (`tasks.constructor.service.spec.ts`, `tasks-list.spec.ts`), US-005-03 (`tasks-list.spec.ts`, `tasks.access.service.spec.ts`), US-005-05 (`tasks-migration.test.mjs`, `tasks.access.service.spec.ts`, `verify:rls`) |
| Ficheros del plan presentes en el diff | OK: migración, modelo, utilidades de fecha, reloj, servicios de acceso y textos, lista, formulario, iconos, rutas, `docs/supabase.md`; `features/home` retirada |
| Decisiones del clarify reflejadas | OK: hora opcional solo con fecha (`due_time`, formulario y test), 30 días de completadas, orden dentro del día, «Atrasadas» sin contar la hora, formulario solo con título, fecha y hora, la lista sustituye a «Hola», borrado definitivo con confirmación, sin cola sin red y duplicados permitidos |

## 2. Calidad de código

- `pnpm lint:fix`, `pnpm format`, `pnpm secrets:check`: sin hallazgos.
- `pnpm test:ci`: **320 tests** en verde; `pnpm test:scripts`: 51 en verde. Cobertura global ≈ 99 %.
- Sin `any`, sin `console` en código de producción de la feature, `OnPush` en los dos componentes nuevos.
- Solo `SupabaseService` importa `@supabase/supabase-js` (ningún otro fichero de `src/app` lo hace).
- Migración con RLS por usuario en la misma migración (cuatro políticas, `revoke` a `anon`) y rollback documentado; sin datos de ejemplo.
- Revisión manual del diff saliente (`git log -p`): sin secretos, correos, ids, URLs privadas ni rutas locales.

## 3. Verificación visual y en dispositivo

- **Navegador** (viewport de 390 px, vía extensión de Chrome): lista con grupos, atrasadas, completar con aviso, Completadas, edición, confirmación de borrado y validación del título. Áreas táctiles ≥ 44 px, sin scroll horizontal, consola sin errores. Persistencia al recargar.
- **Android (emulador)**: selectores nativos de fecha y hora (en español), teclado virtual sin tapar el campo ni Guardar, persistencia al reiniciar y borrado con confirmación.
- **RLS real** (`pnpm verify:rls`): 15 de 15 comprobaciones con dos sesiones anónimas.
- **NO VERIFICADO**: modo oscuro de las pantallas nuevas; estado de error de la lista con una caída de red real (cubierto solo por tests unitarios); safe-areas con barra de gestos (solo se comprobó que nada se solapa).

## 4. Revisión cruzada (DeepSeek)

1. **Spec + clarify** (una pasada): ver la tabla de abajo; todo resuelto.
2. **Diff antes del push** (`f045a53`): sin hallazgos graves; dos de gravedad baja, **ambos válidos y corregidos** con test primero:

| Hallazgo | Valoración | Corrección |
|---|---|---|
| `load()` podía pisar un cambio optimista (completar o borrar) en vuelo con datos anteriores | Válido (transitorio, sin pérdida de datos) | Contador de cambios en vuelo: mientras haya uno, la respuesta de `load()` no sustituye la caché. Dos tests nuevos |
| El contador de caracteres usaba la longitud sin recortar, en desacuerdo con la validación | Válido (cosmético) | El contador usa la longitud recortada, la misma que se valida y se guarda. Un test nuevo |

### Revisión de la spec y el clarify (13-nov)

El revisor solo ve lo versionado en HEAD: leyó la spec anterior al clarify, por lo que los hallazgos 1, 2, 3 y 5 ya estaban resueltos en el disco cuando se emitieron.

| # | Hallazgo | Gravedad | Valoración |
|---|---|---|---|
| 1 | La hora opcional (`due_time`) del clarify no aparece en la spec | alta | Ya resuelto: modelo, tabla, formulario y alcance actualizados; test de la hora |
| 2 | El límite de 30 días de «Completadas» no está en la spec | media | Ya resuelto: criterio actualizado; test |
| 3 | El orden dentro del día no está en la spec | media | Ya resuelto: criterio añadido; test |
| 4 | Faltan tests para US-005-05 CA2 y CA4 | media | Válido: añadidos al plan de tests |
| 5 | Los títulos duplicados no se mencionan | baja | Válido y barato: test de duplicados permitidos |

## 5. Integridad de la rama

- `HEAD` y `origin/main` coincidían en `f045a53` antes de esta revisión.
- Cambios pendientes de commit: las dos correcciones, `review.md`, el log de interacciones y el estado de la spec.
