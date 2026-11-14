# Revisión cruzada (DeepSeek) — spec 008

**Fecha**: 2026-11-14 · Una pasada tras cerrar el clarify.

El revisor lee lo versionado en HEAD: no veía las specs 006 y 007 ni el diseño de la 008 (aún sin versionar), lo que explica dos hallazgos.

| # | Hallazgo | Gravedad | Valoración |
|---|---|---|---|
| 1 | La racha exige el día local guardado en la tarea, pero no hay columna ni migración que lo guarde | alta | **Válido**: la spec añade las columnas `completed_day`, `xp_awarded` y `xp_day` en `tasks` y las lista en la migración; el cliente envía el día local |
| 2 | El cálculo vive en la base de datos, pero los tests lo asignan a servicios del cliente | media | **Válido**: los criterios de XP, tope y racha pasan a tests de script (SQL estático) y a `verify-progress.mjs` (prueba real); el cliente solo prueba lo suyo (día local, plazos, reversión) |
| 3 | La spec se apoya en la 007, que «no existe» | media | **Falso en el repo** (existe, sin versionar), **válido como orden**: se fija 006 → 007 → 008 y cuándo se comprueba «posponer no da XP» |
| 4 | El aviso «−10 XP» es incorrecto si la tarea se completó con tope (0 XP) | baja | **Válido**: la spec dice que el aviso indica los XP realmente quitados (0 → ninguno). El `clarify.md` (cerrado, no se reedita) habla de «−10 XP»; manda la spec |
| 5 | El ejemplo «340 / 500 XP» del clarify no está en el repositorio | baja | **Falso**: está en el diseño recibido (`design/`, aún sin versionar) |
