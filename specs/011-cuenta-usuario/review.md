# Review 011 — Cuenta de usuario

**Rama**: `interaction-logging-claude-md`
**Fecha**: 2026-11-15
**Resultado**: APROBADO (pendiente solo de la revisión cruzada de DeepSeek, sin saldo)

---

## Coherencia documental

| Check | Estado | Notas |
|---|---|---|
| Todos los criterios P1 tienen tarea `[x]` y test | PASS | US-011-01, 02, 03 y 08 con tests unitarios y e2e. US-011-04 (sin recuperación) es «sin trabajo». P2: US-011-05 (cambiar contraseña) y US-011-06 (borrar cuenta) hechas. **US-011-07 (cambiar nombre de usuario) descartada** tras el spike |
| Todos los ficheros del plan aparecen en el diff | PASS | Salvo los de la pantalla «cambiar nombre», eliminada |
| Decisiones de `clarify.md` reflejadas en código | PASS | Usuario + contraseña sin correo, aviso con casilla de «sin recuperación», preguntar qué hacer con las tareas del móvil, recordatorio descartable 14 días, contraseña pedida para cambiarla y borrar |

## Calidad de código

| Check | Estado | Notas |
|---|---|---|
| `pnpm lint:fix && pnpm format` sin errores | PASS | |
| `pnpm secrets:check` sin hallazgos | PASS | Se admite el dominio reservado `cuenta.invalid`; los tests usan constantes en lugar de contraseñas literales |
| `pnpm test:ci` en verde | PASS | 972 tests. Cobertura de `AuthAccessService` y `AccountAccessService`: > 95 % de sentencias |
| `pnpm test:scripts` en verde | PASS | 122 (incluye tokens nuevos, migración de cuenta, paquete inicial, presupuestos y scroll del router) |
| `pnpm e2e` en verde | PASS | 98 pruebas (42 anteriores + 56 nuevas: cuenta, crear, entrar, recordatorio, contraseña, borrar y fidelidad a 390 px) |
| `pnpm type-check` y `pnpm build` | PASS | Build sin avisos tras ajustar presupuestos (ver «Ajustes técnicos») |
| Sin `any` en ficheros nuevos/modificados | PASS | |
| OnPush en componentes nuevos/modificados | PASS | Cada componente lo comprueba en su spec |
| Sin `console.log` de debug | PASS | Las operaciones de cuenta nunca escriben en consola (test explícito) |
| Migraciones con RLS y rollback documentado | PASS | `delete_my_account()`: `security definer`, solo usuarios autenticados no anónimos, rollback al final del fichero. Las tablas de datos ya tenían RLS y borrado en cascada |

## Verificación visual

| Check | Estado | Notas |
|---|---|---|
| Navegador (extensión de Chrome, 390×844, claro y oscuro) | PASS | Cada bloque se revisó con medidas del plan y comparación con `screen.png`/HTML; consola limpia. Se corrigieron: color de la indicación de los campos, iconos rellenos (flechas de `cloud-up`/`cloud-sync`), insignia del escudo, hueco de 16 px del recordatorio, botón «Iniciar sesión» siempre con el color principal |
| Fidelidad automatizada | PASS | `cuenta-fidelidad.cy.ts` comprueba las medidas de todas las pantallas, la zona táctil ≥ 44 px, que no hay desbordes y que la fuente es local |
| Android (emulador, APK debug x86_64, contra el proyecto real) | PASS | Arranque en frío en claro y en oscuro (barra de estado correcta). Con toques reales y teclado virtual: crear cuenta, cerrar sesión, iniciar sesión con tareas locales (traer y descartar), cambiar contraseña, borrar cuenta y entrar sin conexión con «Reintentar ahora». El botón atrás cierra solo la capa de arriba (diálogo, hoja, confirmación) y en un formulario vuelve a la pantalla anterior. La sesión y los datos sobreviven al arranque en frío. El teclado no tapa el campo activo ni el botón principal |

## Remoto (Supabase)

| Check | Estado | Notas |
|---|---|---|
| Migración `account` aplicada | PASS | Aplicada con `db push` tras comprobar la cuenta de la CLI por id de organización |
| `pnpm verify:account` | PASS | Las 11 comprobaciones pasan y no deja usuarios de prueba. En el emulador se creó y se borró desde la propia app una cuenta de prueba; entrar con ella después da «Acceso no válido» |
| Ajustes del panel | PASS | «Confirm email» desactivado. El mínimo de 8 caracteres lo exige el cliente; el del servidor es opcional |

## Revisión cruzada (DeepSeek)

| Revisión | Resultado | Notas |
|---|---|---|
| Spec + clarify | Omitida | La cuenta de DeepSeek no tenía saldo («Insufficient Balance») |
| Diff antes del push | Pendiente | Mismo motivo; si no hay saldo, el push exigirá `node scripts/cross-review.mjs accept` con tu decisión |

## Integridad de la rama

| Check | Estado | Notas |
|---|---|---|
| Rama basada en `origin/main` actualizado | PASS | 29 commits por delante, sin conflictos |
| `git status` limpio | PASS tras el commit de cierre | |

---

## Ajustes técnicos

- **Presupuestos de build** (`angular.json`): aviso del paquete inicial 500 → **560 kB** (era 498; la cuenta añade 28 iconos y siete pantallas; ahora ~540 kB, 135 kB transferidos) y aviso de estilos de componente 8 → **10 kB** (pantalla Cuenta, 8,8 kB). Los errores no cambian. Antes se redujo el inicial en 14 kB cargando la lógica de cuenta bajo demanda (`import()` en `app.ts`).
- **`OverlayBack`** (hojas y diálogos con botón atrás de Android): pila de capas, `close()`/`closeAll()` y distinción de retrocesos propios. Resuelve dos fallos que solo aparecían en navegador real: el `history.back()` de una capa retirada cerraba la de debajo, y el router de Angular (que atiende su `popstate` en un `setTimeout(0)`) pisaba la navegación posterior.
- **Cerrar sesión**: la librería instalada quita la sesión local **antes** de la petición con `scope: 'local'`; por eso no puede «cerrarse a medias». Se rechaza antes de empezar solo si el móvil declara no tener conexión.
- **Scroll entre pantallas** (hallazgo en Android): el WebView conserva el desplazamiento del documento al cambiar de ruta y una pantalla nueva aparecía ya desplazada. El router usa ahora `scrollPositionRestoration: 'top'` (`scripts/router-scroll.test.mjs`), verificado en el emulador.
- **Simulador e2e** (`cypress/support/backend.ts`): varios usuarios, tokens por usuario, `POST /auth/v1/token`, `GET/PUT /auth/v1/user`, `POST /auth/v1/logout` y `rpc/delete_my_account`. `auth-js` reintenta solos los fallos de red: los e2e simulan una caída de varias peticiones.

## Discrepancias diseño ↔ comportamiento

Stitch devolvió prototipo con elementos que **no están en la spec** y se ignoraron (ver `design/README.md`): simuladores de estado, etiqueta «PRIVACIDAD MÁXIMA», rejilla de racha y XP en Cuenta, «Conexión protegida de extremo a extremo», tarjeta «Guarda tu evolución», «¿Has olvidado…?», «Recomendado» y las promesas «100 % seguros», «sincronizar en vivo» y «5 segundos». Textos inexactos corregidos según la spec: «Tus tareas y tu progreso siguen aquí», «redacción sin 100 %» y la nota de que el XP y las completadas no se suman.

Pantallas sin referencia de Stitch (derivadas de Crear cuenta y de la zona de peligro): Cambiar contraseña, Borrar cuenta, diálogo de cerrar sesión (solo HTML), «Con cuenta», hoja de tareas y confirmación de descarte (solo HTML), y la confirmación de «solo completadas».

## Issues encontrados / fuera de alcance

- Con el teclado abierto el WebView panea el viewport visual y la cabecera fija sale por arriba mientras se escribe (comportamiento habitual con teclado superpuesto; el campo activo siempre queda a la vista).
- No se puede cambiar el nombre de usuario ni recuperar el acceso (por decisión y por límite del servicio).
- Al cerrar sesión sin red se avisa y no se cierra; con red inestable, un fallo al revocar el token en el servidor no se reintenta (solo queda sin revocar en ese móvil).
- La celebración o la subida de nivel pendientes se descartan al cambiar de identidad (por diseño).
- El móvil de la mascota (`phone-lock`) y la insignia `lock-reset` son glifos propios, algo más finos que los del diseño.
- Datos huérfanos: las tareas de una identidad anónima descartada al entrar en una cuenta permanecen en el servidor sin dueño accesible (el cliente no las borra).
