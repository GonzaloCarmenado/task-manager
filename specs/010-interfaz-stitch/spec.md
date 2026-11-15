# Spec 010 — Interfaz fiel al sistema de diseño de Stitch («Playful Momentum»)

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-14
**Estado**: Implementada
**Ciclo**: simple
**Frontal**: sí

> Ciclo simple: solo estilo y presentación, sin lógica de negocio ni datos. La revisión visual en navegador y en Android sigue siendo obligatoria. El documento de diseño ya existe (`specs/_design/playful-momentum/DESIGN.md`, idéntico al que aporta el usuario), así que no se genera prompt para Stitch: ese documento es la referencia.

---

## Objetivo

Que todas las pantallas de la app reproduzcan con fidelidad los colores, la tipografía, las formas, las sombras y los componentes del sistema de diseño «Playful Momentum» de Stitch, para ganar el contraste y el dinamismo que hoy les faltan, **sin añadir ninguna funcionalidad nueva**.

---

## Contexto

- Los tokens actuales (`src/styles/_tokens.scss`) recogen solo una parte del sistema y las pantallas lo aplican de forma parcial: parecen «de la misma familia», pero planas. Diferencias detectadas frente a `DESIGN.md`:
  - **Tipografía**: usa la pila del sistema, no **Plus Jakarta Sans**; faltan la escala (display, headline, body, label) con sus pesos, interlineados y espaciado entre letras.
  - **Color con rol**: el ámbar (secundario) y el esmeralda (terciario) apenas se usan; la racha, los XP y la barra de nivel no tienen su identidad (pastilla ámbar con halo, barra con degradado índigo→esmeralda).
  - **Profundidad**: solo hay una sombra de tarjeta; faltan los niveles 2 (halos de color) y 3 (modales con velo y desenfoque).
  - **Componentes**: botón primario de 52 px con sombra tintada y escala al pulsar, check de 28 px con animación, tarjetas con píldoras (hora, atraso, aviso), chips de 36 px, campos en píldora con anillo de foco, hojas inferiores con velo desenfocado.
  - **Ritmo y zona del pulgar**: márgenes de 1,25 rem, acciones principales en la zona inferior, relleno inferior para que nada quede bajo la barra de navegación.
- Pantallas y componentes afectados (el sistema de diseño ya está en el repo): lista de tareas, formulario de tarea, hoja de posponer, avisos y hojas de alarmas, resumen de progreso, pantalla de progreso, celebración, subida de nivel, bloqueo con huella (oferta, pantalla de bloqueo, aviso) y pantalla de estado de sesión.
- Dependencias: specs 003 a 009 (solo cambia su presentación; el comportamiento queda igual).

### Decisiones cerradas en `/clarify`

1. **Fuente**: Plus Jakarta Sans empaquetada con la app (versión exacta), sin descargas.
2. **Crear tarea**: se mantiene la pantalla completa en `/nueva`; solo cambia el estilo.
3. **Estados vacíos**: ilustraciones SVG sencillas propias (vacío, error, celebración), sin recursos externos.
4. **Paleta clara**: la de la cabecera del `DESIGN.md` (`#4648d4`, `#6063ee`, `#fcf8ff`); `#6366F1`/`#4F46E5` en oscuro y degradados.
5. **Barra de estado de Android**: se decidió incluir un ajuste nativo, pero **en `/sdd-plan` se comprobó en el emulador que con arranque en frío en modo oscuro ya es correcta** (el fallo visto era un artefacto de cambiar el tema en caliente) y `src-tauri/gen/` no se versiona. **Sin trabajo**: solo se verifica en la revisión en Android.
6. **Lo que el diseño menciona y la app no tiene**: se ignora; textos y cantidades actuales se mantienen (+10 XP).

Detalle en [clarify.md](./clarify.md).

---

## Historias de usuario

### US-010-01 — Base visual: tokens, tipografía y profundidad (P1)

**Como** usuario, **quiero** que toda la app comparta la misma tipografía, paleta, formas y sombras del sistema de diseño, **para** que se vea cohesionada, contrastada y viva.

**Criterios de aceptación:**
- Plus Jakarta Sans está empaquetada con la app (sin peticiones de red a servicios de fuentes) y se usa en todas las pantallas, con la escala del diseño: display 36/800, headline-lg 28/700, headline-md 22/700, headline-sm 18/600, body-lg 16/500, body-md 14/400, body-sm 12/400, label-lg 14/700, label-md 12/600, label-sm 10/700 en mayúsculas, con sus interlineados y espaciado entre letras.
- Los tokens recogen la paleta completa del diseño (superficies, primario, secundario ámbar, terciario esmeralda, error) en claro y en oscuro (`#0F0E17` base, `#1B1A2E` tarjetas), más los radios (tarjetas 1 a 1,5 rem, píldoras completas) y el espaciado (margen 1,25 rem, hueco 1 rem, `space-lg` 1,5 rem, `space-xl` 2,25 rem).
- Cuatro niveles de profundidad: base plana; tarjetas con sombra cromática (`0 4px 20px -2px` índigo al 8 %); halos de color para racha y XP; modales y hojas con sombra profunda y velo con desenfoque.
- Botón primario: píldora de 52 px, sombra tintada con el color primario, texto `label-lg` blanco y escala 0,97 al pulsar.
- Con «reducir movimiento» activado no hay animaciones de escala ni de resorte (solo cambios de estado).
- Contraste de texto ≥ 4,5:1 (AA) en todas las parejas de color de texto y fondo, en claro y en oscuro.

### US-010-02 — Lista de tareas con tarjetas dinámicas (P1)

**Como** usuario, **quiero** una lista con tarjetas, check y etiquetas más expresivas, **para** reconocer de un vistazo qué es hoy, qué está atrasado y qué ya hice.

**Criterios de aceptación:**
- Tarjetas con radio de 1 rem, relleno de 16 px, fondo de tarjeta y sombra de nivel 1; el título en `headline-sm` con peso medio y los datos secundarios en `body-sm`.
- Check circular de 28 px visibles (zona táctil ≥ 44 px) con borde de 2 px violeta claro; al completar, relleno esmeralda con marca blanca y animación de resorte.
- Hora, atraso y aviso se muestran como **píldoras horizontales** con color de rol (atraso en error, aviso en esmeralda, hora neutra) y micro-etiquetas en mayúsculas.
- Los títulos de grupo (Atrasadas, Hoy, Mañana…) y su contador mantienen su jerarquía con la nueva escala; el botón de posponer conserva su zona táctil y un estilo coherente.
- El botón flotante «Nueva tarea» es píldora de 52 px anclada en la zona del pulgar, y el listado deja relleno inferior (`space-xl` más la barra de navegación) para que ninguna tarea quede tapada.
- Estados vacío, carga y error con la misma identidad: **ilustración SVG sencilla propia** con halo de color (p. ej. colina o nube con estrella para el vacío, nube con un rayo suave para el error), título `headline-md` y botón primario, sin cambiar sus textos ni sus acciones.

### US-010-03 — Gamificación con contraste y energía (P1)

**Como** usuario, **quiero** que el nivel, la racha y los XP destaquen con su color, **para** sentir progreso cada vez que miro la app.

**Criterios de aceptación:**
- Pastilla de racha ámbar con icono de llama, número en `label-lg` y borde cálido (`rgba(245,158,11,0.3)`); con racha viva, halo ámbar de nivel 2.
- Barra de nivel de 12 px con pista índigo muy claro y relleno en degradado primario → esmeralda, con extremos redondeados a juego.
- Tarjeta de nivel (resumen y pantalla de progreso) como bloque principal con relleno de `space-lg`, número de nivel en `display-lg` con espaciado negativo, y cifras de XP y racha en `label-lg`/`display-lg` con peso 700/800.
- Celebración (+XP, tope, racha, −XP) como píldora flotante con halo y destellos SVG propios; sin botones ni bloqueo, y sin sonido ni vibración (igual que hoy).
- Subida de nivel como modal de nivel 3: velo con desenfoque, sombra profunda, número grande y acción «Continuar» como botón primario de 52 px.
- Los textos y las cantidades se mantienen (+10 XP, 100 XP al día, «Llevas N días»…).

### US-010-04 — Formulario y hojas inferiores (P2)

**Como** usuario, **quiero** que crear y editar tareas, posponer y los avisos de alarmas tengan el mismo estilo cálido, **para** que ninguna pantalla parezca de otra app.

**Criterios de aceptación:**
- Campos de texto, fecha y hora en píldora continua con anillo de foco de 2 px en el color primario; contador y mensajes de ayuda con `body-sm`.
- Chips (Hoy, Mañana, Quitar fecha…) de 36 px de alto, borde de baja intensidad; el chip activo pasa a índigo suave con texto en negrita y sin contorno.
- Hoja de posponer, hoja de alarma exacta y aviso de permiso: tarjeta inferior con radio superior de 1,5 rem, relleno `space-lg`, sombra de nivel 3 y velo con desenfoque (8 px) sobre el contenido; el botón atrás de Android sigue cerrándolas.
- Botones «Guardar», «Borrar» (error) y secundarios con alturas, radios y estados (pulsado, deshabilitado, foco) del diseño; el diálogo de borrar usa el estilo de modal de nivel 3.
- Banner de alarmas con identidad ámbar suave y botones acordes.

### US-010-05 — Pantallas de sistema (P2)

**Como** usuario, **quiero** que el bloqueo con huella y la pantalla de sesión mantengan la misma identidad, **para** que la primera impresión también sea la de la marca.

**Criterios de aceptación:**
- Oferta de huella, pantalla de bloqueo, aviso de desactivado automático y pantalla de estado de sesión (cargando, error, reintentar) usan insignia de color, `headline-md`, botones de 52 px y la profundidad del diseño.
- **SIN TRABAJO — resuelto en plan**: la barra de estado de Android ya muestra iconos claros sobre fondo oscuro y oscuros sobre fondo claro con arranque en frío; se verifica en la revisión en Android (cambiar el tema con la app abierta es una limitación conocida del emulador).
- La pantalla de bloqueo sigue sin mostrar ningún dato de la app.
- Los textos y las acciones actuales no cambian.

### US-010-06 — Sin regresiones y con contraste en ambos temas (P1)

**Como** usuario, **quiero** que el nuevo aspecto no rompa nada y se vea bien en claro y en oscuro, **para** poder confiar en la app como hasta ahora.

**Criterios de aceptación:**
- Los tests de la app, los de scripts y las e2e siguen en verde (se actualizan solo los selectores o los textos de estilo que cambien, sin tocar comportamiento).
- Objetivos táctiles ≥ 44 px, sin desbordes horizontales a 390 px y con las zonas seguras respetadas.
- Revisión visual en navegador (390×844) y en emulador Android, en claro y en oscuro, de **todas** las pantallas y estados.
- La app sigue funcionando sin red tras la primera carga (la fuente va empaquetada).

---

## Plan de tests (TDD)

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-010-01 los tokens incluyen la paleta, la escala tipográfica, los radios y las sombras del diseño` | CA 1, 2 y 3 de US-010-01 | `scripts/design-tokens.test.mjs` | estático |
| `US-010-01 la fuente está empaquetada y ningún estilo la pide a un servicio externo` | CA 1 de US-010-01 | `scripts/design-tokens.test.mjs` | estático |
| `US-010-01 el contraste de texto cumple AA en claro y oscuro` | CA 6 de US-010-01 | `scripts/design-tokens.test.mjs` | estático (cálculo de contraste) |
| `US-010-01 con reducir movimiento no hay animaciones de escala` | CA 5 de US-010-01 | `scripts/design-tokens.test.mjs` | estático |
| `US-010-02 el check, la zona táctil y las píldoras de la lista` | CA 2 y 3 de US-010-02 | `src/app/features/tasks/tasks-list/tasks-list.spec.ts` | unit |
| `US-010-02 la lista mantiene sus textos, estados y acciones` | CA 6 de US-010-02 | `src/app/features/tasks/tasks-list/tasks-list.spec.ts` | unit |
| `US-010-03 la barra de nivel y la pastilla de racha conservan su semántica accesible` | CA 1, 2 de US-010-03 | `progress-summary.spec.ts`, `progress-screen.spec.ts` | unit |
| `US-010-03 celebración y subida de nivel mantienen textos y acciones` | CA 4, 5 y 6 de US-010-03 | `celebration.spec.ts`, `level-up.spec.ts` | unit |
| `US-010-04 las hojas se cierran con el botón atrás y mantienen sus roles` | CA 3 de US-010-04 | `postpone-sheet.spec.ts`, `task-form.spec.ts` | unit |
| `US-010-05 las pantallas de sistema mantienen textos y acciones` | CA 1 y 3 de US-010-05 | specs de `biometric-*` y `session-status` | unit |
| `US-010-02 las ilustraciones SVG son decorativas (ocultas a lectores de pantalla) y no cargan recursos externos` | CA 6 de US-010-02 | specs de `tasks-list` y `shared/components/illustration` | unit |
| `US-010-06 las e2e siguen en verde` | CA 1 de US-010-06 | `cypress/e2e/*.cy.ts` | e2e |

Revisión visual en navegador con la extensión de Chrome (obligatoria, claro y oscuro, estados vacío, carga, error y foco) y comprobación en Android (emulador, claro y oscuro).

---

## Ficheros afectados

**Crear:**
- `scripts/design-tokens.test.mjs`
- `src/app/shared/components/illustration/` (ilustraciones SVG propias, componente decorativo)
- Fuente empaquetada (por confirmar en `/sdd-plan`: paquete con versión exacta o ficheros en `public/fonts/`)

**Modificar (estilos y plantillas; por confirmar en `/sdd-plan`):**
- `src/styles/_tokens.scss`, `src/styles.scss`, `angular.json` (recursos de la fuente) y `package.json` si se usa paquete
- `src/app/features/tasks/tasks-list/*`, `task-form/*`, `postpone/postpone-sheet/*`, `alarms/*` (banner, hoja de alarma exacta, aviso de permiso)
- `src/app/features/progress/progress-summary/*`, `progress-screen/*`, `level-up/level-up.ts`, `celebration/celebration.ts`
- `src/app/shared/components/biometric-*/*`, `session-status/*`, `icon/icon.ts` (si hace falta algún icono de rol)
- `src/app/features/dev/*-preview.ts` si hace falta para ver estados
- `cypress/e2e/*.cy.ts` solo si cambian selectores

**Supabase / Tauri / Android:** ninguno.

---

## Restricciones técnicas

- **Cero funcionalidad nueva**: no se añaden prioridades, categorías, repetición, «Reclamar XP», barra de navegación, ni nada que el diseño mencione y la app no tenga. Los textos, cantidades y comportamientos actuales no cambian.
- Fidelidad al diseño en colores, formas, tipografía, sombras y forma de mostrar los elementos; si el diseño y el comportamiento actual chocan, manda el comportamiento y se anota.
- La fuente va empaquetada (versión exacta, licencia abierta) y respeta el límite de tamaño inicial de la app.
- Tema oscuro solo por `prefers-color-scheme` (como hasta ahora).
- Mobile first: objetivos ≥ 44 px, zonas seguras, sin hover como única interacción, teclado virtual considerado.
- Un solo documento de diseño de referencia: `specs/_design/playful-momentum/DESIGN.md`.
- Sin secretos, rutas locales ni datos personales en la spec ni en los recursos.

---

## Out of scope

- Funcionalidad nueva de cualquier tipo (ver restricciones).
- Pantallas nuevas o cambios de navegación: crear y editar siguen siendo pantallas completas (no hoja inferior).
- Ilustraciones complejas o animadas (Lottie), recursos externos, sonido y vibración.
- Cambios en datos, Supabase, alarmas nativas o lógica de progreso .
- Selector de tema manual (claro/oscuro) y personalización de colores.
