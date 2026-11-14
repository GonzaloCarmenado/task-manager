# Diseño de la spec 006 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-14, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md). El export cubre las specs 006, 007 y 008 a la vez; aquí se guardan las pantallas que afectan a esta.
**Sistema de diseño**: el mismo [Playful Momentum](../../_design/playful-momentum/DESIGN.md) (el `DESIGN.md` del export es idéntico, no se duplica). Copia verificada con hashes.

## Contenido

| Carpeta | Pantalla | Historia |
|---|---|---|
| `avisos-de-alarma/` | Aviso previo de permiso («Te avisamos a tu hora»), simulación de la notificación, hoja de alarmas exactas | US-006-01, 02, 03 |
| `lista-de-tareas/` | Lista con el aviso de «Alarmas desactivadas» y los indicadores «Avisará a …» / «Sin alarma» | US-006-02, 03 |

Cada carpeta tiene `screen.png` y `code.html` (maqueta; no se ejecuta). La spec manda: lo que Stitch añade y no está en la spec ni en el prompt se **ignora sin preguntar**.

## Se conserva

- Aviso previo con título, explicación, **Permitir** y **Ahora no**.
- Hoja de alarmas exactas («Alarmas y recordatorios», «Abrir ajustes del sistema», «Omitir por ahora»).
- Aviso «Alarmas desactivadas» con **Activar alarmas** y cerrar, en la lista.
- Indicadores por tarea: «Avisará a las 11:00» / «Avisará a su hora» y «Sin alarma».
- Notificación: título de la tarea y «Es la hora (11:00)».

## Se ignora

| Dónde | Elemento | Motivo |
|---|---|---|
| Varias | Pestañas de simulador (Permiso, Posponer, Exacta; «Simuladores», «Spec 006 Alarma», «Vista previa en sistema Android», «Simulador», «Simulación en reposo») | Prototipo |
| Varias | Cabecera «Crear Misión» / «Misiones Diarias», flecha de volver, avatar | Inventado: no hay misiones ni perfil |
| Lista | Barra inferior (Tareas, Logros, Tienda, Perfil), botón «+» central | No existen esas secciones |
| Notificación | Botones **Completar (+10 XP)** y **Posponer 1h**, icono de gota, nombre de app «SuperTasks» | Fuera de alcance (acciones en la notificación) y la notificación no lleva XP |
| Aviso previo | Texto «Solo te avisaremos en el momento exacto. Sin spam…» y decoraciones | Texto de relleno; promete más de lo que se especifica |
| Celebración | «Flujo Notificación & Desbloqueo» con huella simulada | Prototipo; el flujo real es el de la spec 004 |

## Decisiones que resuelve el plan

- La notificación real la dibuja Android: de la maqueta solo valen sus **textos**.
- El estado «sin alarma» se muestra solo con permiso no concedido; la maqueta también lo pinta en una tarea sin motivo, que no se imita.
