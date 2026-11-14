# Clarify 010 — Interfaz fiel al sistema de diseño de Stitch

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-14

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Crear tarea**: el diseño la muestra como hoja inferior y hoy es una pantalla completa en `/nueva`. ¿Se mantiene la pantalla o pasa a hoja?
2. **Estados vacíos**: el diseño pide un foco ilustrado cálido y no hay ilustraciones. ¿Insignia con icono, ilustraciones aportadas o dibujo propio?
3. **Paleta clara**: la cabecera del `DESIGN.md` (primario `#4648d4`, lienzo `#fcf8ff`) y el texto (`#6366F1`/`#4F46E5`, `#FAFAFD`) no coinciden. ¿Cuál manda?
4. **Barra de estado de Android en oscuro**: muestra iconos oscuros sobre fondo oscuro. ¿Se incluye el ajuste nativo?
5. **Fuente** (por defecto): Plus Jakarta Sans empaquetada con la app (paquete `@fontsource-variable/plus-jakarta-sans` con versión exacta, o ficheros propios si el paquete no cuadra), cargada desde los recursos locales; nunca desde un servicio externo. El plan lo concreta.
6. **Lo que el diseño menciona y la app no tiene** (por defecto): prioridades, categorías, repetición, «Reclamar XP», «+25 XP», barra de navegación inferior y cualquier otra funcionalidad se **ignoran**; se mantienen los textos y cantidades actuales (+10 XP).
7. **Prompt para Stitch** (por defecto): no hace falta. No hay pantallas nuevas y el documento de diseño ya es la referencia; se omite `/stitch-prompt`.
8. **Orden de entrega** (por defecto): por bloques revisables, uno por historia (base visual → lista → gamificación → formulario y hojas → pantallas de sistema), cada uno con su revisión visual y sus tests en verde antes de seguir.
9. **Conflicto diseño ↔ comportamiento** (por defecto): manda el comportamiento actual (por ejemplo, el botón de posponer en la fila, el aviso inferior de 3 s, el botón atrás que cierra las hojas) y se anota la discrepancia en `review.md`.

---

## Respuestas

1. **Mantener pantalla**: misma ruta `/nueva`, mismo flujo; solo cambia el estilo.
2. **Dibujo SVG sencillo propio** para cada estado (vacío, error, celebración), dentro de la app, sin recursos externos.
3. **Los de la cabecera**: primario `#4648d4`, contenedor `#6063ee`, lienzo `#fcf8ff`. Los tonos `#6366F1`/`#4F46E5` se usan en el tema oscuro y en los degradados.
4. **Incluir** el ajuste nativo mínimo para que los iconos de la barra de estado sigan el tema.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Crear tarea | Se mantiene la pantalla completa en `/nueva`; solo estilo |
| Ilustraciones | SVG sencillos propios por estado (vacío, error, celebración); sin recursos externos |
| Paleta clara | La de la cabecera del `DESIGN.md` (`#4648d4`, `#6063ee`, `#fcf8ff`); `#6366F1`/`#4F46E5` en oscuro y degradados |
| Barra de estado | Se decidió incluir un ajuste nativo; **revisado en `/sdd-plan`: sin trabajo** (arranque en frío correcto; el fallo era un artefacto del cambio de tema en caliente) |
| Fuente | Plus Jakarta Sans empaquetada (versión exacta), sin servicios externos |
| Funcionalidad no existente | Se ignora; textos y cantidades actuales se mantienen |
| `/stitch-prompt` | Se omite (sin pantallas nuevas) |
| Orden de entrega | Por bloques: base → lista → gamificación → formulario y hojas → sistema |
| Conflictos | Manda el comportamiento actual; se anota en `review.md` |

---

**Estado**: CERRADO
