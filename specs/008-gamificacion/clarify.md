# Clarify 008 — Gamificación: XP, niveles y rachas

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-14

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Desmarcar una tarea completada**: ¿se conserva el XP, el nivel y la racha que dio, o se quitan?
2. **Tope diario de XP**: ¿se limita lo que se puede ganar por día para evitar crear y completar tareas solo por puntos?
3. **Curva de niveles** (por defecto): la XP acumulada para **alcanzar** el nivel N es `25·N·(N−1)` (nivel 2 con 50 XP, 3 con 150, 4 con 300, 5 con 500…). Coincide con el ejemplo del diseño (340 / 500 XP en el nivel 4) y con 5 tareas para el nivel 2.
4. **Dónde se calcula** (por defecto): en la base de datos (función o disparador al completar y desmarcar), de forma atómica; el cliente solo lee y muestra. El plan lo concreta.
5. **Día de la racha** (por defecto): el día local en que se completa la tarea, guardado en la tarea; no importa para qué fecha estaba planificada.
6. **Tareas completadas antes de esta spec** (por defecto): no dan XP retroactivo; el progreso empieza en 0.
7. **Subida y bajada de nivel** (por defecto): la pantalla de subida de nivel solo aparece al **subir** completando una tarea (una vez, con el nivel final). Si desmarcar baja el nivel, solo se actualiza el resumen, sin pantalla.
8. **Tope alcanzado** (por defecto): la tarea se completa igualmente y cuenta para la racha; la celebración dice «Hoy ya has llegado al tope de XP». El aviso al desmarcar indica «−10 XP».
9. **Quitar XP con el tope** (por defecto): desmarcar resta el XP del día **en que se concedió**, no del día actual.

---

## Respuestas

1. **Se quita el XP de esa tarea**: desmarcar resta los 10 XP, y por tanto el nivel se recalcula y puede bajar. Se retira «el nivel nunca baja» de la spec y del diseño.
2. **Tope de 100 XP al día**.
3. a 9. Sin preguntar: valores por defecto.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| XP por tarea | 10 al completar; se quitan al desmarcar; volver a completar los da otra vez (suma como máximo 10 por tarea a la vez) |
| Tope diario | 100 XP por día local; superado, la tarea se completa sin XP y cuenta para la racha |
| Nivel | Se calcula con la XP total: `25·N·(N−1)` para alcanzar el nivel N; puede bajar al desmarcar |
| Racha | Días (locales, guardados en la tarea) con al menos una tarea completada; desmarcar la única de un día lo quita; la mejor racha nunca baja |
| Cálculo | En la base de datos, atómico; el cliente lee |
| XP retroactivo | No |
| Pantalla de subida de nivel | Solo al subir completando; una vez con el nivel final |
| Aviso al desmarcar | Indica «−10 XP» |

---

**Estado**: CERRADO
