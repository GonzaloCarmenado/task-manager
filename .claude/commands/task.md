Descompone `plan.md` en tareas atómicas y ordenadas siguiendo TDD. Genera `tasks.md`.

## Pasos

1. Identifica la spec activa (número en la rama; si no, pregunta).
2. Lee `plan.md` y `spec.md` completos; verifica que las tareas cubrirán todos los criterios P1.
3. Crea `specs/NNN-nombre/tasks.md` desde `specs/_TEMPLATE/tasks.md`:
   - Bloques lógicos: `## Bloque N — Nombre` (BBDD, una por historia de usuario, etc.).
   - Cada tarea es `- [ ] T-NNN-XX: descripción concisa (fichero)` con XX secuencial.
   - **TDD obligatorio**: por cada historia, primero la tarea **(Red)** de tests, luego **(Green)** de implementación y por último **(Refactor)**. Nunca implementación antes que su test.
   - Orden por dependencia (BBDD → modelos → historias P1 → P2 → P3).
   - Las tareas con efecto en el remoto (`pnpm db:push`) llevan la nota «requiere confirmación del usuario».
4. Añade al final `## Checklist de cierre` (lint/format, `secrets:check`, `test:ci`, criterios P1, revisión visual en navegador si hay frontal, Android).
5. Muestra `tasks.md` y espera feedback o aprobación.
6. Al aprobar: "Tareas listas. Siguiente paso: `/implement`."

## Notas

- Una tarea = un cambio atómico verificable; si lleva más de ~30 min, divídela.
- NO implementes código ni lances `/implement` automáticamente.
- Registra el turno en `docs/interacciones.md`.
