Crea una especificación SDD (con plan de tests TDD) para una nueva feature.

Pasos:
1. Lee `specs/README.md` para identificar el número siguiente disponible.
2. Si el usuario no ha dado nombre/descripción de la feature, pregúntalo (cuenta como pregunta `F` en `docs/interacciones.md`).
3. Crea `specs/NNN-nombre-kebab/spec.md` usando `specs/_TEMPLATE/spec.md`.
   - Rellena Objetivo, Contexto (qué existe ya), Historias de usuario con CA, Plan de tests, Ficheros afectados, Restricciones técnicas y Out of scope.
   - P1 = bloqueante, P2 = deseable, P3 = opcional.
   - Cada criterio de aceptación debe tener su test asociado en el Plan de tests (id `US-NNN-xx`).
   - Piensa siempre en móvil (Android): táctil, safe-areas, teclado virtual.
   - Sé específico con rutas de ficheros y nombres de interfaces/tipos.
4. Actualiza "Siguiente número disponible" y la tabla en `specs/README.md`.
5. Presenta la spec al usuario. NO escribas tests ni implementes hasta recibir aprobación explícita.
6. Registra el turno y las preguntas (F/W) en `docs/interacciones.md`.
