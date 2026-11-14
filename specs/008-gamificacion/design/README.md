# Diseño de la spec 008 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-14, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md). El export cubre las specs 006, 007 y 008 a la vez; aquí se guardan las pantallas que afectan a esta.
**Sistema de diseño**: el mismo [Playful Momentum](../../_design/playful-momentum/DESIGN.md). Copia verificada con hashes.

## Contenido

| Carpeta | Pantalla | Historia |
|---|---|---|
| `lista-de-tareas/` | Lista con la franja de nivel, XP y racha arriba | US-008-04 |
| `pantalla-de-progreso/` | Nivel, XP total, XP para el siguiente nivel, racha actual y mejor racha | US-008-04 |
| `celebracion-y-subida-de-nivel/` | Pantalla de subida de nivel (nivel nuevo, mensaje y continuar) | US-008-02 |

Cada carpeta tiene `screen.png` y `code.html` (maqueta; no se ejecuta). La spec manda: lo extra se **ignora sin preguntar**.

## Se conserva

- Franja de resumen: nivel, barra «340 / 500 XP» y racha («6 días seguidos»; con el mensaje «completa 1 tarea hoy para mantenerla» cuando la racha sigue viva).
- Pantalla de progreso: nivel y XP acumulada, barra y «Faltan 160 XP», racha **actual** y **récord**, y el mensaje de «sin culpas»: nivel y XP siguen intactos si se rompe la racha.
- Subida de nivel: número de nivel, mensaje de enhorabuena, **Continuar** y «toca en cualquier parte para volver».
- Texto «+10 XP por cada tarea completada» (se quita lo de «Tu nivel nunca baja»: tras el clarify el nivel se recalcula y puede bajar al desmarcar).

## Se ignora

| Dónde | Elemento | Motivo |
|---|---|---|
| Varias | Simuladores («Probar +10 XP», «Simular huella», «Ver como nuevo usuario», pestañas de estado) | Prototipo |
| Lista y progreso | Cabeceras «Misiones Diarias» y «Perfil de Usuario», avatar, flecha «Volver», barra inferior (Logros, Tienda, Perfil), «+» central | Misiones, logros, tienda y perfil están fuera de la spec |
| Lista | Etiqueta «SPEC 008 · GAMIFICACIÓN», rangos con nombre («Explorador Constante», «Creador de Hábitos», «Maestro del Ritmo», «Hito de productividad», «Nuevo rango desbloqueado») | Los niveles son numéricos; los nombres de rango no están en la spec |
| Lista | «+10 XP al terminar» y «Asegura tu racha» en cada tarea, «Prioridad alta», «Bienestar» | No pedido; la XP se muestra al completar |
| Progreso | «Actividad reciente», «Compañero de Metas» con mensajes de mascota | No pedido |
| Subida de nivel | «50 Completadas» (contador de tareas), «+25 XP» y «525 XP» del ejemplo, «Flujo Notificación & Desbloqueo» | XP fija de 10 por tarea; contador no pedido; prototipo |
| Cabecera | Chip de racha «5 d» junto al avatar | Duplica la racha de la franja |

## Falta en el diseño (lo resuelve el plan)

- La **celebración «+10 XP»** al completar una tarea (la maqueta solo trae el simulador «Probar +10 XP»).
- Estados de **carga**, **error con Reintentar**, **racha rota** y celebración con **reducir animaciones**.
- Mensaje para el **usuario nuevo** (nivel 1, 0 XP): la maqueta solo ofrece el simulador «Ver como nuevo usuario».

## Decisiones pendientes de producto (para el `/clarify`)

- Ninguna nueva: el diseño de rangos con nombre se descarta por estar fuera de la spec.
