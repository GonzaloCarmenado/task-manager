# Review 004 — Bloqueo de la app con huella

**Fecha**: 2026-11-13
**Resultado**: Clarify revisado con **una sola pasada** de DeepSeek, por decisión del usuario (sin rondas posteriores)

---

## Revisión cruzada de spec + clarify (DeepSeek, 1 pasada)

5 hallazgos (1 grave). Todos válidos. Se aplicaron a `spec.md`; el `clarify.md` no se modificó para no relanzar la revisión.

| # | Gravedad | Hallazgo | Valoración | Acción |
|---|---|---|---|---|
| 1 | media | US-004-02 CA 4 (aviso del sistema en español, P1) no tenía test en el plan | Válido | Añadido el test al plan (unit sobre el servicio de acceso: las cadenas que se pasan al plugin) |
| 2 | baja | El test «activar exige autenticar; **desactivar también**» alude a una conducta fuera de alcance (no hay desactivación manual en esta spec) | Válido | Renombrado a «activar exige autenticar con la huella en ese momento» |
| 3 | baja | La condición «sin bloqueo de pantalla del móvil no se ofrece» del clarify no estaba en el criterio de oferta | Válido | US-004-01 CA 1 recoge que implica un bloqueo de pantalla y que, si no, no se ofrece nada |
| 4 | baja | US-004-02 CA 2 (P1) mezclaba «ningún dato visible» (comprobable) con «ni en apps recientes» (no garantizado) | Válido | CA 2 queda solo con lo comprobable; apps recientes se trata aparte como mejor esfuerzo (CA 7) |
| 5 | baja | Tensión entre el CA 4 en español (P1) y la posibilidad de necesitar un parche nativo, que la spec rechaza | Válido | US-004-04 CA 5: se comprueba en el plan que `authenticate` admite los textos en español sin parche; si no, **no se aplica ningún parche nativo sin decisión del usuario** y el CA 4 pasa a P2 |

## Pendiente para el plan

- Comprobar con la versión fijada del plugin que `authenticate` acepta título, subtítulo y texto del botón de cancelar (hallazgos 1 y 5).
- Probar la huella en el emulador (`adb emu finger touch`), que exige un bloqueo de pantalla configurado.
