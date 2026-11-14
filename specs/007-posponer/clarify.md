# Clarify 007 — Posponer tareas

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-14

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **«Más tarde hoy» (+1 hora)**: ¿la hoja incluye una opción para mover la hora de la tarea una hora más tarde?
2. **Deshacer**: ¿el aviso «Tarea pospuesta a …» lleva un botón Deshacer?
3. **Cómo se calcula «+1 hora»** (por defecto): una hora **desde ahora** (hora local, sin segundos), no desde la hora antigua de la tarea, para que una tarea atrasada de hoy sirva de algo. Solo se ofrece a tareas **con hora** y con fecha de **hoy o anterior**. Si el resultado pasa de medianoche, la fecha avanza un día y la etiqueta lo dice («mañana a las 00:20»).
4. **«La semana que viene»** (por defecto): el **próximo lunes** posterior a hoy; si hoy es lunes, el lunes siguiente (+7 días).
5. **Opciones que no posponen de verdad** (por defecto): se ocultan las opciones cuya fecha no es **posterior** a la actual de la tarea (por ejemplo, una tarea de mañana no ofrece «Mañana»). Si ninguna aplica, queda «Elegir fecha».
6. **«Elegir fecha»** (por defecto): el mínimo es **hoy**; elegir la misma fecha que ya tiene la tarea no cambia nada y no cuenta.
7. **Cuándo sube el contador** (por defecto): solo cuando la tarea **ya tenía fecha** y pasa a una **fecha u hora posterior**. Ponerle fecha a una tarea sin fecha no cuenta como posponer.
8. **Tareas completadas** (por defecto): no tienen acción Posponer.
9. **Sin red** (por defecto): igual que la spec 005: cambio optimista, plazo propio de 8 s y reversión con aviso.

---

## Respuestas

1. **Sí, añadir +1 hora**: cuarta opción, con los casos borde de la pregunta 3.
2. **No, sin deshacer** (recomendación aceptada): si se equivoca, vuelve a posponer o edita la fecha.
3. a 9. Sin preguntar: valores por defecto.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Opciones de la hoja | **Más tarde hoy (+1 hora)**, Mañana, La semana que viene y Elegir fecha |
| +1 hora | Una hora desde ahora, solo tareas con hora y fecha de hoy o anterior; cruza medianoche cambiando de día |
| La semana que viene | Próximo lunes posterior a hoy (+7 si hoy es lunes) |
| Opciones ocultas | Las que no dan una fecha posterior a la actual |
| Elegir fecha | Mínimo hoy; la misma fecha no cambia nada |
| Contador | Sube solo si la tarea ya tenía fecha y pasa a algo posterior |
| Deshacer | No |
| Completadas | Sin acción Posponer |
| Sin red | Optimista con reversión y plazo de 8 s |

---

**Estado**: CERRADO
