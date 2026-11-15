# Revisión cruzada (DeepSeek) — spec 006

**Fecha**: 2026-11-14 · Una pasada tras cerrar el clarify.

Tres de los hallazgos se emitieron antes de que la spec incorporase las decisiones del clarify (el revisor leyó la versión anterior). El principal se comprobó contra el código real del plugin.

| # | Hallazgo | Gravedad | Valoración |
|---|---|---|---|
| 1 | El plugin oficial no programa avisos futuros ni sobrevive al reinicio | alta | **Falso**: se verificó en el código del plugin (solo lectura): programa con `AlarmManager` (exacta si es posible, `setAndAllowWhileIdle` si no) y trae un receptor de reinicio. Queda como punto del plan: el permiso de alarmas exactas en el manifiesto de la app |
| 2 | La spec dice «una vez» y el clarify «hasta 3 veces» | media | **Válido en parte**: el CA ya se había ajustado, pero el modelo de datos seguía con un booleano; ahora es un contador `deniedCount` |
| 3 | El límite de 60 avisos no está en la spec | media | **Ya resuelto** antes de emitirse (criterio añadido en US-006-01) |
| 4 | El canal «Recordatorios» no está en la spec | baja | **Ya resuelto** (criterio añadido en US-006-03) |
| 5 | El indicador de la lista no está en la spec | baja | **Resuelto a medias**: el criterio ya estaba; faltaba en «Ficheros afectados», añadido |

---

# Verificación en el emulador Android (T-006-45)

**Fecha**: 2026-11-14 · Emulador x86_64 con el APK debug.

| Escenario | Resultado |
|---|---|
| Aviso previo al guardar una tarea con hora, **Permitir** y diálogo del sistema | OK (nunca al abrir la app) |
| Alarma registrada en `AlarmManager` a la hora de la tarea | OK |
| Sin el permiso de alarmas exactas | Hora aproximada (ventana de ~1,5 min) |
| «Ir a ajustes» abre «Alarmas y recordatorios» del propio sistema (plugin local) | OK |
| Con el permiso concedido la alarma es **exacta** (`window=0`) | OK |
| Notificación a la hora **con la app cerrada** (canal «Recordatorios», importancia alta, título de la tarea) | OK |
| Reabrir la app reconcilia la alarma tras detener la app | OK |
| Tocar el aviso con la **app en segundo plano** abre esa tarea | OK |
| Tocar el aviso con la app cerrada **por el usuario** (tarea fuera de «recientes») | OK (se emuló con el mismo intent) |
| Tocar el aviso con el proceso muerto pero la tarea aún en «recientes» | Limitación de Android: el intent no llega a la app; se abre la lista |
| Alarma tras **reiniciar** el móvil sin abrir la app | OK con la programación nativa (ver «Cambio de diseño»); con el plugin oficial FALLABA |
| 60 avisos a la vez | OK en emulador (2026-11-14): con 65 tareas con hora hay exactamente 60 alarmas pendientes, las 60 más próximas; al borrar 3 entran las siguientes y se mantiene en 60 |
| Cambio de zona horaria | OK al volver a primer plano (la alarma pasa de la hora vieja a las 06:30 locales de la nueva zona). **Limitación**: con la app en segundo plano la alarma suena a la hora antigua hasta reabrirla (no hay receptor del cambio de zona) |
| Toque en la notificación con el bloqueo con huella activo | OK en emulador: la app abre bloqueada sin mostrar datos y, tras la huella, abre «Editar tarea» de esa tarea |

## Hallazgos

1. **Los eventos del plugin llegan con `notification: null`** para avisos programados (el plugin no asigna `sourceJson`): no traen ni el id ni nuestro `extra`. Se resolvió con el plugin local (`launch_notification_id`), que captura el `NotificationId` del intent (al crear la actividad y en `onNewIntent`) y que la app consulta al arrancar y cada vez que vuelve a primer plano.
2. **Reinicio**: el receptor del plugin arranca tras el reinicio pero no restaura ninguna alarma, porque guarda el aviso con `sourceJson` nulo (`"null"`) y no puede leerlo. Comprobado también en la rama principal del plugin: es un fallo del plugin, no de la app. Efecto: tras reiniciar el móvil los avisos vuelven en cuanto se abre la app (la reconciliación los reprograma), pero no suenan antes.
3. El `ng serve` en segundo plano comparte caché con `ng test` y provocaba fallos intermitentes en tres tests del cliente de Supabase; parado el servidor, desaparecen.

---

# Revisión visual en el navegador (T-006-47)

**Fecha**: 2026-11-14 · Ventana de 400 px, vistas previas de desarrollo (`/__dev/alarms/prompt | banner | exact`).

- Aviso previo, aviso de «alarmas desactivadas» y hoja de alarmas exactas se ven como el diseño (sin lo ignorado): sin scroll horizontal y con la consola sin errores.
- Áreas táctiles: botones del aviso previo de 56 px, «Activar alarmas» y «Cerrar» de 44 px.
- **No verificado en el navegador**: tema oscuro de estas tres piezas (los tokens son los mismos que en el resto de pantallas, ya comprobadas en oscuro en el emulador). La extensión solo muestra el tema claro.

---

# Cambio de diseño tras la verificación (opción B)

Decisión del usuario: programar y restaurar los avisos con **código nativo propio** en el plugin local (`AppSettingsPlugin`, `AlarmScheduler`, `AlarmReceiver`, `BootReceiver`), porque el plugin oficial no restaura las alarmas tras reiniciar. La app envía el conjunto completo con `schedule_alarms`; el plugin cancela lo que sobra, programa lo nuevo y lo guarda. El plugin oficial se queda solo para el permiso y el canal.

Verificado en el emulador con la programación nativa:

| Escenario | Resultado |
|---|---|
| Alarma exacta registrada en `AlarmManager` (`app.tauri.appsettings.ALARM`, `window=0`) | OK |
| **Tras reiniciar el emulador sin abrir la app, la alarma sigue registrada** | OK |
| La notificación suena a la hora («Es la hora (12:06)») tras el reinicio | OK |
| Tocar la notificación tras el reinicio abre la tarea («Editar tarea») | OK |

**Verificado en el emulador el 2026-11-14**: 60 avisos, cambio de zona horaria y toque con el bloqueo con huella activo. Pendiente como mejora (no bloqueante): reconciliar también al recibir el cambio de zona horaria con la app en segundo plano.

---

# Revisión cruzada del diff (DeepSeek) y correcciones

| Hallazgo | Valoración | Resolución |
|---|---|---|
| Al retirar el permiso, `scheduled` quedaba obsoleto y el indicador «Avisará» mentía | Válido | `doReconcile` envía el conjunto vacío y vacía `scheduled` si había avisos; test US-006-03 |
| Tocar el aviso con la app ya en primer plano no se leía | Válido (sin probar en emulador) | Se lee también al recuperar el foco de la ventana; test US-006-01 |
| Restos `launch_task_id` en `reference.md` y `schema.json` | Válido | Eliminados |
| Tras reiniciar se publican avisos atrasados, contra la decisión 6 del clarify | Parcial | Se mantiene (un aviso tardío es mejor que perderlo) pero con otro texto («Era a las HH:MM»). `clarify.md` está cerrado y no se edita: esta es la decisión vigente |
