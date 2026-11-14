# Spec 008 — Gamificación: XP, niveles y rachas

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-14
**Estado**: Implementada en el cliente (migraciones aplicadas y verificadas; pendiente de verificar en Android)
**Ciclo**: completo
**Frontal**: sí (celebración al completar, resumen de progreso, subida de nivel y rachas)

---

## Objetivo

Que completar tareas se sienta como un logro: cada tarea hecha da experiencia (XP), la experiencia sube de nivel y completar tareas varios días seguidos crea una racha.

---

## Contexto

- Es la parte «gamificada» del producto: para usuarios no profesionales, con un tono desenfadado que anime a volver a marcar otra tarea. Depende de la **spec 005** (tareas completadas) y aprovecha el contador de pospuestas de la **007**.
- **Orden de implementación**: 006 (alarmas), 007 (posponer) y después esta. El criterio «posponer no da ni quita XP» solo se puede comprobar cuando la 007 esté implementada.
- Hoy completar una tarea solo cambia su estado y muestra «Tarea completada». No hay progreso acumulado.
- El progreso es **por usuario** y vive en Supabase (una fila por usuario más el historial de lo ganado), con RLS por `auth.uid()` en la misma migración. Se calcula a partir de las tareas completadas, no de la hora del móvil sola.
- La **hora del día** se interpreta en hora local del móvil (`YYYY-MM-DD` construido a mano), nunca en UTC.
- Esta spec define **qué** se premia; la curva exacta de niveles y la forma de calcularlo (en el servidor o en el cliente) se deciden en `/clarify` y en el plan.

---

## Historias de usuario

### US-008-01 — Ganar XP al completar una tarea (P1)

**Como** usuario, **quiero** ganar puntos al completar tareas, **para** sentir que avanzo.

**Criterios de aceptación:**
- Completar una tarea pendiente da **10 XP** y lo muestra al instante con una celebración breve («+10 XP»).
- **Desmarcar** una tarea completada le **quita** los XP que había dado (nunca bajan de 0); volver a completarla vuelve a darlos. Así, una tarea suma como máximo 10 XP a la vez y completar y desmarcar en bucle no genera XP.
- Al desmarcar, el aviso indica los XP realmente quitados («−10 XP»); si la tarea no había dado XP (se completó con el tope alcanzado), no se indica ninguno y se quita 0.
- **Tope diario de 100 XP** (por día local): cuando el día ya suma 100 XP, completar otra tarea no da XP y lo dice («Hoy ya has llegado al tope de XP»), pero la tarea se completa y cuenta para la racha. Desmarcar una tarea resta su XP del día en que se concedió.
- Si falla el guardado, no se concede nada y la tarea vuelve a su estado (como en la 005).
- Posponer no da ni quita XP. Las tareas completadas **antes** de esta spec no dan XP retroactivo.
- Sin red, el XP no se inventa: se muestra solo lo confirmado por el servidor, con el mismo plazo propio y reversión que la 005.

### US-008-02 — Niveles (P1)

**Como** usuario, **quiero** subir de nivel con mi XP, **para** tener metas a corto plazo.

**Criterios de aceptación:**
- El usuario empieza en el **nivel 1** con 0 XP.
- La XP acumulada necesaria para **alcanzar** el nivel N es `25·N·(N−1)`: nivel 2 con 50 XP, nivel 3 con 150, nivel 4 con 300, nivel 5 con 500, y así. Se muestra el **nivel actual**, la **XP acumulada** y cuánto falta para el siguiente.
- Al cruzar un umbral aparece una pantalla breve de **subida de nivel** con el nuevo nivel, que se cierra con un toque o con el botón atrás.
- Si una sola tarea hace subir varios niveles (no debería ocurrir), se muestra el nivel final una sola vez.
- El nivel se calcula siempre con la XP total, y solo puede bajar si el usuario desmarca una tarea cuya XP le había hecho subir (sin pantalla especial).

### US-008-03 — Rachas (P1)

**Como** usuario, **quiero** mantener una racha de días seguidos completando tareas, **para** crear el hábito.

**Criterios de aceptación:**
- Un día cuenta para la racha si se completa **al menos una tarea** ese día (hora local, incluso si la tarea era de otra fecha).
- La racha actual son los días consecutivos hasta hoy; si hoy aún no se ha completado ninguna pero ayer sí, la racha **sigue viva** hasta el final del día.
- Si pasa un día entero sin completar ninguna tarea, la racha vuelve a 0.
- Se guarda y muestra también la **mejor racha** histórica.
- Al completar la primera tarea del día aparece la racha actualizada («Llevas N días») en la celebración.
- La racha se calcula con los días que tienen **al menos una tarea completada** (día local del completado, guardado en la tarea): desmarcar la única tarea completada de un día lo quita de la racha y puede romperla. La **mejor racha** histórica nunca baja.

### US-008-04 — Ver mi progreso (P2)

**Como** usuario, **quiero** ver mi nivel, XP y racha de un vistazo, **para** motivarme.

**Criterios de aceptación:**
- La pantalla de tareas muestra un **resumen compacto** (nivel, barra hasta el siguiente nivel y racha actual) sin ocupar más de una franja superior.
- Tocar el resumen abre una **pantalla de progreso** con nivel, XP total, XP para el siguiente nivel, racha actual y mejor racha.
- Estados: carga, sin red (último dato conocido de esta apertura o error con reintentar) y usuario nuevo (nivel 1, 0 XP, racha 0, con un mensaje que anime a empezar).
- Móvil: sin scroll horizontal, tema claro y oscuro, objetivos ≥ 44 px.

### US-008-05 — Celebración que anima sin molestar (P3)

**Como** usuario, **quiero** una celebración vistosa pero rápida, **para** disfrutar de marcar tareas sin que me retrase.

**Criterios de aceptación:**
- La celebración dura poco (≈ 1 s), no bloquea la lista y respeta «reducir animaciones» del sistema.
- No hay sonido ni vibración por defecto.

---

## Plan de tests (TDD)

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-008-01 …` completar da 10 XP; desmarcar los quita; volver a completar los da otra vez; el bucle no genera XP | CA 1 a 3 | `scripts/progress-migration.test.mjs` (SQL) y `scripts/verify-progress.mjs` (real, manual) | script |
| `US-008-01 …` tope de 100 XP al día: la tarea se completa sin XP, cuenta para la racha y desmarcar resta del día en que se concedió | CA 4 | `scripts/progress-migration.test.mjs` y `scripts/verify-progress.mjs` | script |
| `US-008-02 …` el nivel baja solo al quitar XP que lo había subido | CA 5 | `progress.constructor.service.spec.ts` | unit |
| `US-008-03 …` desmarcar la única tarea de un día lo quita de la racha; la mejor racha no baja | CA 6 | `scripts/verify-progress.mjs` | script |
| `US-008-01 …` si falla el guardado no se concede nada | CA 4 | `progress.access.service.spec.ts` | unit |
| `US-008-02 …` curva de niveles (`25·N·(N−1)`), nivel y XP para el siguiente | CA 1 a 4 | `progress.constructor.service.spec.ts` | unit |
| `US-008-03 …` racha: día con tarea, ayer vivo hoy, día vacío la rompe, mejor racha | CA 1 a 4 | `scripts/verify-progress.mjs` (la racha la calcula la base de datos) | script |
| `US-008-03 …` días en hora local (23:59, 00:01, fin de mes, cambio de hora) | CA 1 | `progress.access.service.spec.ts` (el cliente envía el día local del completado) | unit |
| `US-008-01 …` al desmarcar, el aviso indica los XP realmente quitados (0 si había tope) | CA 6 | `progress.access.service.spec.ts`, `tasks-list.spec.ts` | unit |
| `US-008-04 …` resumen y pantalla de progreso: carga, error y usuario nuevo | CA 1 a 3 | `progress-summary.spec.ts`, `progress-screen.spec.ts` | unit |
| `US-008-05 …` celebración breve y con «reducir animaciones» | CA 1 | `celebration.spec.ts` | unit |
| `US-008-01 …` migración: tablas con `user_id`, RLS y restricciones | modelo | `scripts/progress-migration.test.mjs` | script |
| RLS real con dos sesiones anónimas | privacidad | `scripts/verify-rls.mjs` ampliado | manual |

Si hay frontal: revisión visual en navegador con la extensión de Chrome (obligatoria; claro y oscuro) y comprobación en Android. `db push` solo con verificación de cuenta por id y confirmación.

---

## Ficheros afectados

**Crear:**
- `src/app/core/models/progress.ts`
- `src/app/features/progress/` (resumen, pantalla de progreso, celebración y subida de nivel, con el patrón de 3 servicios), *(por confirmar en `/sdd-plan`)*
- `scripts/progress-migration.test.mjs` y `scripts/verify-progress.mjs` (prueba real, manual)

**Modificar:**
- `src/app/features/tasks/tasks.access.service.ts` o un servicio de progreso que reaccione a completar
- `src/app/features/tasks/tasks-list/` (resumen y celebración)
- `scripts/verify-rls.mjs`, `docs/supabase.md`, `CLAUDE.md`

**Supabase:**
- `supabase/migrations/<marca>_progress.sql` (columnas nuevas en `tasks`, estadísticas por usuario y la lógica atómica de completar y desmarcar, con RLS y `user_id`)

---

## Modelo de datos

```typescript
export interface Progress {
  readonly totalXp: number;        // ≥ 0
  readonly level: number;          // ≥ 1
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  readonly currentStreak: number;  // días
  readonly bestStreak: number;
  readonly lastCompletedDay: string | null; // 'YYYY-MM-DD' local
  readonly xpToday: number;        // 0 a 100 (tope diario)
}
```

Cambios previstos (a cerrar en el plan): en `tasks`, las columnas `completed_day date` (día local que envía el cliente al completar), `xp_awarded smallint not null default 0` y `xp_day date` (día en que se concedió); y una tabla de estadísticas por usuario (XP total, mejor racha). La racha actual y el XP del día se derivan en la base de datos de `completed_day` y `xp_day`. Ambas con `user_id` por defecto `auth.uid()`, RLS por las cuatro operaciones y sin datos de ejemplo.

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any`, patrón de 3 servicios; solo el access service toca Supabase.
- Datos y cachés indexados por `userId()`; plazo propio y reversión como la 005.
- Días siempre en hora local; nunca `toISOString()` para el día.
- La celebración respeta `prefers-reduced-motion`.
- Mobile-first: targets ≥ 44 px, safe-areas, tema claro y oscuro.
- Repo público: sin secretos ni datos privados; migración con RLS y rollback documentado.

---

## Out of scope

- Misiones, logros, insignias, tienda y recompensas canjeables.
- Clasificaciones y comparación con otros usuarios.
- Penalizaciones por posponer o por tareas atrasadas.
- XP variable por dificultad o prioridad, y bonificaciones por hora.
- Sonidos, vibración y notificaciones de gamificación.
- Cuentas de usuario y sincronización entre dispositivos (spec de cuenta).
