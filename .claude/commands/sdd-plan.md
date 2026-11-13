Diseña la solución técnica completa a partir de `spec.md`, `clarify.md` y el diseño de Stitch (si hay frontal). Genera `plan.md`.

## Pasos

1. Identifica la spec activa (número en la rama; si no, pregunta).
2. Lee `spec.md` y `clarify.md` completos. Si `Frontal: sí`, comprueba que existe el diseño de Stitch (`stitch-prompt.md` y el resultado aportado por el usuario); si falta, avisa y detente.
3. Explora el código existente relevante: ficheros afectados de la spec, interfaces implicadas, `core/services`, migraciones existentes en `supabase/migrations/` y `docs/supabase.md` si hay cambios de BBDD.
4. Crea `specs/NNN-nombre/plan.md` desde `specs/_TEMPLATE/plan.md`:
   - **Enfoque técnico** (1-3 párrafos).
   - **Ficheros afectados** (ruta, acción, cambio).
   - **Interfaces TypeScript** completas.
   - **Esquema SQL**: migración con SQL completo, **RLS por usuario en la misma migración** y rollback documentado.
   - **Pantallas**: mapa pantalla de Stitch → componente, con datos, acciones y estados.
   - **Estrategia de tests (TDD)**: qué `*.spec.ts` se crean y qué criterio (`US-NNN-xx`) cubre cada test.
   - **Orden de implementación** (Red → Green → Refactor por historia, P1 → P3).
   - **Riesgos**.
5. Muestra `plan.md` y espera **aprobación explícita**. Si pide cambios, actualiza y repite.
6. Al aprobar: "Plan aprobado. Siguiente paso: `/task`."
7. Registra el turno y las preguntas en `docs/interacciones.md`.

## Notas

- El plan debe ser lo bastante detallado para que `/implement` no tome decisiones de diseño.
- Respeta el patrón de 3 servicios, OnPush, Signals, standalone y sin `any`; sin Angular Material; mobile-first.
- Solo `SupabaseService` toca Supabase, desde un `*.access.service.ts`.
- Repo público: ningún secreto, URL privada ni dato personal en el plan ni en el SQL (sin seeds con datos reales).
- NO implementes código ni lances `/task` automáticamente.
