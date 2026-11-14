# Prompt para Stitch — Spec 008 (Gamificación: XP, niveles y rachas)

> Solo funcionalidad: pantallas, datos, acciones, estados y flujos. Nada de estilos (los decide Stitch con la guía que ya tiene). Borrador previo al `/clarify`: se ajustará si el clarify cambia algo.

---

## Contexto

Aplicación móvil Android, en vertical y para usarse con una mano, para gestionar tareas personales. Es para usuarios no profesionales y su espíritu es desenfadado: debe dar ganas de volver a marcar otra tarea como hecha. Ya existen la lista de tareas y el formulario. Esta spec añade la parte de juego: experiencia (XP), niveles y rachas de días.

## Objetivo

Que completar tareas se sienta como un logro. Cada tarea completada da 10 XP, la XP sube de nivel y completar al menos una tarea cada día crea una racha. No hay tienda, logros ni clasificaciones.

## Pantallas

### 1. Resumen de progreso en la lista de tareas

Una franja compacta en la parte superior de la lista de tareas.

**Muestra:**
- El nivel actual, una barra de progreso hasta el siguiente nivel (con «X / Y XP») y la racha actual en días.

**Acciones:**
- Tocar la franja abre la pantalla de progreso (pantalla 3).

### 2. Celebración al completar una tarea

Aparece al marcar una tarea como hecha; es breve y no bloquea la lista.

**Muestra:**
- «+10 XP» y, si es la primera tarea del día, la racha actualizada («Llevas N días»).
- La barra de progreso del resumen avanza.

**Acciones:**
- No requiere ninguna: se va sola en un segundo y no impide seguir tocando la lista. Respeta la opción de «reducir animaciones» del sistema.

### 3. Pantalla de progreso

**Muestra:**
- Nivel actual y XP total acumulada.
- Cuánta XP falta para el siguiente nivel, con la barra de progreso.
- Racha actual y mejor racha histórica, en días.
- Para un usuario nuevo (nivel 1, 0 XP, racha 0): un mensaje amistoso que invita a completar la primera tarea.

**Acciones:**
- Volver a la lista (botón atrás del sistema y un control claro de cerrar).

### 4. Pantalla de subida de nivel

Aparece cuando una tarea completada cruza el umbral de un nivel.

**Muestra:**
- El nuevo nivel y un mensaje de enhorabuena.

**Acciones:**
- Cerrar con un toque o con el botón atrás; vuelve a la lista.

## Flujos

- Lista → marcar tarea como hecha → celebración «+10 XP» (y racha si es la primera del día) → resumen actualizado.
- Lista → marcar tarea que sube de nivel → celebración → pantalla de subida de nivel → cerrar → lista.
- Lista → tocar el resumen → pantalla de progreso → atrás → lista.
- Desmarcar una tarea le quita su XP (y puede quitar ese día de la racha); volver a completarla vuelve a darlo.

## Estados a cubrir

- **Usuario nuevo**: nivel 1, 0 XP, racha 0.
- **Cargando** el progreso: indicador en el resumen, sin bloquear la lista.
- **Error o sin conexión**: se muestra el último dato conocido de esta apertura, o un mensaje con **Reintentar**; la lista sigue funcionando.
- **Racha viva sin completar hoy**: se indica que aún se puede mantener hoy.
- **Racha rota** por pasar un día sin completar nada: vuelve a 0, sin dramatismo; la mejor racha y la XP se conservan.
- **Tope diario alcanzado** (100 XP hoy): la celebración dice «Hoy ya has llegado al tope de XP» en lugar de «+10 XP»; la pantalla de progreso muestra «XP de hoy: X / 100».
- **Desmarcar una tarea**: el aviso indica «−10 XP» y el resumen se actualiza.
- **Celebración con reducir animaciones**: versión estática.

## Reglas visibles

- 10 XP por tarea completada, con un tope de 100 XP al día.
- Desmarcar una tarea le quita su XP (el nivel se recalcula y puede bajar); volver a completarla vuelve a darlo.
- Un día cuenta para la racha si se completa al menos una tarea ese día (fecha local del móvil).
- Posponer una tarea no da ni quita XP. Cuando se alcanza el tope diario se dice con un mensaje amable (la tarea se completa igualmente y cuenta para la racha).
- Sin sonido ni vibración.
- Textos en español, tono cercano y animado, sin presión.
