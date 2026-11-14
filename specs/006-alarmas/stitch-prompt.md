# Prompt para Stitch — Spec 006 (Alarmas de tareas)

> Solo funcionalidad: pantallas, datos, acciones, estados y flujos. Nada de estilos (los decide Stitch con la guía que ya tiene). Borrador previo al `/clarify`: se ajustará si el clarify cambia algo.

---

## Contexto

Aplicación móvil Android, en vertical y para usarse con una mano, para gestionar tareas personales (usuarios no profesionales). Cada tarea tiene un título, una fecha opcional y una hora opcional. Ya existen la lista de tareas y el formulario para crear y editar tareas. No hay registro de usuarios.

## Objetivo

Que el móvil avise al usuario, con una notificación del sistema, a la hora exacta de una tarea que tenga fecha y hora, aunque la app esté cerrada. Hay que diseñar solo lo nuevo: el aviso previo para pedir el permiso de notificaciones, los estados cuando las alarmas están desactivadas, y cómo se ve la notificación.

## Pantallas

### 1. Aviso previo de permiso de notificaciones

Aparece **la primera vez que el usuario guarda una tarea con hora**, antes de la petición del sistema; nunca al abrir la app.

**Muestra:**
- Un icono de aviso, el título «Te avisamos a tu hora» y una explicación breve: «Para avisarte a la hora de tus tareas, necesitamos permiso para enviarte notificaciones.»

**Acciones:**
- **Permitir**: lanza la petición de permiso del sistema; si el usuario acepta, la alarma de esa tarea queda programada y se vuelve a la lista.
- **Ahora no**: cierra el aviso; la tarea queda guardada sin alarma y se muestra el aviso de alarmas desactivadas (pantalla 2). Este aviso previo vuelve a mostrarse la próxima vez que se guarde una tarea con hora, hasta 3 veces en total; después ya no se vuelve a pedir y solo queda el aviso discreto de la pantalla 2.

### 2. Aviso de «alarmas desactivadas»

Aviso discreto, no bloqueante, que aparece en la lista cuando hay tareas con hora y el permiso no está concedido, y en el formulario si la tarea que se guarda tiene hora.

**Muestra:**
- Un mensaje: «Las alarmas están desactivadas, así que no te avisaremos a la hora.»

**Acciones:**
- **Activar alarmas**: lleva a los ajustes de notificaciones del sistema.
- **Cerrar**: oculta el aviso hasta que cambie algo (no se vuelve a mostrar en esa sesión).
- Al volver de los ajustes con el permiso concedido, el aviso desaparece solo.

### 3. Aviso de alarmas exactas (solo si el sistema lo exige)

Hoja breve que explica que, para sonar a la hora exacta, hace falta permitir las «alarmas y recordatorios» en los ajustes del móvil.

**Acciones:**
- **Ir a ajustes**: abre ese ajuste del sistema.
- **Ahora no**: cierra; el aviso funcionará con la mejor precisión posible y se indica que puede retrasarse unos minutos.

### 4. La notificación

Lo que ve el usuario fuera de la app, a la hora de la tarea.

**Muestra:**
- Título: el de la tarea. Texto: «Es la hora» y la hora de la tarea.
- Nada de puntos, rachas ni datos de la cuenta.

**Acciones:**
- Tocarla abre la app en esa tarea (la del formulario de edición). Si la app está bloqueada con huella, primero pide desbloquear.

### 5. Indicador de alarma en las tareas de la lista

En cada tarea con hora que tenga alarma programada, un pequeño indicador de que «avisará a su hora»; en las que tienen hora pero no alarma (permiso denegado), un indicador distinto de «sin alarma».

## Flujos

- Formulario → guardar tarea con hora (primera vez) → aviso previo → Permitir → permiso del sistema → lista con alarma programada.
- Formulario → guardar tarea con hora → Ahora no → lista con aviso de alarmas desactivadas.
- Lista → aviso de alarmas desactivadas → Activar alarmas → ajustes del sistema → volver → aviso oculto.
- Notificación → tocar → (desbloqueo si hace falta) → formulario de esa tarea.

## Estados a cubrir

- Permiso concedido, denegado, aún sin pedir y no disponible (en navegador no hay alarmas y no se muestra nada).
- Alarma programada, sin alarma (denegado), sin hora (no hay indicador).
- Tarea completada o borrada: sin indicador.

## Reglas visibles

- El permiso se pide solo al guardar una tarea con hora, nunca al abrir la app.
- Tareas sin hora, sin fecha, completadas o con hora pasada no tienen alarma.
- Textos en español, tono cercano.
