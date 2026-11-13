# Diseño de la spec 004 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-13, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md).
**Sistema de diseño**: el mismo [Playful Momentum](../../_design/playful-momentum/DESIGN.md) de la spec 003 (el `DESIGN.md` del export es idéntico, no se duplica).

## Contenido

| Carpeta | Pantalla | Historia |
|---|---|---|
| `oferta-de-activacion/` | Oferta de activación (Activar / Preguntarme más tarde / No volver a preguntar) | US-004-01 |
| `pantalla-de-bloqueo/` | Pantalla de bloqueo con sus estados (esperando, pausado, no reconocida, demasiados intentos) | US-004-02 y US-004-03 |
| `aviso-de-bloqueo-desactivado/` | Aviso de que el bloqueo se desactivó solo | US-004-03 CA 3 |

Cada carpeta tiene `screen.png` (captura) y `code.html` (maqueta).

## Cómo usarlo

Referencia visual y funcional, **no código a copiar**: `code.html` se apoya en Tailwind y fuentes de Google por CDN y en un simulador con JavaScript. No se ejecuta ni entra en la app. La app usa componentes Angular propios, tokens CSS y sin Material ni Tailwind. El plan define el mapa pantalla → componente.

## Elementos de prototipo que NO se implementan

- En las tres: el botón «Oscuro» (el tema sigue al del sistema).
- Oferta: la barra superior «Oferta De Activacion» (con flecha de volver y avatar; además sin tildes y en Title Case) y la etiqueta «TU ESPACIO PROTEGIDO».
- Bloqueo: el «SIMULADOR DE ESTADOS BIOMÉTRICOS» con sus cuatro pastillas A a D.
- Aviso: la etiqueta «Aviso informativo» y el rótulo «RK» con una hoja, que se ve suelto sobre el icono (parece un artefacto de generación).

## Contenido a corregir antes del plan (decisiones D1 a D7)

| # | Dónde | Problema | Decisión propuesta |
|---|---|---|---|
| D1 | Bloqueo, oferta y aviso | Muestran datos de la app: «Racha de 14 días protegida», «+25 XP listos», «+50 XP», «tus metas, notas y rachas», «Racha, experiencia y misiones a salvo». Contradice US-004-02 CA 2: **la pantalla de bloqueo no puede mostrar ningún dato de la app**, y en la oferta inventan progreso que aún no existe. | **Quitar** toda mención a XP, rachas, niveles y misiones. |
| D2 | Bloqueo y oferta | Afirmaciones **falsas** de cifrado y seguridad: «ESPACIO DE HÁBITOS CIFRADO», «Tus tareas personales y métricas permanecen encriptadas localmente», «Tus secretos a salvo… solo para tus ojos», «TU ESPACIO PROTEGIDO» antes de activar nada. El bloqueo solo tapa la pantalla; **no cifra nada**. | Texto veraz: por ejemplo «Así nadie verá tus tareas si coge tu móvil». |
| D3 | Oferta | «…se encarga de todo en menos de un segundo»: promete un tiempo. | Quitar la promesa. |
| D4 | Aviso | «Puedes volver a activarlo en cualquier momento desde los ajustes de tu teléfono» es **falso**: el bloqueo no se activa desde los ajustes del teléfono, y en esta spec no hay ajustes en la app. | Decisión pendiente (ver abajo). Mientras tanto, texto neutro. |
| D5 | Bloqueo | El botón «Usar PIN o patrón del sistema» (y «Ingresar con clave del dispositivo») supone poder lanzar el método del móvil desde la app. Depende de lo que admita el plugin. | Se comprueba en el plan. Si no se puede, se quita y el propio aviso del sistema ofrece esa salida. |
| D6 | Bloqueo | El estado «Desbloqueo pausado / Reactivar sensor» no existe en la spec (no hay pausa). | Se trata como **Cancelado** (US-004-02): no es error, solo queda el botón para repetir. |
| D7 | Bloqueo | El título «Huella dactilar activa» es confuso y la descripción habla de «construir tus hábitos». | Título del tipo «Tu app está protegida» y descripción sin gamificación. |

**Decisión pendiente (D4)**: cuando el bloqueo se desactiva solo, ¿se vuelve a ofrecer? Propuesta: si el usuario no había elegido «No volver a preguntar», la oferta reaparece en un arranque posterior con biometría disponible, reiniciando el contador de «Ahora no». El texto del aviso diría «Te lo volveremos a proponer cuando quieras protegerla de nuevo». Se fija en el plan.

Para que Stitch refleje estas decisiones, ver [`../stitch-ajustes.md`](../stitch-ajustes.md).
