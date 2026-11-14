# Diseño de la spec 007 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-14, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md). El export cubre las specs 006, 007 y 008 a la vez; aquí se guardan las pantallas que afectan a esta.
**Sistema de diseño**: el mismo [Playful Momentum](../../_design/playful-momentum/DESIGN.md). Copia verificada con hashes.

## Contenido

| Carpeta | Pantalla | Historia |
|---|---|---|
| `hoja-de-posponer/` | Hoja «Posponer recordatorio» con Mañana, La semana que viene y Elegir fecha; avisos de resultado (éxito y error) | US-007-01 |
| `lista-de-tareas/` | Lista con el botón **Posponer** en cada tarea pendiente | US-007-01 |

Cada carpeta tiene `screen.png` y `code.html` (maqueta; no se ejecuta). La spec manda: lo extra se **ignora sin preguntar**.

## Se conserva

- Botón **Posponer** en la fila de cada tarea pendiente, distinto del control de completar.
- Hoja con el título de la tarea y tres opciones, cada una con su fecha legible («Mañana (Jueves…)», «La semana que viene (Lunes…)») y «A las 16:30» cuando hay hora.
- «Elegir fecha» con la indicación «Selecciona un día futuro».
- Avisos: «Tarea pospuesta a Mañana a las 16:30» y «No se pudo posponer la tarea. Inténtalo de nuevo.».

## Se ignora

| Dónde | Elemento | Motivo |
|---|---|---|
| Varias | Simulador (pestañas Permiso / Posponer / Exacta, «Vista previa en sistema Android») | Prototipo |
| Lista | Cabecera «Misiones Diarias», avatar, barra inferior, «+» central, etiquetas «Prioridad alta», «Bienestar», «Asegura tu racha de 6 días» | Fuera de la spec |
| Lista | Etiqueta de botón «Asignar fecha» en tareas sin fecha | Se usa **Posponer** en todas (la spec lo define así: posponer una tarea sin fecha le pone fecha) |
| Notificación | Botón «Posponer 1h» | Fuera de alcance (posponer desde la notificación) |

## Cambios por el clarify

- La hoja añade la opción **Más tarde hoy (+1 hora)**, que el diseño no trae (solo tenía «Posponer 1h» en la notificación, que se ignora): se construye con los mismos componentes.
- Sin botón Deshacer en el aviso.

## Decisiones que resuelve el plan

- Falta dibujar la acción **Posponer** del formulario de edición: se construye con los mismos componentes.
- El aviso de resultado muestra la fecha legible; el diseño usa «Mañana a las 16:30» y el plan define el formato para fechas lejanas.
