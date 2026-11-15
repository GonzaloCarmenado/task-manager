# Spec 006 — Alarmas de tareas

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-14
**Estado**: Implementada
**Ciclo**: completo
**Frontal**: sí (aviso previo de permiso, estado de avisos desactivados y texto de la notificación)

---

## Objetivo

Que el móvil avise al usuario a la hora de una tarea que tiene fecha y hora, aunque la app esté cerrada, para que no se le pase.

---

## Contexto

- Depende de la **spec 005**: las tareas ya guardan `due_date` y `due_time` (hora local), pero hoy **no disparan nada**. Esta spec convierte esa hora en un aviso del sistema.
- Es una **alarma local del móvil**: se programa en el propio dispositivo con las notificaciones de Android (plugin oficial de Tauri para notificaciones, detrás de un servicio). No hay servidor de avisos ni notificaciones push.
- **Verificado en el código del plugin (2026-11-14)**: `tauri-plugin-notification` ya programa avisos futuros con `AlarmManager` (hora exacta si el permiso lo permite y degradación a aproximada si no) e incluye un receptor de reinicio; no hace falta código nativo propio para programar ni restaurar. El plan confirma la versión exacta y qué permisos del manifiesto añade la app.
- Solo Android. En navegador el servicio debe **degradar con gracia** (sin avisos y sin errores).
- Android 13 y posteriores exigen **permiso de notificaciones**, y las alarmas exactas tienen su propio permiso especial. Se pide **en contexto** (al crear la primera tarea con hora), nunca al abrir la app.
- Spec 007 (posponer) y 008 (gamificación) se apoyan en esta: al posponer, el aviso se reprograma.
- Las notificaciones **no llevan datos sensibles más allá del título de la tarea**; si el bloqueo con huella (spec 004) está activo, la notificación no se salta ese bloqueo al abrir la app.

---

## Historias de usuario

### US-006-01 — Aviso a la hora de la tarea (P1)

**Como** usuario, **quiero** recibir un aviso a la hora de mi tarea, **para** acordarme aunque no tenga la app abierta.

**Criterios de aceptación:**
- Una tarea pendiente con fecha y hora futuras programa un aviso del sistema para ese instante exacto (hora local del móvil).
- La notificación muestra el **título de la tarea** y la hora; al tocarla se abre la app en esa tarea.
- Una tarea sin hora, sin fecha, completada o con la hora ya pasada **no** programa aviso.
- Crear, editar (cambiar título, fecha u hora o quitar la hora), completar, desmarcar y borrar una tarea mantienen el aviso al día: se reprograma, se cancela o se vuelve a programar según corresponda, sin avisos duplicados.
- El aviso funciona con la app cerrada y tras **reiniciar el móvil**.
- Al abrir la app se **reconcilian** los avisos con las tareas guardadas (por si se instaló de nuevo, se cambió la hora del móvil o hubo cambios desde otro sitio).
- Se programan como máximo los **60** avisos más próximos a la vez; el resto se programa al reconciliar al abrir la app.

### US-006-02 — Permiso de notificaciones (P1)

**Como** usuario, **quiero** entender por qué la app pide permiso y poder decidir, **para** no recibir avisos que no quiero.

**Criterios de aceptación:**
- El permiso se pide **al guardar una tarea con hora**, tras una explicación breve propia («Para avisarte a la hora, necesitamos permiso para enviarte notificaciones») con **Permitir** y **Ahora no**; nunca al abrir la app.
- Si pulsa **Ahora no**, la próxima vez que guarde una tarea con hora se vuelve a ofrecer, hasta **3 negativas**; después ya no se pregunta y solo queda el aviso discreto de alarmas desactivadas.
- Si el usuario concede el permiso, el aviso de esa tarea se programa en el momento.
- Si lo rechaza (en nuestro aviso o en el del sistema), la tarea se guarda igualmente y se muestra un **aviso no intrusivo** de que las alarmas están desactivadas, con un camino para activarlas desde los ajustes del sistema.
- Si el permiso se concede o se retira después desde los ajustes del móvil, la app lo detecta al volver a primer plano y actúa en consecuencia (programa o deja de programar).
- Se intenta la **hora exacta**: en Android que exige el permiso de «alarmas y recordatorios», se explica y se envía al usuario a ese ajuste solo si hace falta; si no lo concede, el aviso sigue funcionando con hora aproximada (puede retrasarse unos minutos) y se le informa.

### US-006-03 — Qué ve el usuario en la notificación (P2)

**Como** usuario, **quiero** que la notificación sea clara y respete mi privacidad, **para** saber de qué va de un vistazo.

**Criterios de aceptación:**
- Título de la notificación: el de la tarea; texto: «Es la hora» con la hora de la tarea (sin datos de XP, rachas ni cuentas).
- Un único canal de notificaciones «Recordatorios» con importancia alta, y el sonido y la vibración que el usuario tenga en el sistema. Varias tareas a la misma hora dan una notificación cada una.
- Con la pantalla bloqueada, el contenido sigue la configuración de privacidad del sistema (no se fuerza a mostrarlo).
- Tocar la notificación con el bloqueo con huella activo abre la app **tras desbloquear**, y después lleva a la tarea.
- En la lista, cada tarea con aviso programado muestra un indicador pequeño; las que tienen hora pero no alarma por falta de permiso, otro distinto (P2).

---

## Plan de tests (TDD)

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-006-01 …` solo programa tareas pendientes con fecha y hora futuras (hora local) | CA 1, 3 | `alarms.constructor.service.spec.ts` | unit |
| `US-006-01 …` identificador estable por tarea y sin duplicados al reprogramar | CA 4 | `alarms.access.service.spec.ts` | unit |
| `US-006-01 …` crear, editar, completar, desmarcar y borrar mantienen el aviso | CA 4 | `alarms.access.service.spec.ts`, `tasks.access.service.spec.ts` | unit |
| `US-006-01 …` reconciliación al arrancar y tras cambio de permiso | CA 6 | `alarms.access.service.spec.ts` | unit |
| `US-006-01 …` el aviso sobrevive al reinicio (receptor de arranque) | CA 5 | verificación en emulador | manual |
| `US-006-01 …` tocar la notificación abre la tarea | CA 2 | `alarms.access.service.spec.ts` | unit + manual |
| `US-006-02 …` el permiso se pide en contexto y nunca al abrir | CA 1 | `alarm-permission.spec.ts` | unit |
| `US-006-02 …` concedido, rechazado y retirado después | CA 2 a 4 | `alarms.access.service.spec.ts`, `alarm-permission.spec.ts` | unit |
| `US-006-02 …` alarmas exactas: explicación y degradación | CA 5 | `alarms.access.service.spec.ts` | unit |
| `US-006-03 …` textos de la notificación sin datos de gamificación | CA 1 | `alarms.constructor.service.spec.ts` | unit |
| En navegador el servicio no importa el plugin y no falla | restricciones | `alarms.access.service.spec.ts` | unit |

Si hay frontal: revisión visual en navegador con la extensión de Chrome (obligatoria) y comprobación en Android (emulador: permiso, aviso a la hora, reinicio y bloqueo con huella).

---

## Ficheros afectados

**Crear:**
- `src/app/core/services/alarms.access.service.ts` (+ spec): único contacto con el plugin de notificaciones
- `src/app/features/tasks/alarms/` (aviso de permiso, estado «alarmas desactivadas»), *(por confirmar en `/sdd-plan`)*
- `src-tauri/capabilities/` (permisos de notificaciones solo Android)
- Permiso de alarmas exactas en el manifiesto de Android (verificar en el plan cómo se declara con `gen` regenerado)

**Modificar:**
- `src/app/features/tasks/tasks.access.service.ts` (avisar al servicio de alarmas tras cada cambio)
- `src/app/features/tasks/task-form/` (aviso de permiso al guardar con hora)
- `src/app/features/tasks/tasks-list/` (indicador de alarma programada o sin alarma)
- `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `package.json` (plugin con versión exacta, solo Android)
- `docs/setup-android.md`, `CLAUDE.md`

---

## Modelo de datos

Sin cambios en la base de datos: las alarmas viven en el móvil y se **derivan** de `due_date` + `due_time`. En local solo se guarda un contador de negativas al aviso de permiso (`deniedCount`, de 0 a 3) para no insistir más de 3 veces.

```typescript
export type AlarmPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';
```

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any`.
- Plugin con **versión exacta** y solo bajo Android; permisos mínimos en una *capability* solo móvil; carga diferida del plugin (no se importa en navegador).
- Solo `AlarmsAccessService` toca el plugin; el componente nunca.
- Fechas siempre en hora local.
- Nunca escribir en consola títulos de tareas ni datos del usuario.
- Mobile-first: targets ≥ 44 px, safe-areas.
- Repo público: sin secretos ni datos privados.

---

## Out of scope

- Posponer desde la notificación y acciones rápidas en ella (spec 007).
- Avisos con antelación («10 minutos antes»), avisos repetidos y sonidos personalizados.
- Notificaciones push desde servidor, avisos de XP o rachas (spec 008).
- Tareas con fecha pero sin hora (no avisan).
- iOS y escritorio.
