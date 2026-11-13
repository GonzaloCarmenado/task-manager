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
| pnpm | 9 | Gestor de paquetes — **NUNCA** usar npm ni yarn |
| Vitest | ^4 | Unit testing |
| ESLint + typescript-eslint + Prettier | — | Lint y formato |
| Husky + lint-staged | — | Pre-commit: lint, lint-staged y tests |
| Supabase JS + CLI | ^2 | Backend (spec 002). Esquema solo por migraciones versionadas |

### Cuenta de Supabase (CRITICO)

- Este proyecto usa **exclusivamente** la cuenta de Supabase **del propietario del proyecto** (el correo y los identificadores de organización no se escriben en el repo por ser público: están en la memoria local de Claude). La CLI es global a la máquina, así que puede estar iniciada con otra cuenta.
- **Antes de cualquier comando de Supabase contra el remoto** (`link`, `db push`, `db pull`, `projects *`, `orgs *`, `gen types`, edge functions…) comprobar que la CLI está en la cuenta correcta. La CLI no tiene `whoami`: se verifica con `supabase orgs list`/`projects list`: la organización debe coincidir con el identificador guardado en la memoria local (**no por nombre**: otras cuentas tienen organizaciones con el mismo nombre) y, una vez vinculado, el *project ref* del repo debe aparecer en `supabase projects list`.
- Si no se puede confirmar que es la cuenta correcta: **parar, avisar al usuario y no ejecutar nada contra el remoto**. No adivinar ni usar otro proyecto "parecido".
- Cambio de cuenta (lo hace el usuario): Claude ejecuta `npx supabase logout --yes` (el `!` y la herramienta Bash son **no TTY**, sin `--yes` falla). El `login` automático **no funciona desde `!` ni desde Claude**: el usuario lo ejecuta en una terminal normal fuera de Claude con `npx supabase login` (abre el SSO en el navegador; iniciar sesión con la cuenta del propietario, usando el perfil/ventana de esa cuenta). Claude nunca lee ni copia el token de acceso ni acepta `--token` pegado en el chat.
- Nunca ejecutar comandos de Supabase contra proyectos de otras cuentas/organizaciones: no pertenecen a esta app.

### Móvil primero

- La app final es **solo Android** vía Tauri. No hay versión web como entregable.
- `pnpm start` (ng serve) existe **solo para iterar rápido** con la extensión de Claude en Chrome. Usar viewport móvil (≈ 390×844).
- Todo diseño es mobile-first: targets táctiles ≥ 44 px, safe-areas (`env(safe-area-inset-*)`), sin hover como interacción única, gestos y teclado virtual considerados.
- Una feature no está "hecha" hasta comprobarla en Android (emulador o dispositivo) con `pnpm tauri android dev`.
- APIs nativas (ficheros, notificaciones, etc.) se acceden mediante plugins de Tauri detrás de un servicio; en navegador el servicio debe degradar con gracia.

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
pnpm lint:fix && pnpm format
pnpm secrets:check        # escaneo de secretos (también en pre-commit)
pnpm type-check
pnpm tauri android dev     # App en emulador/dispositivo Android
pnpm tauri android build   # APK/AAB
```

### Comandos de Claude (`.claude/commands/`)

| Comando | Qué hace |
|---|---|
| `/spec` | Crea una spec SDD (con plan de tests) y espera aprobación |
| `/pr` | Prepara y abre una PR tras confirmación |
| `/stats` | Muestra los contadores de interacciones |

### Skills de Spec Kit (`.claude/skills/`, v0.7.3)

Pipeline completo para features **grandes** (instalado con `specify init --ai claude`; plantillas y constitución en `.specify/`):

| Skill | Cuándo |
|---|---|
| `/speckit-constitution` | Enmendar `.specify/memory/constitution.md` (ya rellena: TDD, móvil, sin Material) |
| `/speckit-specify` | Spec de una feature grande |
| `/speckit-clarify` | Opcional, antes del plan: preguntas dirigidas (cuentan como `F`) |
| `/speckit-plan` | Plan técnico (`plan.md`, `data-model.md`) |
| `/speckit-tasks` | Tareas ordenadas por historia; **tests siempre obligatorios** (TDD) |
| `/speckit-analyze` | Opcional: consistencia spec/plan/tasks antes de implementar |
| `/speckit-checklist` | Opcional: checklist de calidad de requisitos |
| `/speckit-implement` | Ejecuta las tareas respetando Red → Green → Refactor |
| `/speckit-taskstoissues` | Convierte tareas en issues de GitHub (solo si el usuario lo pide) |

Uso: specs pequeñas/medianas → `/spec`. Specs grandes → pipeline `speckit-*`. En ambos casos las specs viven en `specs/NNN-nombre/` y rigen las reglas de flujo (sin commit/push/PR sin confirmación). La extensión de git de Spec Kit (auto-commits) **no está instalada** a propósito.

---

## Metodología SDD + TDD

Para cualquier feature con 2+ ficheros afectados: **spec primero, tests después, implementación al final**.

### Ciclo completo

1. Asignar el número siguiente (consultar `specs/README.md`).
2. Crear `specs/NNN-nombre-kebab/spec.md` desde `specs/_TEMPLATE/spec.md` (`/spec`).
3. **Esperar aprobación explícita** del usuario ("dale", "ok", "adelante").
4. **Red** — escribir los tests derivados de los criterios de aceptación y ver que fallan por el motivo correcto.
5. **Green** — implementar lo mínimo para que pasen.
6. **Refactor** — limpiar con los tests en verde.
7. Repetir 4–6 por cada historia de usuario, en orden de prioridad (P1 → P2 → P3).
8. Ejecutar `pnpm lint:fix && pnpm format && pnpm test:ci`.
9. Revisar el diseño en el navegador con la extensión de Chrome (obligatorio) y comprobar en Android los criterios visuales.
10. Pedir confirmación antes de `git commit`, luego antes de `git push`, luego antes de abrir PR.

### Reglas TDD

- No se escribe código de producción sin un test que falle antes (salvo config, estilos y scaffolding).
- Cada criterio de aceptación de la spec tiene al menos un test trazable (nombre del `it` referencia la US, p. ej. `US-003-01`).
- Un bug se corrige escribiendo primero el test que lo reproduce.
- Commits pequeños por ciclo verde cuando el usuario los apruebe.

### Sizing de spec

| Tamaño | Criterio | Artefactos |
|---|---|---|
| Pequeño | 1-4 ficheros, sin cambios de datos | `spec.md` |
| Mediano | 5-10 ficheros | `spec.md` |
| Grande | Nueva entidad / persistencia / feature | `spec.md` + `data-model.md` |

`plan.md` y `tasks.md` solo en specs grandes con dependencias ordenadas.

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

<!-- SPECKIT START -->
Contexto técnico, estructura y comandos: leer el `plan.md` de la spec en curso (`specs/NNN-*/plan.md`).
Principios no negociables: `.specify/memory/constitution.md`.
<!-- SPECKIT END -->
