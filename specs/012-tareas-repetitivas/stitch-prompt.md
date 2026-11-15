# Prompt de Stitch — 012 Tareas repetitivas

> Pegar tal cual en Stitch. Solo funcionalidad; el estilo lo decide Stitch con la guía de estilo ya compartida.

---

## Contexto

Es una aplicación móvil de Android, en vertical y pensada para usarse con una mano, para gestionar tareas diarias con un toque de juego (puntos de experiencia, niveles y rachas de días). Ya existen: la lista de tareas agrupadas por día, el formulario para crear y editar una tarea (título, fecha opcional y hora opcional), la acción de completar una tarea con un toque, posponerla y borrarla.

## Objetivo de esta feature

Que una tarea pueda **repetirse sola**: todos los días, ciertos días de la semana, cada cierto número de días o semanas, o un día fijo del mes, con una fecha de fin opcional. Al completar una ocurrencia aparece la siguiente.

Hay que diseñar solo lo nuevo: la sección de repetición del formulario, la pantalla o hoja de ajuste de repetición, el indicador en la lista y las hojas de confirmación al editar o borrar. Las pantallas existentes se muestran únicamente donde cambian.

---

## Pantallas

### 1. Formulario de tarea con repetición (crear y editar)

Es el formulario actual con una nueva fila «Repetir» debajo de la fecha y la hora.

- **Muestra**: título, fecha, hora (todo ya existente) y la fila «Repetir» con el valor actual: «No se repite» (por defecto), «Todos los días», «Lun, jue», «Cada 2 semanas», «El día 15 de cada mes», etc. Si hay fecha de fin, se añade «hasta 30 jun».
- **Acciones**:
  - Tocar la fila «Repetir» abre la pantalla 2.
  - Guardar y cancelar, como hoy.
- **Reglas visibles**:
  - Sin fecha, la fila «Repetir» está desactivada y explica el motivo («Elige una fecha para repetir la tarea»).
  - Si se quita la fecha de una tarea con repetición, la repetición vuelve a «No se repite» y se avisa.
- **Al editar una tarea que ya se repite**: la fila muestra la regla actual. Al guardar se abre la pantalla 5 (elegir «Solo esta» o «Toda la serie»).
- **Estados**: sin repetición, con repetición, desactivada por falta de fecha, error de guardado (mismo que hoy).

### 2. Ajuste de repetición (hoja inferior)

Se abre desde la fila «Repetir».

- **Muestra**: las opciones de repetición como lista de elección única:
  - No se repite
  - Todos los días
  - Días de la semana
  - Cada N días
  - Cada N semanas
  - Un día del mes
- **Según la opción elegida** aparece debajo su configuración (ver pantalla 3).
- Debajo, el ajuste «Termina»: «Nunca» (por defecto) o «El día…» con selector de fecha.
- Un resumen en lenguaje natural de lo elegido («Se repetirá los lunes y jueves, hasta el 30 de junio») y el texto «Primera ocurrencia: jueves 19 de noviembre».
- **Acciones**: «Listo» aplica y vuelve al formulario; cerrar o atrás descarta los cambios y vuelve al formulario.
- **Reglas**: «Listo» no está disponible si la configuración es inválida (ver pantalla 3 y estados).

### 3. Configuración por tipo de repetición (dentro de la pantalla 2)

- **Todos los días**: sin ajustes adicionales.
- **Días de la semana**: siete botones, de lunes a domingo, de selección múltiple. Si no hay ninguno marcado se muestra «Elige al menos un día» y no se puede aplicar.
- **Cada N días**: un selector numérico de 1 a 30.
- **Cada N semanas**: un selector numérico de 1 a 30 y los siete botones de día de la semana.
- **Un día del mes**: un selector del 1 al 31. Si se elige 29, 30 o 31, un aviso dice: «En los meses que no tengan ese día, será el último día del mes».
- **Termina**: si la fecha de fin es anterior a la primera ocurrencia, se muestra el error «La fecha de fin no puede ser anterior a la primera ocurrencia» y no se puede aplicar.

### 4. Lista de tareas con repetición

Es la lista actual, con cambios en cada tarea:

- Las tareas repetitivas muestran un icono de repetición y un texto corto con la regla («Todos los días», «Lun, jue», «Cada 2 semanas», «El día 15 de cada mes»), además del título, hora y demás datos de hoy. El indicador debe entenderse sin depender del color.
- Una **ocurrencia con fecha posterior a hoy** se muestra, pero su acción de completar está desactivada, con una indicación de que se podrá completar a partir de su día («Disponible el jueves»).
- Una **ocurrencia atrasada** se muestra como cualquier tarea atrasada, con su indicador de repetición.
- **Acciones** (las existentes): completar, posponer, editar, borrar.
- **Tras completar** una ocurrencia: queda completada (con sus puntos) y aparece la siguiente en su día, con un aviso breve: «Hecho. Próxima: jueves 19 de noviembre».
- **Tras completar la última ocurrencia** de una serie que termina (por fecha de fin): aviso «Hecho. Era la última repetición».
- **Posponer** una ocurrencia mueve solo esa ocurrencia (el resto de la serie no cambia).
- **Estados**: lista vacía, carga, error (los de hoy), sin conexión (los de hoy).

### 5. Hoja «¿Qué quieres cambiar?» al editar

Aparece al guardar la edición de una tarea repetitiva.

- **Muestra**: título «Esta tarea se repite» y dos opciones:
  - «Solo esta»: el cambio afecta únicamente a esta ocurrencia; la repetición no cambia.
  - «Toda la serie»: el cambio afecta al título, la hora y la regla de repetición de la serie.
- **Acciones**: elegir una opción aplica el cambio y vuelve a la lista; cancelar vuelve al formulario sin guardar.
- Si no se ha cambiado nada que afecte a la serie, no aparece.

### 6. Hoja «¿Qué quieres borrar?» al borrar

Aparece al borrar una tarea repetitiva.

- **Muestra**: título «Esta tarea se repite» y dos opciones:
  - «Solo esta»: se borra esta ocurrencia y aparece la siguiente en su día.
  - «Toda la serie»: se borra la ocurrencia pendiente y la tarea deja de repetirse. Aviso: «Las ocurrencias ya completadas se conservan».
- **Acciones**: elegir una opción borra y vuelve a la lista con un aviso; cancelar cierra la hoja sin borrar.
- Borrar una tarea que no se repite sigue funcionando como hoy, sin esta hoja.

---

## Flujos

1. **Crear**: Lista → «Nueva tarea» → Formulario (título + fecha) → fila «Repetir» → Ajuste de repetición → «Listo» → Formulario → Guardar → Lista con la tarea en la fecha de su primera ocurrencia.
2. **Completar**: Lista → completar la ocurrencia de hoy → aviso «Hecho. Próxima: …» → la siguiente aparece en su día, con completar desactivado hasta entonces.
3. **Editar**: Lista → editar → Formulario → cambiar → Guardar → hoja «Solo esta / Toda la serie» → Lista.
4. **Borrar**: Lista → borrar → hoja «Solo esta / Toda la serie» → Lista con aviso.
5. **Cambiar la repetición de una tarea ya creada**: Editar → fila «Repetir» → Ajuste → «Listo» → Guardar → hoja «Solo esta / Toda la serie» (si se elige «Solo esta», la regla no cambia).
6. El botón atrás de Android cierra la hoja o pantalla de encima (ajuste de repetición, hojas de elección) antes de salir del formulario.

## Estados a cubrir

- Formulario: sin repetición, con repetición, repetición desactivada por falta de fecha, error de guardado.
- Ajuste: cada tipo de repetición con su configuración, configuración inválida (sin días, fecha de fin anterior), resumen y primera ocurrencia.
- Lista: ocurrencia de hoy, atrasada, futura con completar desactivado, serie terminada.
- Sin conexión: los mismos avisos que ya existen para guardar y completar.

## Reglas

- Repetir exige una fecha; la hora es opcional.
- Solo hay una ocurrencia pendiente por serie.
- Las ocurrencias futuras no se pueden completar hasta su día.
- Cada N días y cada N semanas: N entre 1 y 30. Día del mes: del 1 al 31.
- «Días de la semana» necesita al menos un día marcado.
- La fecha de fin no puede ser anterior a la primera ocurrencia.
- Todos los textos en español.
- Móvil: todas las zonas de toque cómodas para un pulgar, el teclado virtual no debe tapar el campo activo ni el botón principal, y la hoja de ajuste se puede cerrar con el botón atrás.

## Fuera de esta feature (no diseñar)

- Calendario o vista mensual de ocurrencias futuras.
- Saltar una ocurrencia sin completarla y terminar tras un número de repeticiones.
- Estadísticas de cumplimiento por serie.
