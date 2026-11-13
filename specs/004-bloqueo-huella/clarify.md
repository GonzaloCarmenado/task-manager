# Clarify 004 — Bloqueo de la app con huella

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-13

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Dónde se activa y desactiva el bloqueo**, al no haber navegación ni ajustes.
2. **Vista previa de «apps recientes»** de Android: cómo evitar que muestre el contenido.
3. **Método alternativo** si falla la huella (por defecto): permitir el PIN, patrón o contraseña del móvil.
4. **Frecuencia de la oferta** tras «Ahora no» (por defecto): siguiente arranque; tras 3 veces se trata como «No volver a preguntar».
5. **Cuándo se ofrece** (por defecto): una vez que hay sesión lista y biometría disponible, nunca durante la carga ni mientras hay un error de sesión.
6. **Dispositivo sin biometría o sin bloqueo de pantalla** (por defecto): no se ofrece nada.
7. **Cómo se desactiva** (consecuencia de la respuesta 1): ver decisiones.

---

## Respuestas

1. **Solo la oferta inicial**; el interruptor llega con la spec de ajustes (recomendación aceptada).
2. **Cubrir al pasar a segundo plano**, sin `FLAG_SECURE` (recomendación aceptada).
3. a 6. Sin preguntar: valores por defecto.
7. Sin preguntar: se asume la consecuencia de la respuesta 1.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| interruptor | No existe en esta spec. Llega con la spec de ajustes, cuando haya navegación. |
| consecuencia_del_interruptor | «No volver a preguntar» solo se revierte borrando los datos de la app. Un bloqueo ya activado solo se desactiva solo si la biometría deja de estar disponible, o borrando los datos. Se acepta hasta la spec de ajustes. |
| apps_recientes | Al pasar a segundo plano con el bloqueo activo se muestra la pantalla de bloqueo para cubrir la miniatura. No es 100 % garantizado. Sin `FLAG_SECURE` (bloquearía las capturas de pantalla del usuario y exigiría código nativo en un proyecto que se regenera). Se documenta como limitación conocida. |
| método_alternativo | Se permite el PIN, patrón o contraseña del móvil cuando falla la huella. |
| oferta | Se ofrece con sesión lista y biometría disponible: Activar, Ahora no y No volver a preguntar. «Ahora no» vuelve a preguntar en el siguiente arranque y, a la tercera, equivale a «No volver a preguntar». |
| sin_biometría | Sin biometría registrada o sin bloqueo de pantalla del móvil no se ofrece nada. |
| qué_protege | Solo bloqueo de pantalla (`authenticate`); se pide al arrancar y tras 30 s en segundo plano. |
| diseño | Frontal: oferta de activación y pantalla de bloqueo. Prompt de Stitch tras este clarify. |

---

**Estado**: CERRADO
