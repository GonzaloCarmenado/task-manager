# Spec 001 — Scaffolding Angular + Tauri Android

**Rama**: `polyp` (actual)
**Creada**: 2026-11-13
**Estado**: Implementada (pendiente: confirmación de commit)

---

## Objetivo

Dejar un esqueleto ejecutable (Angular sin Material + Tauri 2 solo Android) con lint, formato, tests y hooks, listo para empezar a implementar features con SDD+TDD.

---

## Contexto

- El repo solo contiene `CLAUDE.md`, `docs/`, `specs/` y `.claude/commands/`.
- Entorno detectado: Node 24.15, pnpm 11.9 (el proyecto de referencia usa pnpm 9), Rust 1.93 con los 4 targets Android, SDK de Android con NDK 29 y `adb` disponibles, Java 24.
- Faltan variables `NDK_HOME` y `JAVA_HOME` (Gradle de Android suele requerir JDK 17 o 21).
- Referencia técnica: proyecto privado anterior (eslint.config.js, .prettierrc, .editorconfig, husky, scripts de package.json).

---

## Historias de usuario

### US-001-01 — Proyecto Angular base (P1)

**Como** desarrollador, **quiero** un proyecto Angular 22 standalone con Signals y OnPush, **para** iterar rápido en navegador con viewport móvil.

**Criterios de aceptación:**
- `pnpm start` sirve la app en `http://localhost:4200`.
- `pnpm build` genera `dist/` sin errores.
- No existe `@angular/material` en dependencias; `@angular/cdk` tampoco.
- Componente raíz `App` con `OnPush`, estilos globales con variables CSS (tokens) y `<meta viewport>` con `viewport-fit=cover`.
- Rutas con lazy loading; una feature `home` de ejemplo mínima ("Hola") para verificar el enrutado.
- Estilos base mobile-first: `env(safe-area-inset-*)` aplicado al contenedor raíz.

### US-001-02 — Calidad: lint, formato, tipos (P1)

**Criterios de aceptación:**
- `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check`, `pnpm type-check` funcionan y pasan en limpio.
- Config ESLint/Prettier/EditorConfig copiada de la referencia (`no-explicit-any: warn`, `no-console` salvo warn/error).
- `strict` activado en TypeScript.

### US-001-03 — Tests con Vitest (P1)

**Criterios de aceptación:**
- `pnpm test` (watch) y `pnpm test:ci` (sin watch) funcionan.
- Existe al menos un test real para `App` y otro para el enrutado de `home` (primer ciclo Red → Green documentado en el historial de commits si el usuario aprueba commits separados).
- Cobertura configurada con `@vitest/coverage-v8`.

### US-001-04 — Hooks de pre-commit (P2)

**Criterios de aceptación:**
- Husky + lint-staged: el pre-commit ejecuta `lint`, `lint-staged` y `test:ci`.
- Un commit con lint roto es rechazado.

### US-001-05 — Tauri 2 solo Android (P1)

**Como** desarrollador, **quiero** el shell Tauri configurado únicamente para Android, **para** que la app final sea móvil.

**Criterios de aceptación:**
- `src-tauri/` inicializado con identificador `com.polyp.taskmanager` (provisional, ver Preguntas abiertas).
- `pnpm tauri android init` ejecutado; carpeta `src-tauri/gen/android` generada y versionada o ignorada según decisión.
- `tauri.conf.json`: `frontendDist` → `dist/<app>/browser`, `devUrl` → `http://localhost:4200`, sin sección de ventana de escritorio relevante.
- `pnpm tauri android dev` abre la app en emulador o dispositivo y muestra la pantalla `home`.
- `pnpm tauri android build --debug` produce un APK.
- Scripts `tauri:android:dev` y `tauri:android:build` en `package.json`.
- No se documentan ni se prueban builds desktop.

### US-001-06 — Entorno Android reproducible (P2)

**Criterios de aceptación:**
- `docs/setup-android.md` describe: `ANDROID_HOME`, `NDK_HOME`, `JAVA_HOME` (JDK 17/21), targets de Rust y creación del AVD.
- El comando `pnpm tauri info` no muestra errores de entorno tras seguir la guía.

---

## Plan de tests (TDD)

| Test | Criterio | Fichero | Tipo |
|---|---|---|---|
| `US-001-01 App se crea y usa OnPush` | US-001-01 | `src/app/app.spec.ts` | unit |
| `US-001-01 la ruta "" carga Home lazy` | US-001-01 | `src/app/app.routes.spec.ts` | unit |
| `US-001-01 Home renderiza el título` | US-001-01 | `src/app/features/home/home.spec.ts` | unit |
| `US-001-02 lint/format/type-check` | US-001-02 | script CI (`pnpm lint && pnpm format:check && pnpm type-check`) | verificación |
| `US-001-03 test:ci termina con 0` | US-001-03 | `pnpm test:ci` | verificación |
| `US-001-04 pre-commit rechaza lint roto` | US-001-04 | verificación manual | manual |
| `US-001-05 APK debug se genera` | US-001-05 | `pnpm tauri android build --debug` | manual |
| `US-001-05 app arranca en emulador` | US-001-05 | `pnpm tauri android dev` | manual |

Las historias de infraestructura (02, 04, 05, 06) se verifican con comandos, no con tests unitarios.

---

## Ficheros afectados

**Crear:**
- `package.json`, `pnpm-lock.yaml`, `angular.json`, `tsconfig*.json`
- `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.gitignore`, `.gitattributes`
- `.husky/pre-commit`
- `src/index.html`, `src/main.ts`, `src/styles.scss`, `src/styles/_tokens.scss`
- `src/app/app.ts`, `app.html`, `app.scss`, `app.routes.ts`, `app.config.ts`, `app.spec.ts`
- `src/app/features/home/home.ts`, `home.spec.ts`
- `src-tauri/**` (Cargo.toml, tauri.conf.json, build.rs, src/, capabilities/, icons/, gen/android/)
- `docs/setup-android.md`

**Modificar:**
- `CLAUDE.md` (si el nombre final o los comandos cambian)
- `specs/README.md` (registrar 001)

---

## Restricciones técnicas

- pnpm obligatorio. Versión: se usa la instalada (11.x); se fija `packageManager` acorde.
- Angular ^22 con `@angular/build` (esbuild); Vitest como runner (`ng test` con builder de Vitest o `vitest` directo — se elige el que funcione sin Jasmine/Karma).
- Sin `@angular/material`. Sin `@angular/cdk` por defecto.
- Sin dependencias de runtime innecesarias: solo `@angular/*`, `rxjs`, `tslib`, `zone.js` solo si el scaffold lo exige (valorar zoneless con Signals).
- Tauri 2 con `@tauri-apps/cli` como devDependency; sin plugins hasta que una spec los pida.
- `src-tauri/gen/` y `target/` fuera de git salvo decisión contraria.
- Todo en `OnPush`, standalone, sin `any`.

---

## Preguntas resueltas (2026-11-13)

1. **Nombre e identificador** → aprobado `task-manager` / `com.polyp.taskmanager`. (antes: ¿nombre del producto y `identifier` de Android? (propuesta provisional: `task-manager` / `com.polyp.taskmanager`). Cambiarlo después obliga a regenerar `gen/android`.
2. **Zoneless** → sí. (antes: ¿Angular zoneless (solo Signals, sin `zone.js`)? Recomendado: sí, encaja con Signals/OnPush y reduce peso en móvil.
3. **Prefijo** → `app` / `task-manager`. (antes: prefijo y nombre de la app Angular (propuesta: `app` / `task-manager`)).

---

## Out of scope

- Backend (Supabase u otro) y autenticación.
- Cypress/E2E y CI en GitHub Actions.
- Sistema de diseño completo (solo tokens base y safe-areas).
- Plugins nativos de Tauri.
- Builds de release firmados y publicación.
- Cualquier target que no sea Android.

---

## Verificación realizada

- Red: 6 tests fallan por `Home` inexistente → Green: 6/6 pasan, cobertura 100 %.
- `pnpm lint`, `format:check`, `type-check`, `build`, `test:ci` en verde.
- APK debug generado y ejecutado en AVD `Medium_Phone` (x86_64): se muestra "Hola" respetando la barra de estado.
- Pendiente de comprobar: US-001-04 (rechazo de commit con lint roto) — requiere hacer un commit; `pnpm tauri android dev` interactivo no se probó, sí el APK.
