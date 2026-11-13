# Prompt de ajuste para Stitch — Spec 003

> Pegar en Stitch sobre las dos pantallas ya generadas. Solo funcionalidad y contenido; lo visual lo sigue decidiendo Stitch.

---

Ajusta las dos pantallas de arranque que generaste («Preparando la app» y «Algo no ha ido bien»). Mantén tu estilo visual; solo cambia el contenido y la funcionalidad así:

## Pantalla «Preparando la app»

- Quita la barra de progreso con porcentaje, los tres pasos (Identidad, Misiones, Espacio XP) y el texto «Creando misiones de primer día…». No hay un progreso real que mostrar: usa un indicador de carga **indeterminado** (que indique que hay algo en marcha, sin porcentaje ni pasos).
- Quita «Todo listo en 3 segundos» y cualquier promesa de tiempo.
- Quita el «+50 XP», la «Racha de bienvenida», «Nivel 1 Activo» y «0 tareas vencidas». En este momento el usuario todavía no tiene nada de eso.
- Quita «100 % Anónimo · En tu dispositivo» y «Sin cuenta bancaria ni registros». Si quieres dejar un texto de apoyo, que sea cierto y breve, por ejemplo: «Sin registro: empiezas ya».
- Quita la barra superior con «MODO RÁPIDO» y el selector «Claro», y la tarjeta «Herramienta de prueba · Simular fallo». Son de prototipo y no van en la app.
- Deja el título y el mensaje amable que explican que se está preparando el espacio del usuario.

## Pantalla «Algo no ha ido bien»

- Quita la barra superior «System Recovery» (con la flecha de volver y el avatar): en el arranque no hay navegación ni perfil. Si hace falta una cabecera, que sea solo el contenido del error, en español.
- Quita el «Simulador de estados», las pastillas para cambiar de variante y el botón «Modo Oscuro»: son de prototipo.
- Quita el recuadro «Tus avances siguen a salvo · No has perdido ningún dato ni racha». No es cierto en el primer arranque.
- La línea «Comprobando conexión automáticamente…» solo debe aparecer en las variantes **Sin conexión**, **Tarda más de lo normal** y **Servicio no disponible**, y no en **Demasiados intentos** ni **Error inesperado**.
- Mantén el botón principal **Reintentar** y las cinco variantes: Sin conexión, Demasiados intentos, Servicio no disponible, Tarda más de lo normal y Error inesperado.
- Entrégame cada variante como una pantalla separada, no como un simulador interactivo.
