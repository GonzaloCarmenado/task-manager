# Clarify 005 — Tareas básicas

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-13

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Hora de la tarea**: ¿solo fecha o también hora opcional, pensando en las alarmas de una spec posterior?
2. **Alcance de «Completadas»**: ¿todas o solo las recientes?
3. **Ordenación dentro de un día** (por defecto): primero las que tienen hora, de más temprana a más tardía; después las que no tienen hora, por orden de creación.
4. **«Atrasadas»** (por defecto): fecha anterior a hoy y sin completar; la hora no cuenta (una tarea de hoy con la hora ya pasada sigue en «Hoy»).
5. **Hora sin fecha** (por defecto): no se admite; el selector de hora solo está disponible si hay fecha, y al quitar la fecha se quita la hora.
6. **Campos del formulario** (por defecto): solo título, fecha y hora. Sin notas, prioridad ni etiquetas.
7. **Pantalla principal** (por defecto): la lista de tareas sustituye a la pantalla «Hola» como ruta principal.
8. **Borrado** (por defecto): definitivo, con confirmación; sin papelera ni deshacer.
9. **Sin red** (por defecto): se muestran los datos ya cargados en esta apertura o el estado de error con reintento; sin cola de cambios; plazo propio de la capa de datos.
10. **Mismo título repetido** (por defecto): permitido; no se detectan duplicados.

---

## Respuestas

1. **Fecha y hora opcional ya**: columna de hora desde esta spec y selector en el formulario, sin alarmas todavía.
2. **Últimos 30 días** (recomendación aceptada). El histórico completo llega con estadísticas y rachas.
3. a 10. Sin preguntar: valores por defecto.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Hora | Opcional, `HH:MM` local, solo con fecha; columna `due_time time` en la tabla |
| Completadas | Se cargan y muestran las completadas en los últimos 30 días, de la más reciente a la más antigua |
| Orden dentro de un día | Con hora (ascendente), luego sin hora (por creación) |
| Atrasadas | Fecha anterior a hoy y sin completar; la hora no influye |
| Formulario | Título, fecha y hora; sin notas ni otros campos |
| Pantalla principal | La lista sustituye a «Hola» |
| Borrado | Definitivo, con confirmación |
| Sin red | Datos de esta apertura o error con reintento; sin cola de cambios |
| Duplicados | Permitidos |

---

**Estado**: CERRADO
