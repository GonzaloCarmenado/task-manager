# Tasks 010 — Interfaz fiel al sistema de diseño de Stitch

**Plan**: [plan.md](./plan.md)
**Estado**: Aprobado
**Fecha**: 2026-11-14

> Cada historia sigue TDD: la tarea **(Red)** va siempre antes que la **(Green)**. En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que solo es estilo se protege con el test estático de tokens, los specs de estructura, las e2e y la revisión visual (que es una tarea explícita de cada bloque). **Cero funcionalidad nueva**; conservar los nombres de clase que usan las e2e. Fuente del diseño: `specs/_design/playful-momentum/DESIGN.md`.

---

## Bloque 1 — Base visual: fuente, tokens, tipografía y profundidad (US-010-01, P1)

- [x] T-010-01 (Red): `scripts/design-tokens.test.mjs`: la paleta completa del diseño existe como tokens en claro y en oscuro (superficies, primario y contenedor, secundario ámbar, terciario esmeralda, error, contornos), más radios y espaciado (`margin`, `gutter`, `space-lg`, `space-xl`)
- [x] T-010-02 (Red): mismo fichero: los 4 niveles de profundidad (`--shadow-1`, `--shadow-streak`, `--shadow-xp`, `--shadow-modal`, `--shadow-button`), el velo con desenfoque de 8 px, el degradado de progreso y las alturas de control (52 px y 36 px)
- [x] T-010-03 (Red): mismo fichero: `_type.scss` define los 10 roles tipográficos (display-lg … label-sm) con tamaño, peso, interlineado y espaciado del diseño
- [x] T-010-04 (Red): mismo fichero: la fuente está empaquetada (`angular.json` copia los `woff2` a `/fonts/`, `@font-face` locales con `font-display: swap`, precarga en `index.html`) y ningún estilo ni el HTML pide `fonts.googleapis`, `gstatic` ni `@import url(http`
- [x] T-010-05 (Red): mismo fichero: contraste ≥ 4,5:1 de los pares texto/fondo reales en claro y en oscuro (incluido texto sobre ámbar, esmeralda y primario)
- [x] T-010-06 (Red): mismo fichero: el mixin de botón primario fija 52 px, sombra tintada y escala 0,97 al pulsar; `styles.scss` tiene la regla global `prefers-reduced-motion`; ningún estilo usa `color-mix`
- [x] T-010-07: ejecutar `pnpm test:scripts` y comprobar que T-010-01 a 06 fallan por el motivo correcto (faltan tokens, ficheros y reglas), no por un error del propio test
- [x] T-010-08: instalar la fuente (`pnpm add -D --save-exact @fontsource-variable/plus-jakarta-sans@5.3.0`), comprobar los nombres reales de los `woff2` `latin` y `latin-ext` y la licencia abierta (`package.json`, `pnpm-lock.yaml`)
- [x] T-010-09 (Green): `angular.json`: recursos que copian los dos `woff2` a `/fonts/` y `stylePreprocessorOptions.includePaths: ["src/styles"]`; `src/index.html`: precarga de la fuente `latin`
- [x] T-010-10 (Green): `src/styles/_fonts.scss`: `@font-face` propios (latin y latin-ext, eje de peso 200–800, `unicode-range`)
- [x] T-010-11 (Green): `src/styles/_tokens.scss`: paleta completa del tema claro (cabecera del `DESIGN.md`), radios, espaciado y alturas de control
- [x] T-010-12 (Green): `src/styles/_tokens.scss`: tema oscuro (`#0F0E17`, `#1B1A2E`, `#2E2A56`, primario `#6366F1`, ámbar y esmeralda del diseño) y los 4 niveles de sombra, velo y degradado en ambos temas
- [x] T-010-13 (Green): `src/styles/_type.scss`: mixins de la escala tipográfica y pila de respaldo
- [x] T-010-14 (Green): `src/styles/_mixins.scss`: `card`, `pill-button` (52 px, sombra tintada, escala 0,97), `chip` (36 px), `field` (píldora con anillo de foco), `scrim` (velo con desenfoque y degradación a velo opaco), `sheet` y `pill`
- [x] T-010-15 (Green): `src/styles.scss`: cargar fuentes, tokens y tipografía base; regla global `prefers-reduced-motion` (con el indicador de carga solo ralentizado)
- [x] T-010-16: `pnpm test:scripts` en verde; `pnpm build` sin superar el presupuesto de tamaño; comprobar que `/fonts/…woff2` se sirve y que la fuente aplica en el navegador
- [x] T-010-17 (Refactor): quitar tokens duplicados u obsoletos y valores sueltos que ahora cubren los mixins, con los tests en verde
- [x] T-010-18 *(claro verificado: fuente cargada sin 404, sin desborde y consola limpia; el oscuro no se puede alternar en la extensión: se comprueba en el emulador y con el test de contraste)*: revisión visual en navegador (390×844, claro y oscuro): la app con la nueva base, sin regresiones de layout por el cambio de fuente, consola limpia

---

## Bloque 2 — US-010-02: lista de tareas con tarjetas dinámicas (P1)

- [x] T-010-19 (Red): `shared/components/illustration/illustration.spec.ts`: variantes `hill`, `cloud` y `sparkles`; `aria-hidden="true"`; sin `<image>` ni `href` externos; `ChangeDetectionStrategy.OnPush`
- [x] T-010-20 (Red): `tasks-list.spec.ts`: el check sigue siendo un botón con su `aria-label` y zona ≥ 44 px (círculo visible de 28 px); hora, atraso y aviso son píldoras con su clase; vacío y error muestran ilustración decorativa y conservan textos y acciones
- [x] T-010-21: ejecutar los tests y comprobar que fallan por el motivo correcto (falta el componente y la estructura nueva)
- [x] T-010-22 (Green): `shared/components/illustration/illustration.ts`: SVG inline propio de las 3 variantes con colores por variables CSS
- [x] T-010-23 (Green): `tasks-list.html` y `.scss`: tarjetas de 1 rem con relleno de 16 px y sombra de nivel 1; título en `headline-sm`
- [x] T-010-24 (Green): `tasks-list`: check con círculo de 28 px (borde de 2 px violeta claro), relleno esmeralda con marca blanca y animación de resorte al completar
- [x] T-010-25 (Green): `tasks-list`: píldoras horizontales de hora, atraso (error) y aviso (esmeralda) con micro-etiquetas en mayúsculas; títulos de grupo y contador con la nueva escala; botón de posponer coherente
- [x] T-010-26 (Green): `tasks-list`: botón «Nueva tarea» de 52 px anclado en la zona del pulgar y relleno inferior `space-xl` más la barra; aviso inferior sin solaparse con el botón
- [x] T-010-27 (Green): `tasks-list`: estados vacío (`hill`), carga y error (`cloud`) con título `headline-md` y botón primario, sin cambiar textos ni acciones
- [x] T-010-28 (Refactor): limpiar estilos de la lista con los tests en verde
- [x] T-010-29: revisión visual en navegador (claro y oscuro): lista con grupos y atrasadas, completadas, vacío, carga, error, foco por teclado, títulos largos, 390 px sin desborde, consola limpia
- [x] T-010-30: `pnpm lint:fix && pnpm format && pnpm test:ci` y `pnpm e2e` (`tareas`, `completar-xp`, `posponer`) en verde

---

## Bloque 3 — US-010-03: gamificación con contraste y energía (P1)

- [x] T-010-31 (Red): `progress-summary.spec.ts` y `progress-screen.spec.ts`: la racha es una pastilla con icono y número; la barra conserva `role="progressbar"` y `aria-valuetext`; el aviso de racha viva se conserva
- [x] T-010-32 (Red): `celebration.spec.ts` y `level-up.spec.ts`: mantienen textos, `role="status"`, cierre automático y «Continuar»; incluyen destellos decorativos (`aria-hidden`)
- [x] T-010-33: ejecutar los tests y comprobar que fallan por el motivo correcto
- [x] T-010-34 (Green): `progress-summary`: tarjeta con relleno `space-lg`, nivel en `headline-md`, pastilla de racha ámbar con borde cálido y halo si hay racha viva, barra de 12 px con degradado primario → esmeralda
- [x] T-010-35 (Green): `progress-screen`: hero con número de nivel en `display-lg`, cifras en `label-lg`/`display-lg`, tarjetas de estadísticas con halo, notas en `body-sm`, estados de carga y error
- [x] T-010-36 (Green): `celebration.ts`: píldora flotante con halo (`--shadow-xp` o `--shadow-streak`) y destellos; mismo texto y cierre automático
- [x] T-010-37 (Green): `level-up.ts`: modal de nivel 3 con velo y desenfoque, sombra profunda, número grande, destellos y botón de 52 px
- [x] T-010-38 (Refactor): limpiar con los tests en verde
- [x] T-010-39: revisión visual en navegador (claro y oscuro) con las vistas previas `__dev/progress/*`: usuario nuevo, progreso, racha viva y rota, celebración, tope, subida de nivel, carga y error; sin desborde a 390 px
- [x] T-010-40: `pnpm lint:fix && pnpm format && pnpm test:ci` y `pnpm e2e` (`completar-xp`, `progreso`) en verde

---

## Bloque 4 — US-010-04: formulario y hojas inferiores (P2)

- [x] T-010-41 (Red): `task-form.spec.ts` y `postpone-sheet.spec.ts`: las hojas y el diálogo de borrar conservan `role="dialog"`/`alertdialog` y el cierre con atrás; los chips mantienen `aria-pressed`
- [x] T-010-42 *(los specs de roles, cierre con atrás y `aria-pressed` ya cubren la estructura; la fidelidad de estilo la fijan 8 tests estáticos nuevos en `design-tokens.test.mjs`, en rojo antes del cambio)*: ejecutar los tests y comprobar que fallan por el motivo correcto (o, si ya cubren la estructura actual, documentar que la verificación recae en el test estático y la revisión visual)
- [x] T-010-43 (Green): `task-form`: campos de texto, fecha y hora en píldora con anillo de foco de 2 px, contador y ayudas en `body-sm`
- [x] T-010-44 (Green): `task-form`: chips de 36 px con estado activo en índigo suave; botones «Guardar», «Posponer» y «Borrar» (error) de 52 px; diálogo de borrar como modal de nivel 3
- [x] T-010-45 (Green): `postpone-sheet`: hoja inferior con radio superior de 1,5 rem, relleno `space-lg`, sombra de nivel 3, velo con desenfoque y opciones como tarjetas
- [x] T-010-46 (Green): `alarms-banner`: identidad ámbar suave y botones acordes
- [x] T-010-47 (Green): `exact-alarm-sheet` y `alarm-permission-prompt`: mismo patrón de hoja y velo que posponer
- [x] T-010-48 (Refactor): limpiar con los tests en verde
- [x] T-010-49: revisión visual en navegador (claro y oscuro): crear y editar (vacío, con error de título, con contador pasado, foco, teclado), posponer (opciones, fecha no válida), borrar, avisos y hojas de alarmas con las vistas previas `__dev/alarms/*` y `__dev/postpone/*`
- [x] T-010-50: `pnpm lint:fix && pnpm format && pnpm test:ci` y `pnpm e2e` (`tareas`, `posponer`, `errores`) en verde

---

## Bloque 5 — US-010-05: pantallas de sistema (P2)

- [x] T-010-51 (Red): specs de `biometric-offer`, `biometric-lock-screen`, `biometric-notice` y `session-status`: mantienen textos y acciones; el bloqueo no renderiza datos de la app
- [x] T-010-52 *(los specs de las pantallas de sistema ya cubren textos, acciones y que el bloqueo no muestra datos; la fidelidad de estilo la fijan 4 tests estáticos nuevos, en rojo antes del cambio)*: ejecutar los tests y comprobar que fallan por el motivo correcto (o documentar que ya cubren la estructura y la verificación recae en la revisión visual)
- [x] T-010-53 (Green): `biometric-offer`, `biometric-lock-screen` y `biometric-notice`: insignia, `headline-md`, botones de 52 px y la profundidad del diseño
- [x] T-010-54 (Green): `session-status`: cargando, error y reintentar con la misma identidad y botones del diseño
- [x] T-010-55 (Refactor): limpiar con los tests en verde
- [x] T-010-56: revisión visual en navegador (claro y oscuro) con las vistas previas `__dev/biometric/*` y `__dev/session-status/*`
- [x] T-010-57: `pnpm lint:fix && pnpm format && pnpm test:ci` en verde

---

## Bloque 6 — Cierre y verificación (US-010-06, P1)

- [ ] T-010-58: `pnpm e2e` completo (42 pruebas) en verde; ajustar solo selectores de estilo si algo cambió, sin tocar comportamiento
- [ ] T-010-59: recorrido completo en navegador (claro y oscuro) de **todas** las pantallas y estados, con la consola limpia y objetivos táctiles ≥ 44 px
- [ ] T-010-60: `pnpm build` y comprobar el presupuesto de tamaño; comprobar que la fuente va dentro del APK (sin peticiones de red)
- [ ] T-010-61 *(manual)*: emulador Android con arranque en frío en claro y en oscuro: lista, formulario, hojas, progreso, subida de nivel, bloqueo con huella y barra de estado; con la red desactivada la fuente sigue aplicándose
- [ ] T-010-62: `docs/setup-android.md` y `CLAUDE.md`: fuente empaquetada, mixins de diseño y limitación del cambio de tema en caliente
- [ ] T-010-63: `specs/010-interfaz-stitch/review.md` con lo comprobado, las discrepancias diseño ↔ comportamiento y la lista de lo detectado fuera de alcance; estado de la spec a Implementada y fila del `README`
- [ ] T-010-64: pedir confirmación antes de cada commit, push y apertura de PR

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, cobertura sin bajar
- [ ] `pnpm e2e` en verde (42 pruebas)
- [ ] Criterios P1 de `spec.md` verificados (US-010-01, 02, 03 y 06)
- [ ] Revisión visual en navegador con la extensión de Chrome, en claro y en oscuro
- [ ] Comprobado en el emulador Android (arranque en frío, claro y oscuro, sin red)
- [ ] Ninguna funcionalidad nueva añadida (revisado contra la sección «Out of scope»)
- [ ] Confirmación del usuario antes de cada commit y push
