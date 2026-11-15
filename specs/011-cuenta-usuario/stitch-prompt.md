# Prompt para Stitch — Spec 011: Cuenta de usuario

> Pegar tal cual en Stitch. Solo describe funcionalidad: nada de colores, tipografías, tamaños, espaciados, formas ni estilos. Eso lo decide Stitch con la guía de estilo que ya tiene.

---

## Contexto de la app

Aplicación móvil Android (uso en vertical y con una mano) para gestionar tareas con un toque de juego: cada tarea completada da experiencia (XP), hay niveles y rachas de días. Hoy la app abre directamente en la **lista de tareas**, que tiene arriba un resumen de nivel, XP y racha, las tareas agrupadas por día, una sección de completadas y un botón flotante «Nueva tarea». La app funciona **sin cuenta** desde el primer momento (los datos viven solo en el móvil) y así debe seguir siendo.

## Objetivo de esta feature

Poder **crear una cuenta** (nombre de usuario y contraseña, **sin correo**) para no perder las tareas ni el progreso al cambiar de móvil, **iniciar sesión** en esa cuenta desde otro móvil y **gestionarla**. Todo es opcional: nunca se obliga a tener cuenta.

Diseña estas pantallas y componentes, con textos en español:

## Pantallas

### 1. Icono de perfil en la lista de tareas
- Un acceso a «Cuenta» en la cabecera de la lista de tareas (junto al título «Tareas»).
- Acción: abre la pantalla Cuenta.

### 2. Tarjeta de recordatorio en la lista (componente, no pantalla)
- Aparece en la lista, debajo del resumen de nivel, **solo después de completar la primera tarea** y solo si la persona no tiene cuenta.
- Muestra un mensaje breve: «Tus datos solo están en este móvil. Crea una cuenta para no perderlos.»
- Acciones: «Crear cuenta» (abre Crear cuenta) y una forma de **descartarla**. Una vez descartada no vuelve a aparecer en 14 días.
- No debe ocupar mucho ni tapar las tareas.

### 2 bis. Pantalla «Cuenta» — sin cuenta
- Título «Cuenta» y una forma de volver a la lista.
- Texto que explica que no hay cuenta y que los datos están solo en este móvil.
- Acciones: «Crear cuenta» y «Iniciar sesión».

### 3. Pantalla «Cuenta» — con cuenta
- Título «Cuenta» y una forma de volver a la lista.
- Muestra el **nombre de usuario** de la persona.
- Acciones (cada una abre su pantalla o diálogo): «Cambiar contraseña», «Cambiar nombre de usuario», «Cerrar sesión» y «Borrar cuenta». «Borrar cuenta» se presenta como acción destructiva y separada de las demás.

### 4. Crear cuenta
- Campos: **nombre de usuario**, **contraseña**, **repetir contraseña**. Cada campo muestra su problema justo debajo cuando lo hay. La contraseña se puede mostrar u ocultar.
- Debajo, un **aviso importante** con una casilla obligatoria: «Si olvidas tu contraseña no podremos recuperar tu cuenta. Entiendo que no hay forma de recuperarla.»
- Acción principal: «Crear cuenta», deshabilitada mientras haya errores o la casilla no esté marcada. Acción secundaria: cancelar / volver.
- Tras crearla, vuelve a la pantalla Cuenta (ya con cuenta) con un mensaje breve de confirmación y sin perder las tareas ni el progreso.
- Estados: cargando (creando la cuenta), nombre de usuario no disponible, errores de validación por campo, sin conexión (con «Reintentar», conservando lo escrito).

### 5. Iniciar sesión
- Campos: **nombre de usuario** y **contraseña** (mostrar/ocultar).
- Acción principal: «Iniciar sesión». Acción secundaria: cancelar / volver (la persona sigue sin cuenta, sin cambios).
- No hay «He olvidado mi contraseña»: no existe recuperación y esto debe ser evidente en el diseño (ningún enlace ni botón de recuperar).
- Estados: cargando, credenciales incorrectas (mensaje siempre igual: «Nombre de usuario o contraseña incorrectos»), demasiados intentos («Demasiados intentos. Espera unos minutos.»), sin conexión (con «Reintentar»).

### 6. Qué hacer con las tareas de este móvil (decisión al iniciar sesión)
- Solo aparece cuando la persona inicia sesión en una cuenta existente **y** este móvil tiene tareas sin cuenta.
- Explica la situación: «Este móvil tiene tareas sin cuenta. ¿Qué quieres hacer con ellas?»
- Dos opciones claras, con una breve explicación cada una:
  - «Traer mis tareas pendientes a mi cuenta» — muestra cuántas tareas pendientes se traerán; aclara que el XP y las tareas ya completadas de este móvil no se suman.
  - «Usar solo mi cuenta» — aclara que las tareas de este móvil se descartarán.
- Elegir «Usar solo mi cuenta» abre antes un **diálogo de confirmación** que dice que no se puede deshacer, con «Descartar tareas de este móvil» y «Volver».
- Acción adicional: cancelar (no inicia sesión y no cambia nada).
- Estado: cargando mientras se traen las tareas; error con «Reintentar».

### 7. Confirmar «Cerrar sesión» (diálogo)
- Pregunta: «¿Cerrar sesión?» Explica que los datos siguen guardados en la cuenta y que este móvil quedará sin cuenta y sin tareas.
- Acciones: «Cerrar sesión» y «Cancelar».
- Tras confirmar, vuelve a la lista de tareas (vacía, sin cuenta).

### 8. Cambiar contraseña
- Campos: **contraseña actual**, **contraseña nueva**, **repetir contraseña nueva** (mostrar/ocultar). Problemas bajo cada campo.
- Acción principal: «Cambiar contraseña». Acción secundaria: cancelar / volver.
- Tras el cambio, vuelve a Cuenta con un mensaje de confirmación; la sesión sigue abierta.
- Estados: cargando, contraseña actual incorrecta, contraseña nueva no válida o igual a la actual, sin conexión.

### 9. Cambiar nombre de usuario
- Campos: **nombre de usuario nuevo** y **contraseña** (para confirmar).
- Acción principal: «Guardar». Acción secundaria: cancelar / volver.
- Tras guardar, vuelve a Cuenta mostrando el nombre nuevo.
- Estados: cargando, nombre no disponible, nombre no válido, contraseña incorrecta, sin conexión.

### 10. Borrar cuenta
- Explica con claridad qué se borra (la cuenta, las tareas y el progreso) y que **no se puede deshacer**.
- Campo: **contraseña**. Casilla de confirmación: «Entiendo que se borrarán mi cuenta y todos mis datos para siempre.»
- Acción principal destructiva: «Borrar mi cuenta», deshabilitada hasta marcar la casilla y escribir la contraseña. Acción secundaria: cancelar / volver.
- Tras borrar, vuelve a la lista de tareas (vacía, sin cuenta) con un mensaje breve.
- Estados: cargando (borrando), contraseña incorrecta, error sin borrar nada («No se ha borrado nada. Inténtalo de nuevo.»), sin conexión.

## Flujos de navegación

- Lista de tareas → icono de perfil → **Cuenta** (sin cuenta o con cuenta). Volver → lista.
- Tarjeta de recordatorio → **Crear cuenta**.
- Cuenta (sin cuenta) → **Crear cuenta** → (éxito) Cuenta (con cuenta).
- Cuenta (sin cuenta) → **Iniciar sesión** → (si hay tareas sin cuenta en este móvil) **Qué hacer con las tareas** → (éxito) lista de tareas con los datos de la cuenta; si no hay tareas sin cuenta, va directamente a la lista.
- Cuenta (con cuenta) → **Cambiar contraseña** / **Cambiar nombre de usuario** → (éxito) Cuenta.
- Cuenta (con cuenta) → **Cerrar sesión** → diálogo → (confirmar) lista de tareas sin cuenta.
- Cuenta (con cuenta) → **Borrar cuenta** → (confirmar) lista de tareas sin cuenta.
- El botón atrás de Android vuelve siempre a la pantalla anterior sin perder lo escrito en formularios.

## Estados a cubrir en todas las pantallas con formulario

- Vacío (campos sin rellenar, con botón principal deshabilitado), con errores de validación, cargando (el botón principal indica que está trabajando y no se puede pulsar dos veces), error del servidor / sin conexión con «Reintentar», y éxito.
- En todos los campos de contraseña: opción de mostrar u ocultar.
- El teclado virtual no debe tapar ni el campo en uso ni el botón principal.

## Reglas visibles

- **Nombre de usuario**: de 3 a 24 caracteres; solo letras minúsculas, números, punto, guion y guion bajo; no distingue mayúsculas (se guarda en minúsculas); debe ser único. Mensajes: «Usa entre 3 y 24 caracteres», «Solo letras, números, punto, guion y guion bajo», «Nombre de usuario no disponible».
- **Contraseña**: de 8 a 64 caracteres y distinta del nombre de usuario. Mensajes: «Usa al menos 8 caracteres», «No puede tener más de 64 caracteres», «No puede ser igual que tu nombre de usuario», «Las contraseñas no coinciden».
- **No hay correo electrónico en ninguna pantalla**, ni verificación, ni recuperación de contraseña.
- Al iniciar sesión, el error es siempre el mismo (no revela si el usuario existe).
- Ninguna contraseña se muestra salvo que la persona lo pida.
- La cuenta nunca es obligatoria: toda pantalla de cuenta permite volver sin cambios.
