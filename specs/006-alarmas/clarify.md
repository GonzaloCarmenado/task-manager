# Clarify 006 — Alarmas de tareas

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-14

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Precisión de la alarma**: ¿hora exacta (permiso especial «alarmas y recordatorios») o aproximada (sin permiso extra, puede retrasarse minutos)?
2. **«Ahora no» en nuestro aviso de permiso**: ¿se vuelve a preguntar la próxima vez que se guarda una tarea con hora?
3. **Límite de avisos programados** (por defecto): se programan como máximo los **60** avisos más próximos; el resto se programa al reconciliar cuando se abre la app y al ir pasando los anteriores.
4. **Canal de notificaciones** (por defecto): un único canal «Recordatorios» con importancia alta y el sonido y la vibración que el usuario tenga configurados en el sistema; la app no impone sonido propio.
5. **Varias tareas a la misma hora** (por defecto): una notificación por tarea, sin agrupar.
6. **Tareas atrasadas y con hora ya pasada** (por defecto): no generan aviso ni recordatorio posterior.
7. **Cambio de zona horaria u hora del móvil** (por defecto): los avisos se reconcilian al abrir la app y al reiniciar el móvil; no se intenta reprogramar en segundo plano.
8. **Indicador en la lista** (por defecto): cada tarea con aviso programado muestra un indicador pequeño, y las que tienen hora pero no alarma por falta de permiso, otro distinto. Es P2.
9. **Tocar la notificación con el bloqueo con huella activo** (por defecto): se desbloquea primero y después se abre la tarea.
10. **Navegador** (por defecto): sin alarmas y sin errores; no se muestra ningún aviso de permisos.

---

## Respuestas

1. **Exacta si se puede** (recomendación aceptada): se intenta la hora exacta; si el usuario no concede el permiso especial, se usa la aproximada y se le informa.
2. **Sí, hasta 3 veces** (recomendación aceptada), como el bloqueo con huella: a la tercera negativa solo queda el aviso discreto de alarmas desactivadas.
3. a 10. Sin preguntar: valores por defecto.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Precisión | Exacta si el usuario concede «alarmas y recordatorios»; si no, aproximada con aviso |
| Insistencia del permiso | Se vuelve a ofrecer al guardar la siguiente tarea con hora, hasta 3 negativas; después solo el aviso discreto |
| Límite | Máximo 60 avisos programados a la vez; el resto al reconciliar |
| Canal | Un canal «Recordatorios», importancia alta, sonido y vibración del sistema |
| Misma hora | Una notificación por tarea |
| Atrasadas | Sin avisos |
| Zona horaria | Se reconcilia al abrir la app y al reiniciar |
| Indicador en la lista | Sí, P2: alarma programada y sin alarma |
| Bloqueo con huella | Desbloquear primero, luego abrir la tarea |
| Navegador | Sin alarmas, sin avisos y sin errores |

---

**Estado**: CERRADO
