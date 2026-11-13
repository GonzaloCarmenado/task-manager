# Revisión cruzada (DeepSeek) — spec 005

**Fecha**: 2026-11-13 · Una pasada tras cerrar el clarify.

El revisor solo ve lo **versionado en HEAD**: leyó la spec anterior al clarify (sin cambios sin commitear), por lo que los hallazgos 1, 2, 3 y 5 ya estaban resueltos en el disco cuando se emitieron.

| # | Hallazgo | Gravedad | Valoración |
|---|---|---|---|
| 1 | La hora opcional (`due_time`) del clarify no aparece en la spec | alta | **Ya resuelto**: modelo, tabla, formulario y alcance actualizados; se añade test de la hora |
| 2 | El límite de 30 días de «Completadas» no está en la spec | media | **Ya resuelto**: criterio actualizado; se añade test |
| 3 | El orden dentro del día no está en la spec | media | **Ya resuelto**: criterio añadido; se añade test |
| 4 | Faltan tests para US-005-05 CA2 y CA4 | media | **Válido**: añadidos al plan de tests |
| 5 | Los títulos duplicados no se mencionan | baja | **Válido y barato**: añadido un test de duplicados permitidos |
