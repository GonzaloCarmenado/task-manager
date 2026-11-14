# CLAUDE.md — task-manager

> Nombre provisional (tomado del directorio). Renombrar cuando se defina el producto.

Aplicación **móvil (Android)** construida con Angular + Tauri 2. La funcionalidad se diseña y valida **siempre pensando en móvil**.

---

## Registro de interacciones (CRITICO — leer siempre)

Todas las interacciones usuario ↔ Claude quedan registradas en `docs/interacciones.md`.

### Qué se registra

- **Cada turno** del usuario: una línea con fecha, resumen de lo pedido y resultado.
- **Cada pregunta que Claude hace al usuario** (incluye `AskUserQuestion` y preguntas en texto plano), clasificada en una de dos categorías:

| Categoría | Código | Qué es | Ejemplos |
|---|---|---|---|
| **Funcional** | `F` | Necesaria para la funcionalidad: aclarar una especificación, tomar una decisión de diseño/producto/técnica concreta | "¿El filtro es por fecha o por estado?", "¿Usamos IndexedDB o SQLite?" |
| **Flujo** | `W` | Necesaria para el flujo de trabajo, sin contenido de producto | "¿Hago commit?", "¿Sigo implementando?", "¿Abro la PR?" |

### Contadores

Al inicio de `docs/interacciones.md` hay una tabla de contadores (`Preguntas F`, `Preguntas W`, `Turnos del usuario`). **Se actualiza en el mismo turno** en que se hace la pregunta o se recibe el turno, antes de dar la respuesta final.

### Reglas

- Si una pregunta mezcla ambas categorías, se divide en dos y se cuenta cada una.
- Si Claude puede resolver la duda con un valor por defecto razonable, **no pregunta**: lo aplica y lo menciona. Preguntar menos es un objetivo; el contador existe para medirlo.
- Preguntas de flujo: solo las exigidas por las reglas de este fichero (commit, push, PR, aprobar spec). No preguntar "¿sigo?" entre pasos de un plan ya aprobado.
- El comando `/stats` resume los contadores actuales.

---

## Stack

Heredado de un proyecto de referencia privado anterior, con las diferencias indicadas.

| Tecnología | Versión | Uso |
|---|---|---|
| Angular | ^22 | Standalone components, Signals, OnPush |
| **Sin Angular Material** | — | UI propia con SCSS (tokens/variables CSS). No instalar `@angular/material` |
| Tauri | ^2 | **Solo Android** (`tauri android dev/build`). Sin builds desktop |
| pnpm | 11 | Gestor de paquetes — **NUNCA** usar npm ni yarn |
| Vitest | ^4 | Unit testing |
| ESLint + typescript-eslint + Prettier | — | Lint y formato |
| Husky + lint-staged | — | Pre-commit: lint, lint-staged y tests |
| Supabase JS + CLI | ^2 / 3 | Backend (spec 002). Esquema solo por migraciones versionadas; la CLI 3.x apunta a **local** por defecto, los scripts `db:*` usan `--remote`. Ver `docs/supabase.md` |

### Cuenta de Supabase (CRITICO)

- Este proyecto usa **exclusivamente** la cuenta de Supabase **del propietario del proyecto** (el correo y los identificadores de organización no se escriben en el repo por ser público: están en la memoria local de Claude). La CLI es global a la máquina, así que puede estar iniciada con otra cuenta.
- **Antes de cualquier comando de Supabase contra el remoto** (`link`, `db push`, `db pull`, `projects *`, `orgs *`, `gen types`, edge functions…) comprobar que la CLI está en la cuenta correcta. La CLI no tiene `whoami`: se verifica con `supabase orgs list`/`projects list`: la organización debe coincidir con el identificador guardado en la memoria local (**no por nombre**: otras cuentas tienen organizaciones con el mismo nombre) y, una vez vinculado, el *project ref* del repo debe aparecer en `supabase projects list`.
- Si no se puede confirmar que es la cuenta correcta: **parar, avisar al usuario y no ejecutar nada contra el remoto**. No adivinar ni usar otro proyecto "parecido".
- Cambio de cuenta (lo hace el usuario): Claude ejecuta `npx supabase logout --yes` (el `!` y la herramienta Bash son **no TTY**, sin `--yes` falla). El `login` automático **no funciona desde `!` ni desde Claude**: el usuario lo ejecuta en una terminal normal fuera de Claude con `npx supabase login` (abre el SSO en el navegador; iniciar sesión con la cuenta del propietario, usando el perfil/ventana de esa cuenta). Claude nunca lee ni copia el token de acceso ni acepta `--token` pegado en el chat.
- Nunca ejecutar comandos de Supabase contra proyectos de otras cuentas/organizaciones: no pertenecen a esta app.

### Identidad y datos por usuario (spec 003)

- La app crea sola una **sesión anónima** de Supabase (sin registro); el registro y el login llegan con la spec de cuenta. Detalles en `docs/supabase.md`.
- **Toda tabla de datos de usuario** lleva `user_id` y RLS con `auth.uid()` en la misma migración.
- Solo `AuthAccessService` (`core/services/auth.access.service.ts`) toca `supabase.auth`. **No usar `getSession()` para decidir el arranque** (sin red y con token caducado tarda ~25 s y devuelve `null`): la sesión guardada se lee directamente.
- **`ready` significa que hay identidad, no conexión ni token vigente.** Las capas de datos aplican plazos propios, tratan los 401 y el modo sin red, e **indexan datos y cachés por `userId()`**.
- Tras actualizar `@supabase/supabase-js`, ejecutar `pnpm verify:supabase` (manual).

### Móvil primero

- La app final es **solo Android** vía Tauri. No hay versión web como entregable.
- `pnpm start` (ng serve) existe **solo para iterar rápido** con la extensión de Claude en Chrome. Usar viewport móvil (≈ 390×844).
- Todo diseño es mobile-first: targets táctiles ≥ 44 px, safe-areas (`env(safe-area-inset-*)`), sin hover como interacción única, gestos y teclado virtual considerados.
- Una feature no está "hecha" hasta comprobarla en Android (emulador o dispositivo) con `pnpm tauri android dev`.
- APIs nativas (ficheros, notificaciones, etc.) se acceden mediante plugins de Tauri detrás de un servicio; en navegador el servicio debe degradar con gracia.

### Bloqueo con huella (spec 004)

- Es un **bloqueo de pantalla**, no cifra nada: ningún texto promete cifrado ni seguridad fuerte.
- Solo `BiometricAccessService` toca el plugin (carga diferida, solo Android); el estado vive en `BiometricLockService`. El plugin y su crate van con **versión exacta** y el permiso es solo `biometry:default` en `capabilities/mobile.json`.
- La pantalla de bloqueo no muestra datos de la app. Los textos del aviso del sistema siguen el idioma del teléfono.

### Alarmas de tareas (spec 006)

- Solo `AlarmsAccessService` (`features/tasks/alarms/`) habla con el plugin de avisos; envía siempre el conjunto **completo** de avisos (`schedule_alarms`).
- La programación, restauración tras reinicio y publicación de la notificación son **código nativo propio** del plugin local `src-tauri/plugins/app-settings`; `tauri-plugin-notification` (versión exacta) solo pide el permiso y crea el canal. No programar avisos con el plugin oficial: no restaura tras reiniciar. Detalles en `docs/setup-android.md`.

### Progreso y gamificación (spec 008)

- El progreso (XP, tope diario, racha) lo **calcula la base de datos** con disparadores sobre `tasks`; el cliente solo envía el **día local** (`completed_day`) y lee `get_progress`. `player_stats` y `xp_events` son de solo lectura desde el cliente. Detalles en `docs/supabase.md`.
- Solo `ProgressAccessService` (`features/progress/`) habla con `get_progress`; el nivel se calcula en el cliente (`ProgressConstructorService`).
- **Orden de despliegue**: las migraciones `tasks_postponed_count` (007) y `progress` (008) se aplican **antes** de ejecutar el cliente contra el remoto (el cliente exige `postponed_count` y envía `completed_day`).
- Pruebas reales (manuales, contra el remoto): `pnpm verify:rls` y `pnpm verify:progress`.

### Revisión visual obligatoria en el navegador (CRITICO)

- **OBLIGATORIO**: todo diseño (pantalla, componente, estilo, estado visual) se revisa en el navegador con la **extensión de Claude en Chrome sincronizada** (`mcp__claude-in-chrome__*`; invocar antes la skill `claude-in-chrome`).
- Flujo: arrancar `pnpm start`, abrir `http://localhost:4200` en una pestaña nueva, redimensionar a viewport móvil (≈ 390×844), navegar, capturar y revisar el resultado antes de darlo por terminado.
- Revisar como mínimo: layout y espaciado, tema claro y oscuro, estados (vacío, carga, error, foco), targets táctiles ≥ 44 px, safe-areas y desbordes/scroll horizontal. Leer también la consola por errores.
- Ningún cambio visual se propone para commit sin esta revisión. Si la extensión no está conectada o falla, **parar y avisar al usuario**; no sustituirla por suposiciones.
- Esta revisión no sustituye la comprobación en Android (emulador/dispositivo): ambas son necesarias.
- Las specs con UI incluyen la revisión en navegador como paso explícito de su plan de pruebas.

---

## Seguridad y secretos (CRITICO — repo público)

El repositorio es **público** en GitHub. **Jamás, bajo ningún concepto**, se escribe en ficheros versionados, commits, issues, PRs, logs, capturas ni en el chat:

- Contraseñas (BBDD, cuentas), tokens de acceso (Supabase `sbp_…`, GitHub, etc.), claves `service_role`/secretas, claves privadas, keystores o certificados.
- URLs privadas, cadenas de conexión, *project refs* o ids de organización, correos o datos personales, rutas locales del disco del usuario y nombres de proyectos/clientes privados.
- Solo es público por diseño lo que ya viaja dentro del APK (URL pública de Supabase y clave *publishable*), y aun así vive en `src/environments/environment.ts` (ignorado por git) y se documenta con `environment.example.ts` y placeholders.

Reglas operativas:

1. Los secretos viven en ficheros ignorados (`.env*`, `environment.ts`, `supabase/.env*`) o en el gestor de credenciales del usuario. Nunca se piden ni se leen valores secretos en el chat: los pega el usuario directamente en el fichero.
2. `pnpm secrets:check` escanea ficheros versionados y pendientes; corre en el pre-commit y **antes de proponer cualquier commit** hay que ejecutarlo y revisar el diff a mano (`git diff --cached`).
3. Cualquier cosa dudosa en un diff = parar y preguntar; no se commitea "para limpiar luego".
4. Si algo sensible llegó a publicarse: **rotar la credencial primero**, y solo después valorar reescribir el historial (requiere confirmación explícita; es destructivo).
5. Los ficheros de memoria, specs y el log de interacciones también son públicos: usar referencias genéricas ("la cuenta del propietario", "proyecto privado anterior").
6. La base de datos solo cambia por **migraciones versionadas** en `supabase/migrations/` (sin datos reales ni seeds con información personal). Quien clone el repo debe poder crear sus tablas con `db push` en su propio proyecto.
7. **Nunca rutas de la máquina del usuario** en código, docs, specs, comandos, logs ni commits: ni rutas que empiecen por una letra de unidad de disco, ni carpetas personales del sistema (`home` o `Users` seguidas del nombre de usuario), ni nombres de usuario del sistema. Usar placeholders (`<ruta del Android SDK>`, `$ANDROID_HOME`) y variables de entorno. Los correos solo pueden ser genéricos o `noreply`.
8. **Auditoría obligatoria antes de cada commit y de cada push**, y no basta con el escáner:
   - `pnpm secrets:check` (detecta tokens, contraseñas, claves, **rutas locales y correos personales**) y revisar a mano `git diff --cached`.
   - Antes del push, revisar también lo que viaja: `git log -p origin/main..HEAD` y las URLs nuevas. Los mensajes de commit y los cuerpos de PR también son públicos.
   - El escáner **no** detecta URLs privadas, nombres de proyectos/clientes ni ids de cuentas: eso se revisa a mano siempre.
9. Las salidas de herramientas (informes de `reports/`, logs de hooks, errores de CLI) suelen contener rutas locales, correos o ids de cuenta: **no se pegan en el repo** (specs, docs, log de interacciones). `reports/` y `.review/` están ignorados.
10. Si algo sensible ya se publicó: rotar la credencial (si lo es), reescribir el historial local para que no esté en ningún commit, `git push --force-with-lease` **con confirmación explícita del usuario**, y recordar que los commits antiguos siguen accesibles en GitHub por su hash exacto un tiempo (solo borrar y recrear el repo los elimina del todo).

---

## Reglas de flujo de trabajo (CRITICO — leer siempre)

- **NUNCA hacer commit sin pedir confirmación explícita al usuario.**
- **NUNCA hacer push ni abrir PR sin instrucción explícita del usuario.**
- **SIEMPRE** ejecutar `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci` antes de proponer commit.
- Si los tests fallan, corregir antes de continuar — nunca proponer commit con tests rotos.
- Un "dale" a un plan o spec **no autoriza** commit/push automático.
- Pedir confirmación de commit/push/PR cuenta como pregunta `W` en `docs/interacciones.md`.

### Comandos clave

```bash
pnpm start                 # ng serve — solo para pruebas rápidas en navegador
pnpm test                  # Vitest en watch
pnpm test:ci               # Vitest sin watch
pnpm test:scripts          # tests de los scripts de ayuda (node --test)
pnpm lint:fix && pnpm format
pnpm secrets:check        # escaneo de secretos (también en pre-commit)
pnpm verify:rls            # prueba REAL de RLS de `tasks` con dos sesiones anónimas (manual, contra el remoto)
pnpm env:init              # crea src/environments/environment.ts (ignorado) desde el ejemplo
pnpm db:new <nombre>       # nueva migración SQL
pnpm db:push:dry           # simula la subida de migraciones (siempre --remote)
pnpm db:push               # aplica migraciones al proyecto remoto vinculado
pnpm type-check
pnpm tauri android dev     # App en emulador/dispositivo Android
pnpm tauri android build   # APK/AAB
```

### Comandos de Claude (`.claude/commands/`)

Pipeline SDD+TDD (portado del proyecto de referencia; sustituye a Spec Kit, que se retiró):

```
/specify → /clarify → [/stitch-prompt] → /sdd-plan → /task → /implement → /pr-review
```

| Fase | Comando | Artefacto | Cuándo parar |
|---|---|---|---|
| 1. Especificación | `/specify` | `specs/NNN-nombre/spec.md` | Esperar aprobación del usuario |
| 2. Clarificación | `/clarify` | `clarify.md` (cierra con `Estado: CERRADO`) | Esperar respuestas; revisión cruzada automática |
| 3. Diseño (solo si hay frontal) | `/stitch-prompt` | `stitch-prompt.md` | Esperar el diseño de Stitch |
| 4. Plan técnico | `/sdd-plan` | `plan.md` | Esperar aprobación del usuario |
| 5. Tareas | `/task` | `tasks.md` (TDD: Red antes que Green) | Esperar aprobación |
| 6. Implementación | `/implement` | Código + tests + verificación visual | Ante `db push`, borrados o fallos |
| 7. Revisión y PR | `/pr-review` | `review.md` + PR | Confirmación para `gh pr create` |

Otros: `/pr` (abre una PR tras confirmación) y `/stats` (contadores de interacciones). Cada comando registra el turno y las preguntas en `docs/interacciones.md`.

Artefactos por spec: `spec.md`, `clarify.md`, `stitch-prompt.md` (si hay frontal), `plan.md`, `tasks.md`, `review.md`. `/clarify` es siempre obligatorio (mínimo 2 preguntas). La spec declara `**Ciclo**: completo|simple` y `**Frontal**: sí|no`.

### Revisión cruzada con DeepSeek (`scripts/cross-review.mjs`)

Un segundo modelo, con contexto limpio y de solo lectura, revisa el trabajo antes de seguir. Lo lanzan **hooks de Claude Code** (`.claude/settings.json`):

| Cuándo | Qué revisa | Si hay hallazgos graves (alta/media) |
|---|---|---|
| Al guardar un `clarify.md` con `Estado: CERRADO` (hook `hook-clarify`) | `spec.md` + `clarify.md` | **Parar**, resumir al usuario cuáles son válidos y esperar su decisión |
| Antes de cada `git push` (hook `hook-push`) | El diff de la rama contra `origin/main` | **El push se bloquea** hasta que el usuario decida; si sube igualmente: `node scripts/cross-review.mjs accept` y repetir el push |

- Proveedor: `opencode run` con el agente de solo lectura `.opencode/agents/reviewer.md`; si no hay opencode, la API de DeepSeek. Ambos usan `DEEPSEEK_API_KEY` **del entorno del usuario** (nunca en el repo). Reglas del revisor en `AGENTS.md`.
- Al revisor solo llega lo **versionado en HEAD** (copia temporal sin `environment.ts`, `.env`, `supabase/.temp`…). Informes en `reports/cross-review/` (ignorado por git).
- `Ciclo: simple` en la spec salta ambas revisiones (solo mantenimiento sin lógica). `CROSS_REVIEW=0` las desactiva; límite de 20 revisiones al día.
- Si el revisor no está disponible, avisa y el flujo sigue (no bloquea). Los hallazgos son una **segunda opinión**: Claude indica cuáles considera válidos y cuáles no; decide el usuario.
- Los tests del script: `pnpm test:scripts`.

---

## Metodología SDD + TDD

Para cualquier feature con 2+ ficheros afectados: **spec primero, tests después, implementación al final**.

### Ciclo completo

1. Asignar el número siguiente (consultar `specs/README.md`).
2. **Spec**: crear `specs/NNN-nombre-kebab/spec.md` desde `specs/_TEMPLATE/spec.md` (`/specify`).
3. **Esperar aprobación explícita** del usuario ("dale", "ok", "adelante", "vamos").
4. **Clarify**: cerrar ambigüedades antes de planificar. Las preguntas se hacen al usuario y cuentan como `F`; las decisiones se registran en la spec (o en `clarify.md`).
5. **Prompt para Stitch (solo si la spec tiene frontal)**: antes del plan, Claude entrega al usuario un prompt para que Stitch (IA generativa de diseño de Google) genere las pantallas. Reglas del prompt:
   - Solo **funcionalidad necesaria**: pantallas, elementos, estados (vacío, carga, error), acciones y flujos de navegación.
   - **Nada de estilos**: ni colores, tipografías, tamaños, espaciados, radios ni CSS; eso lo decide Stitch con la guía de estilo ya compartida.
   - Una pantalla = qué datos muestra, qué acciones permite y qué ocurre tras cada una.
   - El usuario pasa el prompt a Stitch y trae el resultado; Claude lo incorpora al plan y a la spec. Sin frontal este paso se omite.
   - **La spec manda; el diseño de Stitch es solo referencia.** Todo lo que Stitch añada y no esté en la spec o en el prompt (datos, textos, afirmaciones, elementos de prototipo, funcionalidad inventada) se **ignora sin preguntar**: solo se conserva lo que se pidió. Lo ignorado se anota en `design/README.md` de la spec. No hace falta pedirle a Stitch que regenere las pantallas.
6. **Plan**: diseño técnico (`plan.md`) a partir de spec + clarify + diseño de Stitch; aprobación explícita.
7. **Red** — escribir los tests derivados de los criterios de aceptación y ver que fallan por el motivo correcto.
8. **Green** — implementar lo mínimo para que pasen.
9. **Refactor** — limpiar con los tests en verde.
10. Repetir 7–9 por cada historia de usuario, en orden de prioridad (P1 → P2 → P3).
11. Ejecutar `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci`.
12. Revisar el diseño en el navegador con la extensión de Chrome (obligatorio) y comprobar en Android los criterios visuales.
13. Pedir confirmación antes de `git commit`, luego antes de `git push` (el hook lanza la revisión cruzada del diff), luego antes de abrir PR (`/pr-review`).

### Reglas TDD

- No se escribe código de producción sin un test que falle antes (salvo config, estilos y scaffolding).
- Cada criterio de aceptación de la spec tiene al menos un test trazable (nombre del `it` referencia la US, p. ej. `US-003-01`).
- Un bug se corrige escribiendo primero el test que lo reproduce.
- Commits pequeños por ciclo verde cuando el usuario los apruebe.

### Cuándo aplica

Cualquier cambio que toque **2 o más ficheros** sigue el pipeline completo. Si es mantenimiento sin lógica (texto, estilos, actualizar una librería), la spec puede declarar `Ciclo: simple` (sin revisión cruzada), pero sigue necesitando spec y tests.

### Elementos obligatorios en `spec.md`

Objetivo · Contexto · Historias de usuario con criterios (P1 bloqueante, P2 deseable, P3 opcional) · **Plan de tests** · Ficheros afectados · Restricciones técnicas · Out of scope.

---

## Arquitectura

### Patrón de 3 servicios (obligatorio en cada sub-componente)

```
feature-name/
├── feature-name.ts                       # Componente — orquesta UI, cero acceso a datos
├── feature-name.constructor.service.ts   # Config estática: filtros, acciones, opciones de UI
└── feature-name.access.service.ts        # Único punto de contacto con datos (HTTP/Supabase/Tauri)
```

El componente **nunca** accede a datos ni a APIs nativas directamente. Flujo: `access` → `component` → template.

### Estructura de directorios

```
src/app/
├── core/       guards, models, servicios globales
├── shared/     components (UI propia, sin Material), directives, models, services, utils
└── features/   una carpeta por feature, lazy loaded
src-tauri/      shell Android (Tauri 2)
specs/          especificaciones SDD
docs/           interacciones.md y documentación
```

---

## Convenciones de código

- **Sin `any`**: usar `unknown` + type guard.
- **`ChangeDetectionStrategy.OnPush`** en todos los componentes.
- **Signals** para estado local (`signal`, `computed`, `effect`). Sin `BehaviorSubject` para estado de componente.
- **Standalone components** siempre — sin `NgModule`.
- **Lazy loading** en todas las rutas de features.
- Nomenclatura: `feature-subcomponente.tipo.ts`.
- Componentes de UI propios en `shared/components`, con inputs/outputs tipados y estilos con variables CSS.
- Sin comentarios evidentes; solo donde la lógica no es autoevidente.
- Validar solo en límites del sistema (input de usuario, APIs externas).

### Fechas

```typescript
// CORRECTO — hora local
const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
// MAL — toISOString() usa UTC y desfasa un día
```

### Tests (Vitest)

- Assertions: `toHaveLength`, `toBe`, `toEqual` — nunca `toHaveSize`.
- Mocks de módulos a nivel de módulo; para capturar valores usar `vi.hoisted()`.
- Un `*.spec.ts` por servicio o componente relevante.
- Cobertura objetivo ≥ 80 % en access services.
