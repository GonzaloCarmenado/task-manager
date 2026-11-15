# Prompt para Stitch — Spec 007 (Posponer tareas)

> Solo funcionalidad: pantallas, datos, acciones, estados y flujos. Nada de estilos (los decide Stitch con la guía que ya tiene). Borrador previo al `/clarify`: se ajustará si el clarify cambia algo.

---

## Contexto

Aplicación móvil Android, en vertical y para usarse con una mano, para gestionar tareas personales (usuarios no profesionales). Ya existen la lista de tareas, agrupadas en Atrasadas, Hoy, Mañana, fechas posteriores y Sin fecha, y el formulario para crear y editar. Cada tarea tiene título, fecha opcional y hora opcional.

## Objetivo

Que el usuario pueda mover una tarea pendiente a otro momento con un par de toques, sin editarla a mano. Posponer no completa ni borra la tarea.

## Pantallas

### 1. Acción «Posponer» en cada tarea de la lista

Cada tarea pendiente de la lista tiene una acción secundaria **Posponer**, accesible sin abrir el formulario (un control en la propia fila, claramente distinto del control de completar).

**Acciones:**
- Tocar **Posponer** abre la hoja de opciones (pantalla 2).

### 2. Hoja de opciones para posponer

Hoja que sube desde abajo, alcanzable con el pulgar.

**Muestra:**
- El título de la tarea que se va a posponer.
- Opciones: **Más tarde hoy** (una hora desde ahora; solo para tareas con hora y de hoy o atrasadas), **Mañana**, **La semana que viene** (el próximo lunes) y **Elegir fecha**. Las opciones que no darían una fecha posterior a la actual de la tarea no se muestran.
- Bajo cada opción, la fecha resultante en forma legible (por ejemplo, «Sábado, 15 de noviembre»); si la tarea tiene hora, se indica que se conserva («a las 09:00»).

**Acciones y qué ocurre tras cada una:**
- **Mañana** o **La semana que viene**: la hoja se cierra, la tarea se mueve al grupo que corresponda en la lista y aparece un aviso breve «Tarea pospuesta a …» con la nueva fecha.
- **Elegir fecha**: abre el selector de fecha del sistema, que no admite fechas pasadas; al confirmar, ocurre lo mismo que arriba.
- Cerrar la hoja (botón atrás o tocar fuera) sin elegir: no cambia nada.

### 3. Acción «Posponer» en el formulario de edición

En el formulario de una tarea existente, junto a las acciones ya presentes (guardar y borrar), una acción **Posponer** que abre la misma hoja de opciones.

**Acciones:**
- Elegir una opción cierra la hoja y el formulario, y se vuelve a la lista con el aviso «Tarea pospuesta a …».

### 4. Aviso breve de resultado

- Éxito: «Tarea pospuesta a [fecha legible]».
- Error: «No se pudo posponer la tarea. Inténtalo de nuevo.»; la tarea vuelve a su sitio.

## Flujos

- Lista → Posponer → hoja → Mañana → lista con la tarea en «Mañana» y aviso.
- Lista (tarea atrasada) → Posponer → La semana que viene → la tarea pasa al grupo de ese lunes.
- Lista → Posponer → Elegir fecha → selector del sistema → lista con la tarea en su nuevo día.
- Formulario de edición → Posponer → opción → lista con aviso.

## Estados a cubrir

- Tarea con hora (se conserva) y sin hora.
- Tarea atrasada y tarea sin fecha (las opciones parten de hoy).
- Posponiendo (la tarea ya se ve en su nuevo sitio) y error (vuelve a su sitio con aviso).
- Tarea completada: no tiene acción Posponer.

## Reglas visibles

- Las opciones siempre se calculan a partir de **hoy**, nunca de la fecha antigua de la tarea.
- «Elegir fecha» no admite días pasados.
- Textos en español, tono cercano.
