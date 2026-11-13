Analiza la spec activa, detecta ambigüedades y registra las decisiones en `clarify.md`.

## Pasos

1. Identifica la spec activa: número en el nombre de la rama (`NNN-nombre`); si no hay, la más reciente en `specs/` o pregunta al usuario.
2. Lee `specs/NNN-nombre/spec.md` completo.
3. Analiza buscando:
   - **Ambigüedades funcionales**: criterios vagos o con más de una interpretación.
   - **Casos borde**: estados vacío/carga/error, offline, zona horaria, permisos y datos por usuario (RLS).
   - **Supuestos técnicos sin validar**: dependencias con otras specs, comportamiento de Supabase/Tauri/Android.
   - **Decisiones de diseño pendientes** donde hay varias opciones válidas.
   - **Scope creep latente** frente a lo que dice «Out of scope».
   - **Móvil**: gestos, teclado virtual, safe-areas, notificaciones/alarmas del sistema si aplica.
4. Crea `specs/NNN-nombre/clarify.md` desde `specs/_TEMPLATE/clarify.md` con la sección **Preguntas** (una por ambigüedad, claras y concretas). Mínimo 2 preguntas aunque la spec parezca clara.
5. Haz las preguntas al usuario (AskUserQuestion cuando haya opciones claras). **Cada pregunta cuenta como `F`** en `docs/interacciones.md`. Si hay un valor por defecto razonable, aplícalo y menciónalo en lugar de preguntar.
6. Con las respuestas, actualiza `clarify.md`: respuesta bajo cada pregunta, sección **Decisiones** (clave: valor) y `**Estado**: CERRADO` al final.
7. Si surge nueva ambigüedad, añade la pregunta y repite desde el paso 5.
8. Al cerrar, revisa si alguna decisión invalida o reduce el alcance de `spec.md` y actualízala (marca la US «SIN TRABAJO — resuelto en clarify» o ajusta criterios). Informa al usuario de los cambios.
9. **Revisión cruzada**: al guardar `clarify.md` con `Estado: CERRADO`, el hook `hook-clarify` lanza DeepSeek sobre spec + clarify (salvo `Ciclo: simple`). Si devuelve hallazgos graves, **PARA**: resúmelos, di cuáles te parecen válidos y cuáles no, y espera la decisión del usuario.
10. Informa el siguiente paso:
    - Si `Frontal: sí` → "Clarify cerrado. Siguiente paso: `/stitch-prompt` para el diseño, y después `/sdd-plan`."
    - Si `Frontal: no` → "Clarify cerrado. Siguiente paso: `/sdd-plan`."

## Notas

- Este paso es siempre obligatorio, incluso si la spec parece clara.
- NO implementes código ni lances `/sdd-plan` automáticamente.
- Registra el turno y las preguntas en `docs/interacciones.md`.
