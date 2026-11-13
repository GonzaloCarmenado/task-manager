# Prompt de Stitch — Spec 004 (bloqueo con huella)

> Pegar tal cual en Stitch. Solo describe funcionalidad: pantallas, datos, acciones, estados y flujos. La parte visual la decide Stitch con la guía de estilo que ya tiene como contexto.

---

Diseña las pantallas del bloqueo con huella de una app móvil Android de gestión de tareas gamificada para usuarios no profesionales. Usa la guía de estilo de la app y mantén la coherencia con las pantallas de arranque que ya generaste («Preparando la app» y «Algo no ha ido bien»). Esta petición es solo de **funcionalidad**: decide tú todo lo visual.

## Contexto de la funcionalidad

El usuario puede proteger la app con el lector de huellas (o el desbloqueo biométrico del móvil) para que nadie que coja su móvil vea sus tareas. Es **opcional**. No es un inicio de sesión: la app ya conoce al usuario; la huella solo decide si se muestra la app. No hay contraseñas ni cuentas.

Uso en vertical, con una mano. Debe contemplar modo claro y modo oscuro. El aviso de huella en sí (la hoja con el sensor) lo muestra el sistema Android; aquí se diseñan las pantallas de la app.

## Pantalla 1 — Oferta de activación

Se muestra **una sola vez al principio**, ya dentro de la app, cuando el móvil tiene huella registrada y el usuario aún no ha decidido.

- **Qué muestra**: un título que pregunta si quiere proteger la app con su huella y una explicación breve de para qué sirve («para que nadie vea tus tareas sin tu huella»). Tono cercano y sin presión.
- **Acciones** (tres, de igual importancia visible):
  1. **Activar**: pide la huella en ese momento para confirmarlo; si sale bien, el bloqueo queda activado y se vuelve a la app.
  2. **Ahora no**: se cierra y se volverá a preguntar la próxima vez que abra la app (como mucho tres veces).
  3. **No volver a preguntar**: se cierra y no se vuelve a ofrecer.
- **Reglas**: no bloquea el uso de la app; si el usuario cancela la huella al activar, la oferta se cierra sin activar nada y sin mostrar un error.

## Pantalla 2 — Pantalla de bloqueo

Cubre **toda la app** cuando el bloqueo está activo: al abrir la app y al volver después de más de 30 segundos en segundo plano. No debe dejar ver ningún dato de la app detrás.

- **Qué muestra**: un mensaje que indica que la app está protegida y una invitación a desbloquear con la huella.
- **Acciones**: un botón principal **«Desbloquear con huella»**, siempre visible, que vuelve a lanzar el aviso del sistema.
- **Estados**:
  1. **Esperando la huella**: el aviso del sistema se lanza solo al abrir; la pantalla muestra que está esperando.
  2. **Cancelado**: el usuario cerró el aviso. No es un error: se muestra solo el botón para repetirlo.
  3. **Huella no reconocida**: mensaje amable de que no se ha reconocido, con la posibilidad de volver a intentarlo.
  4. **Demasiados intentos**: el sistema ofrece usar el PIN, patrón o contraseña del móvil; la pantalla explica que puede usar ese método.
- **Qué ocurre tras desbloquear**: desaparece y se ve la app tal como estaba.
- **Reglas**: la pantalla de bloqueo puede aparecer también mientras la app prepara la sesión por debajo; en ese caso, tras desbloquear se ve lo que corresponda (carga, error o la app).

## Pantalla 3 — Aviso de bloqueo desactivado

Se muestra cuando el bloqueo se desactiva solo, porque el móvil ya no tiene huellas registradas o se ha quitado el bloqueo de pantalla del móvil. Evita que el usuario se quede sin acceso a su app.

- **Qué muestra**: un mensaje claro y sin alarmismo: «Hemos desactivado el bloqueo con huella porque ya no hay huellas registradas en tu móvil».
- **Acciones**: un único botón **«Entendido»** que cierra el aviso y deja entrar a la app.
- **Reglas**: no se vuelve a mostrar una vez cerrado; no pide ninguna huella.

## Flujo completo

- Primera vez con huella disponible → Pantalla 1 (oferta)
  - Activar → huella → bloqueo activado → app
  - Ahora no / No volver a preguntar → app
- Con bloqueo activado, al abrir o volver tras 30 s → Pantalla 2 (bloqueo)
  - huella correcta → app
  - cancelado / no reconocido → Pantalla 2 con su estado
  - demasiados intentos → PIN, patrón o contraseña del móvil → app
- Si desaparecen las huellas → Pantalla 3 (aviso) → app sin bloqueo

## Estados a cubrir

Oferta · esperando la huella · cancelado · huella no reconocida · demasiados intentos · aviso de bloqueo desactivado · desbloqueo correcto.

## Accesibilidad funcional

Todos los textos legibles con un lector de pantalla; el estado de espera se anuncia. Los botones deben ser alcanzables con una mano.

## Lo que NO quiero en este diseño

Ningún campo de texto, ni teclado numérico propio para el PIN (lo gestiona el sistema), ni contraseñas, ni formularios de registro o inicio de sesión, ni menús ni ajustes. Solo estas tres pantallas y sus estados.
