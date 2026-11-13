# Diseño de la spec 005 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-13, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md).
**Sistema de diseño**: el mismo [Playful Momentum](../../_design/playful-momentum/DESIGN.md) de las specs 003 y 004 (el `DESIGN.md` del export es idéntico, no se duplica). Copia verificada con hashes.

## Contenido

| Carpeta | Pantalla | Historia |
|---|---|---|
| `lista-de-tareas/` | Lista (con estados vacío, carga y error, aviso de tarea completada y hoja de nueva tarea) | US-005-02, 03 |
| `formulario-de-tarea/` | Formulario de tarea (modo crear) | US-005-01, 04 |

Cada carpeta tiene `screen.png` (captura) y `code.html` (maqueta).

## Cómo usarlo

Referencia visual y funcional, **no código a copiar**: `code.html` se apoya en Tailwind y fuentes de Google por CDN y en un simulador con JavaScript. No se ejecuta ni entra en la app. La app usa componentes Angular propios, tokens CSS y sin Material ni Tailwind. El plan define el mapa pantalla → componente.

> Regla del proyecto: la spec manda; lo que Stitch añade y no está en la spec ni en el prompt se **ignora sin preguntar**. No hace falta regenerar las pantallas.

## Se conserva (está en la spec)

- Lista con grupos **Atrasadas / Hoy / Mañana / fecha / Sin fecha**, con contador por grupo; hora en cada tarea; sección **Completadas** plegable; acción de crear siempre visible.
- Estados: vacío (con «crear primera tarea»), carga y error con **Reintentar**; aviso breve al completar.
- Formulario: título con contador `n / 120` y mensaje de validación, fecha opcional con **Hoy / Mañana / Elegir fecha** y **Quitar fecha**, hora opcional, **Guardar** deshabilitado con el motivo explicado, **Cancelar**.

## Elementos de prototipo e invenciones que NO se implementan

| Dónde | Elemento | Motivo |
|---|---|---|
| Lista y formulario | Panel «Vista previa de estados» / «Modos de prueba» (Tareas, Vacía, Carga, Error, Tema, Modo: Crear, >120 chars, Error: Off, «Interactivo») | Simulador de prototipo |
| Lista y formulario | Avatar de usuario (esquina superior) | No hay perfil ni cuentas (spec posterior) |
| Lista | Saludo «Hola de nuevo» y «Tienes N tareas para hoy» | No está en la spec; un resumen del día llega con la gamificación |
| Lista | Barra inferior de navegación (Tareas, Agenda, Listas, Ajustes) | No existen esas secciones; la app tiene una sola pantalla |
| Lista | Etiquetas auxiliares («Miércoles», «Jueves», «Algún día», «Durante el día», «Sin hora asignada», «Pendiente sin apuro», «Idea de cocina») y el icono de lápiz en la tarea atrasada | Inventadas o redundantes: tocar la tarea ya abre la edición; el día de la semana se muestra solo como parte de la fecha legible |
| Lista | Etiqueta «Hecho» y textos «Completada hoy a las…» en las completadas | No pedido; se muestra solo título y control para desmarcar |
| Formulario | Atajos de hora «09:00» y «16:00» | No pedido; solo el selector de hora |
| Formulario | Flecha de volver **y** botón «Cancelar» a la vez, y el título «Nueva tarea» repetido | Se deja una sola forma de cerrar sin guardar |
| Formulario | Texto «Permite coordinar tu momento exacto durante el día» | Texto de relleno |

## Contenido de la spec que Stitch no dibujó (lo resuelve el plan)

- Formulario en **modo editar** con la acción **Borrar tarea** y su **confirmación** («esta acción no se puede deshacer»).
- **Error al guardar** en el formulario (conservando el texto) y avisos de error al completar, desmarcar o borrar con reversión.
- Sección **Completadas sin recientes** y estados de la hora cuando no hay fecha (selector deshabilitado u oculto).
- El estado «atrasada» se distingue visualmente: el plan decide cómo, con los tokens existentes.

## Decisiones pendientes de producto

Ninguna: todo lo anterior se resuelve con la spec.
