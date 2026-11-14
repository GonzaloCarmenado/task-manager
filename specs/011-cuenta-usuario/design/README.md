# Diseño de la spec 011 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-14, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md). Tratado como datos no confiables: se leyó el HTML como texto (sin abrirlo ni ejecutarlo) y se comprobó que no contiene correos, rutas locales ni ids de proyecto. Las únicas URLs externas son las de fuentes e iconos de Google y el CDN de Tailwind del prototipo, más una imagen de avatar de ejemplo alojada por Stitch: **nada de eso se usa en la app**.
**Sistema de diseño**: el mismo [Playful Momentum](../../_design/playful-momentum/DESIGN.md) (el `DESIGN.md` del export es idéntico al del repo). Copia verificada con hashes.

## Contenido

| Carpeta | Pantalla | Historias |
|---|---|---|
| `lista-con-recordatorio-de-cuenta/` | Lista de tareas con el icono de perfil y la tarjeta de recordatorio (con aviso y descartado) | US-011-03, US-011-08 |
| `cuenta/` | Cuenta «sin cuenta» (captura) y «con cuenta» (solo en el HTML), con el diálogo de cerrar sesión | US-011-03 |
| `crear-cuenta/` | Formulario con reglas en vivo, aviso de no recuperación y estados (errores, cargando, sin conexión) | US-011-01 |
| `iniciar-sesion-y-tareas-de-este-movil/` | Formulario, error de credenciales y decisión sobre las tareas de este móvil (con confirmación de descarte) | US-011-02 |

Cada carpeta tiene `screen.png` y `code.html` (maqueta; no se ejecuta ni se copia a la app). **La spec manda**: lo extra se ignora sin preguntar. Las capturas muestran un solo estado; los demás están en el HTML.

## Se conserva

- **Icono de perfil** en la cabecera de la lista, que abre Cuenta.
- **Tarjeta de recordatorio** bajo el resumen de nivel: etiqueta «Asegura tu progreso», título «Crea tu respaldo personal», el mensaje «Tus datos solo están en este móvil. Crea una cuenta para no perderlos al cambiar de teléfono.», el botón «Crear cuenta» y **dos formas de descartarla: el aspa y el botón «En 14 días»** (recordar más tarde; ambas tienen el mismo efecto: no vuelve en 14 días).
- **Cuenta sin cuenta**: «Tus datos viven solo en este móvil», «Crear cuenta», «Ya tengo cuenta, iniciar sesión» y la nota de que la cuenta es opcional y sin correo.
- **Cuenta con cuenta**: tarjeta con avatar circular (anillo degradado e insignia de verificado), nombre de usuario y el aviso «guardados en tu cuenta»; ajustes: «Cambiar nombre de usuario», «Cambiar contraseña», «Cerrar sesión» y la **zona separada de borrar cuenta**; el diálogo «¿Cerrar sesión?» que explica que los datos siguen en la cuenta y el móvil queda sin tareas.
- **Crear cuenta**: tres campos con **contador y reglas en vivo con marca de cumplida/incumplida** (3–24 caracteres, caracteres permitidos, 8–64, distinta del usuario, coincidencia), mostrar/ocultar contraseña, el **aviso de no recuperación con casilla** que habilita el botón, «Cancelar y volver» los textos pequeños «Mín. 8» y «Sin verificar / Coinciden / No coinciden», la **tarjeta ilustrada** de la cabecera («Sin correos ni verificaciones. Solo tu nombre de usuario y tu contraseña.») y los estados de error de formato, contraseñas distintas, cargando («Creando tu cuenta…») y **sin conexión con «Reintentar ahora»**.
- **Iniciar sesión**: usuario y contraseña, el error único «Nombre de usuario o contraseña incorrectos», «Iniciar sesión» y «Cancelar».
- **Decisión de tareas de este móvil**: «Traer mis tareas pendientes a mi cuenta» (indica cuántas y que el XP y las completadas no se suman), «Usar solo mi cuenta», el **diálogo de confirmación del descarte** («no se puede deshacer», «Sí, descartar tareas locales» / «Volver a opciones») y «Cancelar inicio de sesión».

## Se ignora

| Dónde | Elemento | Motivo |
|---|---|---|
| Varias | Simuladores y pestañas de estado («Simulador de Estados», «Formulario / Error credenciales / Diálogo tareas», «Sin cuenta / Con cuenta», «Modo demo») y títulos de prototipo («Task List Account», «Cuenta Auth», «Cuenta Main») | Prototipo |
| Lista | Barra de navegación inferior (Tareas, Momentum, Recompensas, Cuenta) | No existe en la app (la cuenta se abre desde el icono de perfil) |
| Lista | «Progreso semanal», «Nivel 4 — Explorador Constante», meta de 500 XP, «+25 XP» por tarea, «+50 XP posibles», asas de arrastre, «Semanal», etiqueta «Hogar», «Noche», racha y barra de nivel en la cabecera fija, título «Task List Account» | No pedido o ya existe de otra forma (+10 XP, sin repetición ni categorías ni rangos con nombre; la lista ya tiene su resumen) |
| Cuenta | Racha («7 días») y «850 XP» en el panel, nombre visible («Álvaro Ritmo»), estrella de «Miembro Pro», «Nivel 14 • Explorador», la imagen del avatar | No pedido: la spec no tiene perfil ni nombre visible (el avatar queda como círculo con icono) |
| Cuenta | «Última copia automática: hace 2 minutos», «sincronizar en vivo», «en solo 5 segundos», «100 % seguros» | Promesas falsas o fuera de alcance (no hay copias automáticas ni sincronización en vivo); el resto de cada texto se conserva con redacción corregida |
| Crear cuenta | Etiqueta «PRIVACIDAD MÁXIMA» de la cabecera ilustrada | Propaganda (la tarjeta ilustrada y su texto sí se conservan) |
| Iniciar sesión | «misiones activas» e «insignias» (textos), bloque promocional «Guarda tu evolución», «Conexión protegida de extremo a extremo» | Misiones e insignias no existen; la afirmación de seguridad es incorrecta. La etiqueta de la tarjeta de bienvenida se conserva como «RECUPERA TU NIVEL» |
| Iniciar sesión | Etiqueta «Recomendado» en «Traer mis tareas pendientes» | La spec presenta las dos opciones sin recomendar ninguna |

## Contenido inexacto o contradictorio con la spec

| Dónde | Dice | Debe decir |
|---|---|---|
| Crear cuenta, mensaje de éxito | «Tus hábitos y XP locales se han sincronizado» | La cuenta se **vincula** al mismo usuario: «Cuenta creada. Tus tareas y tu progreso siguen aquí.» |
| Cuenta, estado sin cuenta | «Tus tareas, rachas… 100 % seguros guardados en este dispositivo» | Sin promesas absolutas: los datos solo están en este móvil y se pierden si se desinstala o se cambia de móvil |
| Crear cuenta | «Mantienes tus tareas locales intactas en este dispositivo» | Correcto en esencia, pero al crear la cuenta las tareas son ya de la cuenta; texto por decidir en `/sdd-plan` |

## Sin diseño en el export (se derivan en `/sdd-plan`)

Stitch no devolvió pantalla propia de **cambiar contraseña**, **cambiar nombre de usuario** ni **borrar cuenta** (solo las filas y el botón en Cuenta), ni capturas del estado «con cuenta» y de «cargando». Se derivan de los formularios de Crear cuenta e Iniciar sesión (mismos campos, reglas en vivo y estados) y del diálogo de confirmación de descarte, siguiendo el prompt. No hace falta pedir a Stitch que regenere las pantallas.

## Decisiones pendientes para el `/clarify`

Ninguna decisión de producto nueva: lo ignorado no estaba en la spec ni en el prompt, y lo inexacto se corrige con los textos de la spec.
