# Plan 013 — Publicar el APK de Android en las Releases con GitHub Actions

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: no aplica (sin frontal)
**Estado**: Aprobado
**Fecha**: 2026-11-15

---

## Enfoque técnico

Un único flujo, `.github/workflows/release-android.yml`, con **tres trabajos encadenados** y permisos mínimos por trabajo: **`verify`** (comprueba la etiqueta y pasa los mismos controles que el pre-commit; no usa secretos), **`build`** (genera el APK de Android, lo firma y lo valida; es el único que ve los secretos y solo puede leer el repo) y **`publish`** (solo en etiquetas; el único con `contents: write`, sin secretos de firma: descarga el artefacto y crea o actualiza la Release con `gh`). Separar así limita el daño si una acción de terceros se viera comprometida: quien puede escribir en las Releases no ve la clave, y quien ve la clave no puede escribir.

**Firma sin tocar el proyecto Android generado.** `src-tauri/gen/` está ignorado por git y se regenera en CI con `tauri android init --ci`. En lugar de parchear sus `build.gradle.kts`, se compila el APK de *release* **sin firmar** (`tauri android build --apk --target aarch64`) y se firma **después** con las herramientas del SDK: `zipalign` y `apksigner sign` (las contraseñas se pasan con `--ks-pass env:VAR`, nunca en la línea de comandos) y se verifica con `apksigner verify` y `aapt2 dump badging` (identificador, `versionCode`, `versionName`, ABI y que no sea depurable). La versión se inyecta en la compilación con `--config` (JSON en línea: `version` y `bundle.android.versionCode`), sin editar ficheros.

**Lo comprobable en local se extrae a scripts con tests** (`node --test`, como el resto de `scripts/`): `release-version.mjs` (analiza la etiqueta, calcula `versionName`/`versionCode`, comprueba que coincide con `package.json`, `tauri.conf.json` y `Cargo.toml`), `write-environment.mjs` (genera `environment.ts` desde variables, valida y nunca imprime valores) y `release-ci.mjs` (exige que existan unos secretos y nombra los que faltan). El YAML se prueba con un test estático de texto (sin dependencias nuevas). Las acciones de terceros se fijan por **SHA de commit** (resueltos con `gh api` al implementar). Como `workflow_dispatch` solo aparece con el flujo en la rama por defecto, la ejecución real llega tras fusionar la PR #1; antes se hace un **ensayo local** del proceso de compilar + firmar con un *keystore* desechable.

**Ajustes sobre la spec (decididos en este plan):**
- `versionCode = (MAYOR*10000 + MENOR*100 + PARCHE) * 100 + etapa`, con etapa **99** para la versión final y `N` (1 a 98) para `-rc.N`/`-beta.N`/etc. (0 si el sufijo no termina en número). Así `0.3.0-rc.1` (30001) < `0.3.0` (30099) < `0.3.1` (30199) y se cumple US-013-07. Límite: MAYOR ≤ 99, MENOR ≤ 99, PARCHE ≤ 99 (se rechaza lo que se pase). Se ajusta el criterio de US-013-02 en `spec.md`.
- **Alinear versiones**: hoy `package.json` dice `0.0.0` y `tauri.conf.json`/`Cargo.toml` dicen `0.1.0`. Se sube `package.json` a `0.1.0` (la guarda exige que las tres coincidan con la etiqueta).
- `workflow_dispatch` solo se admite desde `main` (misma regla que las etiquetas) y usa la versión `X.Y.Z-dev.<nº de ejecución>`.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `.github/workflows/release-android.yml` | Crear | Flujo con los trabajos `verify`, `build` y `publish` |
| `scripts/release-version.mjs` | Crear | Funciones puras + CLI `resolve`: etiqueta → versión, `versionCode`, ¿previa?; comprueba las tres versiones del proyecto |
| `scripts/release-version.test.mjs` | Crear | Tests del anterior |
| `scripts/write-environment.mjs` | Crear | Genera `src/environments/environment.ts` desde `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` con validación |
| `scripts/write-environment.test.mjs` | Crear | Tests: genera, falla sin variables o con `service_role`, nunca imprime valores |
| `scripts/release-ci.mjs` | Crear | CLI `require NOMBRE…`: falla nombrando los secretos que faltan, sin imprimir valores |
| `scripts/release-ci.test.mjs` | Crear | Tests del anterior |
| `scripts/release-workflow.test.mjs` | Crear | Test estático del YAML (disparadores, permisos, orden, secretos, SHA, limpieza) |
| `scripts/docs-release.test.mjs` | Crear | Los documentos no llevan secretos, rutas locales ni identificadores |
| `docs/instalacion.md` | Crear | Instalar y actualizar desde las Releases; comprobar la suma SHA-256 |
| `docs/release.md` | Crear | Mantenimiento: crear el *keystore*, secretos, copia de seguridad, publicar, qué pasa si se pierde, límites de Supabase compartido |
| `package.json` | Modificar | `version` a `0.1.0` |
| `CLAUDE.md` | Modificar | Sección «Publicación de Android (spec 013)» y regla de secretos de CI |
| `docs/setup-android.md` | Modificar | Enlace a `docs/release.md` e `instalacion.md` |
| `specs/README.md`, `docs/interacciones.md` | Modificar | Índice y registro |
| `specs/013-release-android/spec.md` | Modificar | Ajuste del criterio del `versionCode` |

No cambian: el código de la app, Supabase y `src-tauri/` (la versión de `tauri.conf.json` y `Cargo.toml` ya es `0.1.0`).

---

## Interfaces (scripts, en JavaScript con JSDoc)

```javascript
// scripts/release-version.mjs
/** @typedef {{ major: number, minor: number, patch: number, pre: string | null }} Tag */
/** @typedef {{ version: string, versionCode: number, prerelease: boolean }} Release */

/** 'v0.3.0' o 'v0.3.0-rc.1' → Tag; lanza Error si no es vMAYOR.MENOR.PARCHE[-sufijo] o supera 99. */
export function parseTag(tag) {}

/** versionName = «0.3.0-rc.1»; versionCode = (MAYOR*10000 + MENOR*100 + PARCHE)*100 + etapa (99 final; N de «-rc.N»; 0 si no hay número). */
export function releaseOf(tag) {}

/** Devuelve la lista de diferencias (vacía = coherente) entre la versión de la etiqueta y las tres del proyecto. */
export function versionMismatches(release, { packageJson, tauriConf, cargoToml }) {}

/** CLI: resolve --event push|workflow_dispatch --ref <ref> --run-number <n> → escribe version, version_code, prerelease, tag en $GITHUB_OUTPUT. */
```

```javascript
// scripts/write-environment.mjs
/** Valida y construye el contenido de environment.ts. Lanza Error (que nombra la variable, nunca su valor) si algo falta o no es válido. */
export function buildEnvironment(env) {}   // → string
/** Escribe el fichero (la ruta se inyecta para poder probarlo). */
export function writeEnvironment(env, target) {}
// Reglas: URL https; clave publishable `sb_publishable_…` o JWT con rol `anon`; se rechaza `sb_secret_…` y un JWT con rol `service_role`.
```

```javascript
// scripts/release-ci.mjs
/** Nombres de las variables ausentes o vacías (no devuelve valores). */
export function missing(env, names) {}
```

---

## Esquema SQL

No aplica (sin cambios de base de datos).

---

## El flujo (`release-android.yml`)

```yaml
name: Release Android
on:
  push:
    tags: ['v[0-9]+.[0-9]+.[0-9]+', 'v[0-9]+.[0-9]+.[0-9]+-*']
  workflow_dispatch:
permissions: {}                      # sin permisos por defecto; cada trabajo declara los suyos
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false          # nunca se cancela una publicación a medias

jobs:
  verify:
    if: github.event_name == 'push' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions: { contents: read }
    outputs:
      version: ${{ steps.release.outputs.version }}
      version_code: ${{ steps.release.outputs.version_code }}
      prerelease: ${{ steps.release.outputs.prerelease }}
      tag: ${{ steps.release.outputs.tag }}
    steps:
      - uses: actions/checkout@<SHA>          # fetch-depth: 0, persist-credentials: false
      - uses: pnpm/action-setup@<SHA>         # versión de packageManager
      - uses: actions/setup-node@<SHA>        # node 24, caché de pnpm
      - run: git merge-base --is-ancestor "$GITHUB_SHA" origin/main   # solo en push de etiquetas
      - id: release
        run: node scripts/release-version.mjs resolve --event "$EVENT" --ref "$GITHUB_REF" --run-number "$RUN_NUMBER"
        env: { EVENT: "${{ github.event_name }}", RUN_NUMBER: "${{ github.run_number }}" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm secrets:check && pnpm lint && pnpm type-check && pnpm test:ci && pnpm test:scripts

  build:
    needs: verify
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<SHA>          # persist-credentials: false
      - pnpm/action-setup, actions/setup-node (24), actions/setup-java (temurin 17)
      - android-actions/setup-android@<SHA>   # SDK, build-tools y NDK 29
      - dtolnay/rust-toolchain@<SHA>          # 1.93 + target aarch64-linux-android
      - Swatinem/rust-cache@<SHA>             # workspaces: src-tauri
      - run: node scripts/release-ci.mjs require SUPABASE_URL SUPABASE_PUBLISHABLE_KEY ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD
        env: (los seis secretos)               # solo comprueba presencia: falla al principio nombrando los que faltan
      - run: node scripts/write-environment.mjs
        env: { SUPABASE_URL: "${{ secrets.SUPABASE_URL }}", SUPABASE_PUBLISHABLE_KEY: "${{ secrets.SUPABASE_PUBLISHABLE_KEY }}" }
      - run: pnpm install --frozen-lockfile    # con HUSKY=0
      - run: pnpm tauri android init --ci
      - run: pnpm tauri android build --apk --target aarch64 --config "$CONFIG"
        env: { CONFIG: '{"version":"…","bundle":{"android":{"versionCode":…}}}' }   # construido con las salidas de verify
      - name: Firmar y validar
        run: |                                   # decodifica el keystore a $RUNNER_TEMP, zipalign, apksigner sign (--ks-pass env:…),
          …                                      # apksigner verify, aapt2 dump badging (paquete, versionCode, versionName, arm64-v8a, no depurable)
        env: { ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD }
      - name: Borrar el keystore y environment.ts
        if: always()
        run: rm -f "$RUNNER_TEMP/release.jks" src/environments/environment.ts
      - run: sha256sum task-manager-<versión>-arm64-v8a.apk > task-manager-<versión>-arm64-v8a.apk.sha256
      - uses: actions/upload-artifact@<SHA>      # retention-days: 7 en etiquetas, 1 en ejecución manual

  publish:
    needs: [verify, build]
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/download-artifact@<SHA>
      - run: |                                   # si la Release existe: `gh release upload --clobber`; si no: `gh release create --verify-tag --generate-notes`
          …                                      # `--prerelease --latest=false` cuando prerelease == true
        env: { GH_TOKEN: "${{ github.token }}", TAG: "${{ needs.verify.outputs.tag }}" }
```

Reglas del flujo (las comprueba el test estático): ninguna acción sin SHA; ningún `${{ secrets.* }}` dentro de `run:` (solo en `env:` de los pasos que los usan, y `GITHUB_TOKEN` solo en `publish`); sin `set -x`, `echo` de secretos ni `pull_request_target`; `permissions` explícitos y `contents: write` solo en `publish`; el paso de borrado lleva `if: always()`; la ejecución manual no tiene paso de publicación.

---

## Pantallas

No aplica (sin frontal).

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `scripts/release-version.test.mjs` | `parseTag` (válidas, inválidas, límites 99), `releaseOf` (`versionName`; `versionCode` de final, `-rc.N`, sufijo sin número; orden `rc.1 < final < siguiente`), `versionMismatches` (coincide / difiere en cada fichero con mensaje que nombra el fichero), `resolve` (push con etiqueta; dispatch con `X.Y.Z-dev.N`; etiqueta mal formada → error) | US-013-01, 02, 04, 05, 07 |
| `scripts/write-environment.test.mjs` | Genera el fichero con ambos valores; falla sin URL, sin clave, URL no https, `sb_secret_…` y JWT `service_role`; el mensaje de error nombra la variable y **no contiene el valor**; no escribe nada si falla | US-013-03 |
| `scripts/release-ci.test.mjs` | `missing` devuelve solo los nombres ausentes o vacíos; el CLI sale con error y lista nombres, nunca valores | US-013-03 |
| `scripts/release-workflow.test.mjs` | Disparadores solo `vX.Y.Z[-sufijo]` y manual; `permissions: {}` global y `contents: write` solo en `publish`; `verify` antes de `build` y `build` antes de `publish`; `verify` ejecuta `secrets:check`, `lint`, `type-check`, `test:ci`, `test:scripts`; acciones fijadas por SHA de 40 caracteres; secretos solo en `env:`; ninguno en `run:`; sin `set -x`; borrado con `if: always()`; `publish` solo en `push`; sin `pull_request_target`; `--clobber`, `--verify-tag`, `--generate-notes`, `--prerelease` | US-013-01, 03, 04, 05, 07 |
| `scripts/docs-release.test.mjs` | `docs/instalacion.md` y `docs/release.md` existen, nombran los seis secretos y no contienen valores, rutas locales, correos ni identificadores de cuenta o proyecto | US-013-06 |
| Ensayo local (manual) | Compilar el APK *release* arm64, firmarlo con un *keystore* desechable, `apksigner verify` y `aapt2 dump badging`; comprobar `versionCode`/`versionName` inyectados con `--config`. El *keystore* de prueba se borra al terminar | US-013-02 |
| Ejecución real (manual, tras fusionar la PR #1) | `workflow_dispatch` (artefacto, sin Release) y etiqueta `v0.1.0` (Release con APK y suma); relanzar la etiqueta (reemplaza); instalar el APK en un móvil Android arm64 si se dispone de uno | US-013-01, 02, 05 |

Cobertura: los scripts nuevos son pequeños y se prueban casi por completo; `pnpm test:scripts` los incluye automáticamente (`scripts/*.test.mjs`).

---

## Orden de implementación (Red → Green → Refactor por historia)

1. **Bloque 1 — Versiones (US-013-02, 04, 07):** `package.json` a `0.1.0` y `release-version.mjs` con sus tests.
2. **Bloque 2 — Configuración y secretos (US-013-03):** `write-environment.mjs` y `release-ci.mjs` con sus tests.
3. **Bloque 3 — El flujo (US-013-01, 03, 04, 05, 07):** test estático del YAML en rojo → `release-android.yml` (resolviendo los SHA de las acciones con `gh api`) en verde.
4. **Bloque 4 — Ensayo local de compilar y firmar (US-013-02):** con *keystore* desechable; ajustar el flujo si algo no cuadra.
5. **Bloque 5 — Documentación (US-013-06):** `docs/instalacion.md`, `docs/release.md`, `CLAUDE.md`, `docs/setup-android.md` y su test.
6. **Bloque 6 — Cierre:** `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci && pnpm test:scripts`, `review.md`. La ejecución real en GitHub y la primera Release quedan **pendientes de fusionar la PR #1** y de que el propietario cree los seis secretos.

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| La compilación de Rust para Android tarda mucho en frío (10–20 min) | Alta | Caché de Rust y de pnpm; el flujo tiene un tiempo máximo razonable; no se repite si falla antes (`verify` y comprobación de secretos van primero) |
| `ng test` necesita un navegador en el ejecutor | Media | `ubuntu-latest` trae Chrome; si no, se instala en el flujo; se ve en la primera ejecución manual |
| `tauri android init --ci` o `tauri android build` piden entrada o rutas distintas a las del equipo local | Media | Ensayo local (Bloque 4) y primera ejecución manual en GitHub; las rutas del APK se buscan con `find` en vez de fijarse |
| El nombre o ruta del APK sin firmar cambian con la versión de Tauri | Media | El paso localiza el `*-release-unsigned.apk` y falla con un mensaje claro si no hay exactamente uno |
| Pérdida o filtración de la clave de firma | Baja / alto | Copia de seguridad fuera de GitHub (se documenta); si se filtra, se genera otra y se explica que las instalaciones previas deberán reinstalarse; secretos solo en el trabajo `build` y solo desde etiquetas/`main` |
| Una acción de terceros comprometida | Baja / alto | SHA fijados, permisos mínimos, separación `build`/`publish`, sin secretos en `verify` ni `publish` |
| Etiqueta mal puesta o fuera de `main` | Media | Guardas de `verify` (formato, versiones coherentes, ancestro de `main`); el flujo falla antes de compilar |
| Límites del Supabase compartido (altas anónimas por hora e IP, cuotas del plan) | Media | Se documenta en `docs/release.md`; fuera del alcance de esta spec cambiarlo |
| El APK arm64 no arranca en emuladores x86_64 | Cierta | Decidido en el clarify: el emulador usa el APK debug local |
| Probar de verdad exige haber fusionado la PR #1 | Cierta | Ensayo local primero; la ejecución real se hace tras la fusión |
