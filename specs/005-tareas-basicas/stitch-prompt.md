# Prompt para Stitch — Spec 005 (Tareas básicas)

> Solo funcionalidad: pantallas, datos, acciones, estados y flujos. Nada de estilos (los decide Stitch con la guía que ya tiene).

---

## Contexto

Aplicación móvil Android, en vertical y pensada para usarse con una mano, para gestionar tareas personales. Es para usuarios no profesionales. No hay registro: el usuario entra directamente. Hay que diseñar el núcleo de la app: la lista de tareas y el formulario para crearlas y editarlas.

## Objetivo

Que el usuario pueda crear, ver por fecha, completar, editar y borrar tareas. Una tarea tiene un título (obligatorio), una fecha opcional y una hora opcional (la hora solo existe si hay fecha). Todavía no hay alarmas, ni posponer, ni puntos, ni rachas: no dibujar nada de eso.

## Pantallas

### 1. Lista de tareas (pantalla principal)

**Muestra:**
- Las tareas pendientes agrupadas por fecha, en este orden y solo los grupos que tengan tareas: **Atrasadas** (fecha anterior a hoy), **Hoy**, **Mañana**, después cada día posterior con su fecha legible, y **Sin fecha**.
- Dentro de cada día: primero las tareas con hora (de la más temprana a la más tardía) y después las que no tienen hora.
- Cada tarea muestra: control para marcarla como hecha, título y, si la tiene, la hora. Las atrasadas se distinguen como atrasadas.
- Una sección **Completadas** plegada por defecto, con las tareas completadas en los últimos 30 días, de la más reciente a la más antigua. Al desplegarla se ven con su título y su control para desmarcarlas.

**Acciones:**
- Marcar una tarea como hecha: pasa de inmediato a Completadas.
- Desmarcar una completada: vuelve a su grupo.
- Tocar una tarea: abre el formulario con sus datos (pantalla 2, modo editar).
- Acción principal de **crear tarea**, siempre visible y fácil de alcanzar con el pulgar: abre el formulario vacío (pantalla 2, modo crear).
- Plegar y desplegar Completadas.

### 2. Formulario de tarea (crear y editar)

**Muestra:**
- Campo **título** (obligatorio, máximo 120 caracteres).
- Selector de **fecha** (opcional; al crear viene con hoy; se puede quitar para dejar la tarea sin fecha).
- Selector de **hora** (opcional; solo disponible si hay fecha; al quitar la fecha desaparece la hora).
- Botón **Guardar**, deshabilitado mientras el título esté vacío o pase de 120 caracteres, con el motivo explicado.
- En modo editar, además, una acción **Borrar tarea**.
- Una forma clara de cerrar sin guardar.

**Acciones y qué ocurre tras cada una:**
- Guardar (crear o editar): el formulario se cierra y la tarea aparece o se actualiza en la lista, en el grupo de su fecha.
- Borrar: pide confirmación («esta acción no se puede deshacer») con las opciones de confirmar o cancelar; al confirmar, el formulario se cierra y la tarea desaparece de la lista.
- Cerrar sin guardar: vuelve a la lista sin cambios.
- El teclado virtual aparece al abrir el formulario y no debe tapar el campo ni el botón de guardar.

## Flujos

- Lista → crear tarea → formulario vacío → guardar → lista con la tarea nueva.
- Lista → tocar tarea → formulario con datos → guardar o borrar → lista actualizada.
- Lista → marcar como hecha → la tarea pasa a Completadas; desde Completadas se puede desmarcar.

## Estados a cubrir

- **Lista cargando** (indicador de carga).
- **Lista vacía**: mensaje amistoso que invita a crear la primera tarea, con la acción de crear.
- **Lista con error al cargar**: mensaje claro y botón **Reintentar**.
- **Error al guardar** en el formulario (sin conexión o fallo del servicio): mensaje claro; el texto escrito se conserva para volver a intentarlo.
- **Error al marcar o desmarcar o borrar**: aviso breve de que no se pudo; la tarea vuelve a su estado anterior.
- **Sin tareas atrasadas, de hoy, etc.**: los grupos vacíos no se muestran.
- **Sin completadas recientes**: la sección Completadas muestra que no hay ninguna (o no se muestra).

## Reglas visibles

- Título obligatorio, sin espacios sobrantes en los extremos, máximo 120 caracteres.
- Hoy y Mañana se calculan con la fecha del móvil.
- Se permiten tareas con el mismo título.
- El borrado es definitivo y siempre pide confirmación.
- Textos en español, tono cercano y amistoso.
