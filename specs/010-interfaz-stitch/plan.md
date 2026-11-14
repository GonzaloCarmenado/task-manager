# Plan 010 — Interfaz fiel al sistema de diseño de Stitch

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: sistema «Playful Momentum» (`specs/_design/playful-momentum/DESIGN.md`). No hay pantallas nuevas, así que no hay `stitch-prompt.md`.
**Estado**: Implementado
**Fecha**: 2026-11-14

---

## Enfoque técnico

Se trabaja en **capas, de abajo arriba**. Primero la base (fuente empaquetada, tokens completos y un pequeño conjunto de mixins SCSS con la escala tipográfica, las sombras y el patrón de botón/tarjeta/hoja); después cada pantalla consume esa base y solo conserva su disposición. Así la fidelidad al diseño vive en un único sitio y las pantallas no repiten valores sueltos. No cambia ningún componente de lógica ni ningún servicio: solo plantillas (clases y estructura de presentación) y estilos, más un componente decorativo de ilustraciones SVG.

**Fuente.** `@fontsource-variable/plus-jakarta-sans` con **versión exacta** como dependencia de desarrollo (es solo el origen de los ficheros). `angular.json` copia únicamente los dos `woff2` variables necesarios para español (`latin` y `latin-ext`, eje de peso 200–800) a `/fonts/`, y `src/styles/_fonts.scss` declara los `@font-face` propios con `font-display: swap`, `unicode-range` y la pila de respaldo actual. Se precarga la de `latin` desde `index.html`. Ninguna regla pide fuentes a un servicio externo (la app funciona sin red tras la primera carga; en Tauri los ficheros van dentro del APK). No se importa el CSS del paquete (traería todos los subconjuntos).

**Tokens y mixins.** `_tokens.scss` pasa de «solo lo que usan las pantallas» a la paleta completa del diseño (superficies, primario y contenedor, secundario ámbar, terciario esmeralda, error, contornos), en claro (cabecera del `DESIGN.md`, decisión de `/clarify`) y en oscuro (`#0F0E17`, `#1B1A2E`, `#2E2A56`, primario `#6366F1`). Se añaden tokens de profundidad (`--shadow-1`, `--shadow-streak`, `--shadow-xp`, `--shadow-modal`, `--shadow-button`), velo (`--scrim`, desenfoque de 8 px), degradado de progreso, alturas de control (`--control-height: 52px`, `--chip-height: 36px`) y la escala tipográfica como mixins en `src/styles/_type.scss` (`@include type.headline-sm`…), de modo que cada rol tenga tamaño, peso, interlineado y espaciado entre letras idénticos a la tabla del diseño. `stylePreprocessorOptions.includePaths` apunta a `src/styles` para que los componentes importen con `@use 'type'` y `@use 'mixins'` sin rutas relativas largas. Se evita `color-mix` y cualquier función CSS reciente: el WebView de Android puede ser antiguo; el desenfoque (`backdrop-filter`) lleva `-webkit-` y degrada a velo opaco.

**Accesibilidad y movimiento.** Los colores de texto sobre fondo se validan con un test estático de contraste (AA) sobre los pares reales de tokens, en claro y en oscuro. Una regla global `prefers-reduced-motion` neutraliza animaciones y transiciones (con excepción del indicador de carga, que solo se ralentiza). La zona táctil sigue siendo ≥ 44 px aunque el check se vea de 28 px (el botón mide 44 px y el círculo visible es un pseudo-elemento de 28 px).

**Ilustraciones.** Componente decorativo `app-illustration` con tres variantes en SVG inline propio (`hill` para vacío, `cloud` para error, `sparkles` para celebración y subida de nivel), `aria-hidden="true"`, colores por variables CSS (válidas en claro y oscuro) y sin recursos externos.

**Barra de estado de Android (hallazgo de este plan).** La decisión de `/clarify` era incluir un ajuste nativo, pero se ha comprobado en el emulador que con **arranque en frío en modo oscuro** la barra ya muestra reloj e iconos claros. El fallo visto antes era un artefacto de cambiar el tema en caliente en el emulador (la actividad no se recrea). Además `src-tauri/gen/` está ignorado por git (generado), así que un ajuste ahí no se versionaría. **Se retira el ajuste nativo** (US-010-05, criterio 2, «sin trabajo»); se mantiene como comprobación en la revisión en Android. Cambiar el tema del teléfono con la app abierta queda como limitación conocida.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `package.json`, `pnpm-lock.yaml` | Modificar | `@fontsource-variable/plus-jakarta-sans` en `devDependencies` con versión exacta (5.3.0, publicada en julio de 2026) |
| `angular.json` | Modificar | Recursos: copiar los dos `woff2` a `/fonts/`; `stylePreprocessorOptions.includePaths: ["src/styles"]` en `build` |
| `src/index.html` | Modificar | `<link rel="preload" as="font" type="font/woff2" crossorigin>` de la fuente `latin` |
| `src/styles/_fonts.scss` | Crear | `@font-face` propios (latin y latin-ext) |
| `src/styles/_tokens.scss` | Modificar | Paleta completa (claro/oscuro), sombras de 4 niveles, velo, degradado, alturas de control, espaciado `margin/gutter/xl`, radios del diseño |
| `src/styles/_type.scss` | Crear | Mixins de la escala tipográfica (display-lg … label-sm) |
| `src/styles/_mixins.scss` | Crear | `card`, `pill-button` (52 px, sombra tintada, escala 0,97 al pulsar), `chip` (36 px), `field` (píldora con anillo de foco), `sheet` y `scrim` (velo con desenfoque), `pill` (etiqueta) |
| `src/styles.scss` | Modificar | `@use` de fuentes, tokens y tipografía base; regla global de `prefers-reduced-motion` |
| `src/app/shared/components/illustration/illustration.ts` | Crear | Componente decorativo (SVG inline, 3 variantes) |
| `src/app/shared/components/illustration/illustration.spec.ts` | Crear | Variantes, `aria-hidden`, sin recursos externos, OnPush |
| `src/app/features/tasks/tasks-list/tasks-list.scss`, `.html` | Modificar | Tarjetas de 1 rem, check de 28 px visibles con resorte esmeralda, píldoras de hora/atraso/aviso, FAB de 52 px en zona del pulgar, relleno inferior, estados vacío/carga/error con ilustración |
| `src/app/features/tasks/task-form/task-form.scss`, `.html` | Modificar | Campos en píldora con anillo de foco, chips de 36 px, botones de 52 px, diálogo de borrar como modal de nivel 3 |
| `src/app/features/tasks/postpone/postpone-sheet/postpone-sheet.scss` | Modificar | Hoja inferior con radio superior de 1,5 rem, relleno `space-lg`, sombra nivel 3 y velo con desenfoque |
| `src/app/features/tasks/alarms/alarms-banner/*`, `exact-alarm-sheet/*`, `alarm-permission-prompt/*` (scss y, si hace falta, html) | Modificar | Banner con identidad ámbar suave; hojas y aviso con el patrón de hoja/velo y botones del diseño |
| `src/app/features/progress/progress-summary/progress-summary.scss`, `.html` | Modificar | Tarjeta de nivel `space-lg`, pastilla de racha ámbar con halo (racha viva), barra de 12 px con degradado primario → esmeralda |
| `src/app/features/progress/progress-screen/progress-screen.scss`, `.html` | Modificar | Hero con nivel en `display-lg`, cifras en `label-lg`/`display-lg`, tarjetas de estadísticas con halo, estados de error/carga |
| `src/app/features/progress/celebration/celebration.ts` | Modificar | Píldora flotante con halo y destellos SVG (reutiliza `illustration` `sparkles`), mantiene texto y cierre automático |
| `src/app/features/progress/level-up/level-up.ts` | Modificar | Modal de nivel 3: velo con desenfoque, número grande, destellos, botón de 52 px |
| `src/app/shared/components/biometric-offer/*`, `biometric-lock-screen/*`, `biometric-notice/*`, `session-status/*` (scss) | Modificar | Insignia, `headline-md`, botones de 52 px y profundidad del diseño; sin mostrar datos en el bloqueo |
| `src/app/shared/components/icon/icon.ts` | Modificar (solo si hace falta) | Iconos de rol que falten (p. ej. destello) |
| `src/app/features/dev/*-preview.ts` | Modificar (solo si hace falta) | Poder ver cada estado en las vistas previas de desarrollo |
| `scripts/design-tokens.test.mjs` | Crear | Test estático: tokens, tipografía, sombras, fuente empaquetada sin servicios externos, contraste AA, `prefers-reduced-motion`, sin `color-mix` |
| `cypress/e2e/*.cy.ts` | Modificar (solo si cambian selectores) | Los nombres de clase usados por las e2e (`.check`, `.title`, `.group`, `.notice`, `.level`, `.stat`, `.option`, `app-celebration`…) se conservan |
| `docs/setup-android.md`, `CLAUDE.md` | Modificar | Nota breve: fuente empaquetada, mixins de diseño y la limitación del cambio de tema en caliente |
| `specs/010-interfaz-stitch/spec.md` | Modificar | Retira el ajuste nativo (US-010-05 CA 2, sin trabajo) y el test `android-theme` |

---

## Interfaces TypeScript

```typescript
// src/app/shared/components/illustration/illustration.ts
export type IllustrationKind = 'hill' | 'cloud' | 'sparkles';

@Component({
  selector: 'app-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', role: 'presentation' },
  /* SVG inline por variante; colores con var(--color-*) */
})
export class Illustration {
  readonly kind = input.required<IllustrationKind>();
  /** Lado en rem; por defecto 7 (vacío/error) y 4 (celebración). */
  readonly size = input<number>(7);
}
```

No cambian modelos ni servicios.

---

## Esquema SQL

No aplica (sin cambios de datos ni de Supabase).

---

## Pantallas

Sin pantallas nuevas: se rehace la presentación de las existentes, con sus datos, acciones y estados intactos.

| Pantalla | Componente | Qué cambia (presentación) |
|---|---|---|
| Lista de tareas | `tasks-list` | Tarjetas, check de 28 px (zona 44 px), píldoras de hora, atraso y aviso con micro-etiquetas en mayúsculas, FAB de 52 px, relleno inferior `space-xl` + barra; estados vacío (`hill`), carga y error (`cloud`) |
| Resumen de progreso | `progress-summary` | Tarjeta `space-lg`, nivel en `headline-md`, pastilla de racha ámbar con halo si hay racha viva, barra de 12 px con degradado |
| Progreso | `progress-screen` | Hero con `display-lg`, tarjetas de estadísticas, notas en `body-sm`, estados de carga y error |
| Celebración | `celebration` | Píldora con halo (`--shadow-xp` o `--shadow-streak`) y destellos |
| Subida de nivel | `level-up` | Modal de nivel 3 con velo y desenfoque, `display-lg`, destellos, botón de 52 px |
| Crear / editar tarea | `task-form` | Campos píldora, chips de 36 px, botones de 52 px, modal de borrar |
| Posponer | `postpone-sheet` | Hoja inferior con velo y desenfoque, opciones como tarjetas píldora |
| Alarmas | `alarms-banner`, `exact-alarm-sheet`, `alarm-permission-prompt` | Banner ámbar suave; hojas con el mismo patrón que posponer |
| Huella | `biometric-offer`, `biometric-lock-screen`, `biometric-notice` | Insignia, `headline-md`, botones de 52 px; el bloqueo no muestra datos |
| Sesión | `session-status` | Cargando / error / reintentar con la misma identidad |

---

## Estrategia de tests (TDD)

La fidelidad visual no se prueba con aserciones de píxeles: se protege con un **test estático de los tokens** (rojo antes de tocar los estilos), los specs de componentes que verifican estructura, roles y textos, las e2e y la revisión visual obligatoria.

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `scripts/design-tokens.test.mjs` | Existen todos los tokens de paleta (claro y oscuro), radios, espaciado, 4 niveles de sombra, velo y degradado; la escala tipográfica define los 10 roles con los valores del diseño | US-010-01 CA 1–3 |
| `scripts/design-tokens.test.mjs` | La fuente está en `angular.json` (assets `/fonts/`), los `@font-face` son locales y ningún estilo ni `index.html` pide `fonts.googleapis`/`gstatic`/`@import url(http` | US-010-01 CA 1 |
| `scripts/design-tokens.test.mjs` | Contraste ≥ 4,5:1 de los pares texto/fondo reales (claro y oscuro), incluido texto sobre ámbar, esmeralda y primario | US-010-01 CA 6 |
| `scripts/design-tokens.test.mjs` | Botón primario de 52 px y escala 0,97 al pulsar en el mixin; regla global `prefers-reduced-motion`; sin `color-mix` | US-010-01 CA 4–5 |
| `src/app/shared/components/illustration/illustration.spec.ts` | Variantes `hill`/`cloud`/`sparkles`, `aria-hidden`, sin `<image>`/`href` externos, OnPush | US-010-02 CA 6, US-010-03 CA 4 |
| `tasks-list.spec.ts` (ampliar) | Check mantiene `aria-label` y es un botón de zona ≥ 44 px; píldoras de hora/atraso/aviso con su clase; vacío y error muestran ilustración decorativa y conservan textos y acciones | US-010-02 CA 2, 3, 6 |
| `progress-summary.spec.ts`, `progress-screen.spec.ts` (ampliar) | La racha es una pastilla con icono y número; la barra conserva `role="progressbar"` y `aria-valuetext`; el estado `keepAlive` conserva su aviso | US-010-03 CA 1–3 |
| `celebration.spec.ts`, `level-up.spec.ts` (ampliar) | Mantienen texto, `role="status"`, cierre automático y «Continuar»; incluyen destellos decorativos | US-010-03 CA 4–6 |
| `postpone-sheet.spec.ts`, `task-form.spec.ts` (ampliar) | Hojas con `role="dialog"`/`alertdialog`, cierre con atrás, chips con `aria-pressed` | US-010-04 CA 2–3 |
| specs de `biometric-*` y `session-status` (ampliar) | Mantienen textos y acciones; el bloqueo no renderiza datos | US-010-05 CA 1, 3 |
| `cypress/e2e/*.cy.ts` | Las 42 e2e siguen en verde sin tocar comportamiento | US-010-06 CA 1 |

Revisión visual en navegador (extensión de Chrome, 390×844, claro y oscuro, estados vacío, carga, error y foco, consola limpia) tras cada bloque, y comprobación en Android (emulador, claro y oscuro, **arranque en frío** para la barra de estado) al final.

Cobertura: no baja la existente.

---

## Orden de implementación

Cada bloque: **Red** (el test o la verificación que falla) → **Green** → **Refactor** → revisión visual en navegador → `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts` (y `pnpm e2e` al cerrar). No se avanza con un bloque en rojo.

1. **Base (US-010-01, P1)**: `design-tokens.test.mjs` en rojo → instalar la fuente (versión exacta, comprobar los nombres de los ficheros) → `angular.json`, `_fonts.scss`, `_tokens.scss`, `_type.scss`, `_mixins.scss`, `styles.scss`, `index.html` → en verde. Comprobar `ng build` (límite de tamaño) y que la fuente carga sin red.
2. **Lista (US-010-02, P1)**: specs ampliados y `illustration.spec.ts` en rojo → componente `illustration` → `tasks-list` (html y scss).
3. **Gamificación (US-010-03, P1)**: specs ampliados en rojo → `progress-summary`, `progress-screen`, `celebration`, `level-up`.
4. **Formulario y hojas (US-010-04, P2)**: `task-form`, `postpone-sheet`, `alarms/*`.
5. **Sistema (US-010-05, P2)**: `biometric-*`, `session-status`.
6. **Cierre (US-010-06, P1)**: e2e, revisión visual de **todas** las pantallas y estados en claro y oscuro (navegador) y en emulador (arranque en frío en oscuro), `review.md` con las discrepancias diseño ↔ comportamiento, estado de la spec a Implementada.

---

## Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| La fuente no carga offline o la ruta `/fonts/` falla en Tauri | Media | Comprobar en `ng build` y en el emulador sin red; `font-display: swap` con pila de respaldo; test de assets |
| Plus Jakarta Sans es más ancha que la fuente actual y desborda títulos o píldoras | Media | `overflow-wrap: anywhere`, `min-width: 0` en flex, revisión visual con títulos largos a 390 px |
| Contraste insuficiente (texto ámbar o blanco sobre `#6366F1`) | Media | Test AA sobre los pares reales; usar los `on-*` del diseño |
| `backdrop-filter` pesado o sin soporte en WebViews antiguos | Baja | `-webkit-` y degradación a velo opaco (`@supports`) |
| Cambiar clases rompe las e2e o los specs | Media | Conservar los nombres de clase usados; tocar solo estilos y estructura de presentación |
| Animaciones de resorte marean o ignoran «reducir movimiento» | Baja | Regla global `prefers-reduced-motion` y test |
| Alcance: querer «arreglar» funcionalidad al pasar | Media | Cero funcionalidad nueva; lo detectado va a una lista aparte en `review.md` |
| Cambiar el tema del teléfono con la app abierta deja la barra de estado con el color anterior | Baja | Limitación conocida (artefacto del emulador); documentada, no bloquea |
