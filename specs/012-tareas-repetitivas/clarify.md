# Clarify 012 — Tareas repetitivas

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-15

---

## Preguntas

1. **Alcance**: ¿entran en esta spec solo P1, P1 + P2 o también P3 (saltar una ocurrencia y terminar tras N veces)?
2. **Adelantar ocurrencias**: al completar una ocurrencia aparece la siguiente (p. ej. mañana). ¿Se puede completar hoy mismo? Encadenándolo se ganaría XP adelantando días (tope 100 XP al día).
3. **Repetir desde la fecha prevista o desde que se completa** (valor por defecto aplicado, sin preguntar): desde la fecha prevista, como dice «Out of scope» en la spec.
4. **Ocurrencia atrasada sin completar** (valor por defecto aplicado): no se acumulan; sigue una sola pendiente (atrasada) por serie. Al completarla, la siguiente se calcula desde hoy.
5. **Series y datos ajenos** (valor por defecto aplicado): las ocurrencias completadas se conservan como tareas normales; «toda la serie» no toca el historial. Las series viajan con el `user_id` y se conservan en el traspaso de tareas del móvil al iniciar sesión (spec 011).

---

## Respuestas

1. **P1 + P2.** «Saltar una ocurrencia» y «terminar tras N veces» (P3) quedan fuera.
2. **No hasta su día.** Una ocurrencia futura se ve en la lista pero no se puede marcar hasta que llega su fecha.
3. Desde la fecha prevista (por defecto).
4. Una sola pendiente por serie (por defecto).
5. Se conserva el historial y la serie viaja con la cuenta (por defecto).

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Alcance | P1 + P2: diaria, días de la semana, cada N días/semanas, día del mes, fecha de fin, indicador en la lista, editar/borrar «solo esta / toda la serie» |
| P3 | Fuera de esta spec (saltar, fin por número de veces) |
| Completar una ocurrencia futura | No se puede hasta que llega su día; no hay XP por adelantar |
| Regla de repetición | Desde la fecha prevista, no desde que se completa |
| Ocurrencia atrasada | Una sola pendiente por serie; al completarla la siguiente cuenta desde hoy |
| Historial | Las completadas se conservan como tareas normales |
| Traspaso (011) | Las series pendientes conservan su repetición |
| Revisión cruzada | No aplica (`Ciclo: simple`) |

---

**Estado**: CERRADO
