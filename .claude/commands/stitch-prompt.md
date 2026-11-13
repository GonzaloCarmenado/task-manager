Genera el prompt para que Stitch (IA generativa de diseño de Google) cree las pantallas de una spec con frontal. Se ejecuta tras cerrar el clarify y **antes del plan**.

## Pasos

1. Identifica la spec activa y lee `spec.md` y `clarify.md`. Si `Frontal: no`, informa de que este paso no aplica y detente.
2. Extrae de la spec y del clarify, **solo funcionalidad necesaria**:
   - Las **pantallas** que hacen falta (nombre y propósito).
   - Por pantalla: **qué datos muestra**, **qué acciones permite** y **qué ocurre tras cada acción** (navegación o cambio de estado).
   - Los **estados** a cubrir: vacío, carga, error y los específicos de la feature.
   - El **flujo de navegación** entre pantallas.
   - Las **reglas de negocio visibles** (límites, validaciones, textos de error relevantes).
   - Contexto móvil funcional: Android en vertical, uso con una mano, teclado virtual, notificaciones del sistema si aplica.
3. Redacta el prompt en español con esta estructura: Contexto breve de la app → Objetivo de la feature → Pantallas (una sección por pantalla) → Flujos → Estados → Reglas.
4. **PROHIBIDO en el prompt**: colores, tipografías, tamaños, espaciados, radios, sombras, CSS, nombres de librerías o frameworks, y cualquier decisión estética. Eso lo decide Stitch con la guía de estilo que ya tiene como contexto.
5. Guarda el prompt en `specs/NNN-nombre/stitch-prompt.md` y muéstralo íntegro al usuario en el chat, listo para pegar en Stitch.
6. Espera a que el usuario traiga el resultado (pantallas, capturas o export). Incorpóralo a `plan.md` (sección «Pantallas»), referenciando las pantallas por nombre. **No escribas URLs privadas, ids de proyecto ni datos personales en el repo.**
7. Informa: "Diseño recibido. Siguiente paso: `/sdd-plan`."

## Notas

- NO escribas código ni lances `/sdd-plan` automáticamente.
- El prompt no es una spec técnica: describe qué hace cada pantalla, no cómo se implementa ni cómo se ve.
- Registra el turno en `docs/interacciones.md`.
