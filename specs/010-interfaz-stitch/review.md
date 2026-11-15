# Revisión — Spec 010: interfaz fiel al sistema de diseño de Stitch

**Fecha**: 2026-11-14 · **Ciclo**: simple (sin revisión cruzada) · **Referencia**: `specs/_design/playful-momentum/DESIGN.md`

## Comprobaciones

| Comprobación | Resultado |
|---|---|
| Coherencia spec → plan → tareas → código | Los 6 bloques del plan implementados y commiteados por separado |
| `pnpm lint:fix`, `pnpm format`, `pnpm type-check`, `pnpm secrets:check` | Sin errores |
| `pnpm test:ci` | 584 tests de la app en verde (569 al cerrar la lista: +15 de gamificación y avisos) |
| `pnpm test:scripts` | 105 en verde (`design-tokens.test.mjs`: 27 tests, escritos en rojo antes de cada bloque) |
| `pnpm e2e` | 42/42 en verde sin tocar ninguna prueba |
| `pnpm build` | Sin avisos; total inicial 497,99 kB (el aviso salta a 500 kB: margen justo) |
| Fuente | Empaquetada (47 kB en dos `woff2`), sin referencias a servicios externos en el build |
| Navegador (390×844, claro) | Lista (grupos, completadas, vacío, error, carga, foco), progreso, celebración, subida de nivel, formulario, posponer, borrar, alarmas, huella y sesión: sin desborde horizontal, botones ≥ 44 px y consola limpia |
| Emulador Android, arranque en frío, **claro** | Lista, resumen, píldoras, check y botón flotante correctos |
| Emulador Android, arranque en frío, **oscuro** | Lista, progreso, formulario y hoja de posponer correctos; barra de estado con iconos claros |
| Emulador Android **sin red** (APK de depuración x86_64, arranque en frío) | La app abre con Plus Jakarta Sans aplicada y la ilustración del estado de error: la fuente va dentro del APK |

## Discrepancias diseño ↔ comportamiento (manda el comportamiento)

- El diseño habla de «+25 XP», prioridades, categorías, repetición, «Reclamar XP», barra de navegación inferior y creación en hoja inferior: **no existen en la app y no se añadieron**. Se mantiene +10 XP y crear/editar siguen siendo pantallas completas.
- Chips de **36 px** (diseño) con zona táctil de **44 px** (regla del proyecto) mediante un pseudo-elemento; protegido por test.
- Botón primario en oscuro: blanco sobre `#6366F1` = **4,47:1** (3 centésimas bajo AA). Se mantiene el color del diseño y queda como excepción explícita en el test. El texto de color primario sobre fondo oscuro usa `--color-primary-text` (`#c0c1ff`, el `inverse-primary` del diseño).
- El borde del check sin completar usa el violeta claro del diseño (`#c0c1ff`, `primary-fixed-dim`): su contraste de borde (≈ 1,7:1 sobre blanco) queda por debajo de los 3:1 recomendados para componentes. Se mantuvo por fidelidad; el control tiene nombre accesible y zona táctil de 44 px. **Decisión del usuario (2026-11-14): se deja como está.**
- La subida de nivel es una ruta propia, no un overlay sobre la lista: no hay contenido detrás que desenfocar; se emula con un halo radial y una tarjeta con sombra de nivel 3.
- Cifras de estadísticas en `headline-md` y no en `display-lg` (con «6 días seguidos» a 36 px no cabe en 390 px).
- La barra de estado de Android **no necesitó ajuste nativo** (la decisión del `/clarify` se revisó en `/sdd-plan`): con arranque en frío es correcta; el fallo visto era un artefacto de cambiar el tema en caliente. `src-tauri/gen/` no se versiona.

## Ajustes técnicos

- Presupuesto de estilos de componente: aviso 4 kB → **8 kB** y error 8 kB → **12 kB** (los mixins se expanden en cada componente: la lista pasa de 5,3 a 6,7 kB). Los avisos previos (formulario y lista) ya existían.
- `prefers-reduced-motion` pasa a una regla global en `styles.scss` (el indicador de carga solo se ralentiza); se quitaron las reglas sueltas por componente.
- Los destellos SVG aceptan variables CSS (`--spark-1..3`) para tener contraste sobre fondos ámbar.

## Detectado fuera de alcance (no se tocó)

- Cambiar el tema del teléfono con la app abierta deja la barra de estado con el color anterior hasta reabrir (limitación conocida, documentada en `docs/setup-android.md`).
- El total inicial de JavaScript está a 2 kB del aviso de 500 kB: conviene vigilarlo en las próximas specs.
