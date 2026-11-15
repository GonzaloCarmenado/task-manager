# Tasks 013 — Publicar el APK de Android en las Releases con GitHub Actions

**Plan**: [plan.md](./plan.md)
**Estado**: Aprobado
**Fecha**: 2026-11-15

> Cada historia sigue TDD: las tareas de test (Red) van SIEMPRE antes que las de implementación (Green). En Red se ejecutan los tests y se comprueba que fallan por el motivo correcto. Lo que toca GitHub (secretos, ejecución del flujo, etiquetas, Release) y la fusión de la PR #1 requieren confirmación del usuario. Sin frontal: no hay revisión visual; sí comprobación del APK. **Nunca** se escribe ni se lee en el chat un secreto o el *keystore* real.

---

## Bloque 1 — Versiones (US-013-02, 04, 07)

- [x] T-013-01 (Red): `scripts/release-version.test.mjs`: `parseTag` (`v0.3.0`, `v0.3.0-rc.1`, `v1.2.3-beta`; rechaza `0.3.0`, `v1.2`, `v1.2.3.4`, `v1.2.x`, `v100.0.0`, `v1.100.0`, `v1.0.100`, sufijo vacío), `releaseOf` (`versionName`; `versionCode`: `v0.1.0` = 10099, `v0.3.0-rc.1` = 30001, `v0.3.0` = 30099, `v0.3.1` = 30199, `v1.0.0-beta` = 1000000, `v1.0.0-rc.98`; sufijo sin número = etapa 0; orden `rc.1 < final < siguiente`; `prerelease` solo con sufijo), `versionMismatches` (coincide → vacío; difiere en `package.json`, `tauri.conf.json` o `Cargo.toml` → mensaje que nombra el fichero y las dos versiones; versión de las tres con sufijo se compara solo por `X.Y.Z`), `resolve` (push con `refs/tags/v0.1.0`; ref que no es etiqueta → error; `workflow_dispatch` → `X.Y.Z-dev.N` con `versionCode` de etapa `min(N, 98)`; salida con `version`, `version_code`, `prerelease`, `tag`). Comprobar que fallan porque el script no existe
- [x] T-013-02: subir `version` de `package.json` a `0.1.0` (alinear con `tauri.conf.json` y `Cargo.toml`)
- [x] T-013-03 (Green): `scripts/release-version.mjs` (`parseTag`, `releaseOf`, `versionMismatches`, CLI `resolve` que escribe en `$GITHUB_OUTPUT` y lee `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml` del repo)
- [x] T-013-04 (Refactor): limpiar con los tests en verde; `pnpm test:scripts` y `pnpm lint`

---

## Bloque 2 — Configuración y secretos (US-013-03)

- [x] T-013-05 (Red): `scripts/write-environment.test.mjs`: genera `environment.ts` con `supabaseUrl` y `supabaseKey` (formato idéntico a `environment.example.ts`); falla sin URL, sin clave, con URL que no es `https://` y con clave `sb_secret_…` o JWT con rol `service_role`; acepta `sb_publishable_…` y JWT con rol `anon`; el mensaje de error **nombra la variable y no contiene el valor**; si falla, no escribe ni deja un fichero a medias; la ruta de destino se inyecta (los tests usan un directorio temporal). Comprobar que fallan por falta del script
- [x] T-013-06 (Green): `scripts/write-environment.mjs` (`buildEnvironment`, `writeEnvironment` y CLI que lee `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`; salida de éxito sin valores)
- [x] T-013-07 (Red): `scripts/release-ci.test.mjs`: `missing` devuelve solo los nombres ausentes o vacíos (espacios = vacío); el CLI `require NOMBRE…` sale con código distinto de cero listando nombres y **nunca valores**, y con cero si están todos
- [x] T-013-08 (Green): `scripts/release-ci.mjs` (`missing` y CLI `require`)
- [x] T-013-09 (Refactor): limpiar con los tests en verde

---

## Bloque 3 — El flujo (US-013-01, 03, 04, 05, 07)

- [x] T-013-10 (Red): `scripts/release-workflow.test.mjs` (test estático de texto sobre `.github/workflows/release-android.yml`): disparadores solo `push` de etiquetas `v[0-9]+.[0-9]+.[0-9]+` y `v[0-9]+.[0-9]+.[0-9]+-*` y `workflow_dispatch`; `permissions: {}` global y `contents: write` solo en `publish`; `verify` → `build` → `publish` en `needs`; `verify` ejecuta `secrets:check`, `lint`, `type-check`, `test:ci` y `test:scripts`; comprobación de que el commit está en `main` (`merge-base --is-ancestor`); `workflow_dispatch` solo desde `main`; toda acción `uses:` fijada por SHA de 40 caracteres; ningún `${{ secrets.* }}` dentro de `run:`; los secretos solo en `env:`; sin `set -x`, sin `echo` de secretos, sin `pull_request_target`; `--ks-pass env:` en la firma; paso de borrado del *keystore* y de `environment.ts` con `if: always()`; `publish` con `if: github.event_name == 'push'`; `--clobber`, `--verify-tag`, `--generate-notes`, `--prerelease` y `--latest=false`; el artefacto manual con `retention-days: 1` y el de etiqueta con 7; `concurrency` sin cancelar. Comprobar que fallan porque el fichero no existe
- [x] T-013-11: resolver los SHA de commit de las acciones de terceros con `gh api` (`actions/checkout`, `actions/setup-node`, `actions/setup-java`, `actions/upload-artifact`, `actions/download-artifact`, `pnpm/action-setup`, `android-actions/setup-android`, `dtolnay/rust-toolchain`, `Swatinem/rust-cache`) eligiendo la última versión estable, y anotar versión y SHA como comentario junto a cada `uses:`
- [x] T-013-12 (Green): `.github/workflows/release-android.yml` con los trabajos `verify`, `build` y `publish` según el plan; la localización del APK sin firmar con `find` (exactamente uno o falla), el nombre `task-manager-X.Y.Z-arm64-v8a.apk` y su `.sha256`
- [x] T-013-13 (Refactor): limpiar con los tests en verde; validar la sintaxis del YAML (`gh workflow` no la ejecuta: se usa un linter local si está disponible o una carga con un parser de YAML en un script desechable)

---

## Bloque 4 — Ensayo local de compilar y firmar (US-013-02)

- [x] T-013-14: generar un *keystore* **desechable** en un directorio temporal (fuera del repo y de `docs/`) con `keytool` y contraseñas aleatorias de prueba; nada de esto se escribe en el repo ni se muestra en el chat
- [x] T-013-15: `node scripts/write-environment.mjs` con valores de prueba no secretos (URL y clave *publishable* de ejemplo inventadas) y compilar el APK de *release* arm64 con el `--config` de versión: `pnpm tauri android build --apk --target aarch64 --config '{…}'`; comprobar que sale exactamente un `*-release-unsigned.apk`
- [x] T-013-16: firmar con `zipalign` + `apksigner sign` (`--ks-pass env:`), `apksigner verify --print-certs` y `aapt2 dump badging`: paquete `com.polyp.taskmanager`, `versionCode` y `versionName` inyectados, `native-code: 'arm64-v8a'`, no depurable; ajustar el flujo si algo no cuadra
- [x] T-013-17: borrar el *keystore* desechable, `environment.ts` de prueba y los APK de prueba; comprobar con `git status` que no queda nada sin ignorar

---

## Bloque 5 — Documentación (US-013-06)

- [x] T-013-18 (Red): `scripts/docs-release.test.mjs`: existen `docs/instalacion.md` y `docs/release.md`; `release.md` nombra los seis secretos (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`), el procedimiento de la copia de seguridad, qué hacer si se pierde la clave y los límites del Supabase compartido; `instalacion.md` explica descargar, permitir la instalación, comprobar el SHA-256 y actualizar; ninguno contiene valores de secretos, rutas locales (letra de unidad ni carpetas personales), correos ni identificadores de cuenta o proyecto
- [x] T-013-19 (Green): `docs/instalacion.md` y `docs/release.md` (crear el *keystore* con `keytool` y placeholders, `base64` y `gh secret set … < fichero` sin mostrar el valor, publicar: subir versión en los tres ficheros → fusionar en `main` → etiqueta → Release, ensayo con `workflow_dispatch`, qué pasa con versiones previas)
- [x] T-013-20: `CLAUDE.md` (sección «Publicación de Android (spec 013)»: solo desde etiquetas de `main`, secretos nombrados, regla de no escribirlos en el repo ni en el chat) y enlace desde `docs/setup-android.md`
- [x] T-013-21 (Refactor): limpiar con los tests en verde

---

## Bloque 6 — Ejecución real en GitHub (US-013-01, 02, 05)

> Todo este bloque requiere confirmación del usuario y que la **PR #1 esté fusionada en `main`** (el flujo debe estar en la rama por defecto).

- [ ] T-013-22: el usuario genera su *keystore* real, hace su copia de seguridad fuera de GitHub y crea los seis secretos en *Settings → Secrets and variables → Actions* (el asistente solo guía; no ve ni pide los valores) *(requiere confirmación del usuario)*
- [ ] T-013-23: ejecución manual (`workflow_dispatch` desde `main`): el flujo termina en verde y sube el artefacto sin crear Release; descargar el APK y repetir las comprobaciones de firma y `aapt2` *(requiere confirmación del usuario)*
- [ ] T-013-24: crear la etiqueta `v0.1.0` desde `main`: Release creada con el APK, su `.sha256` y las notas; relanzar el flujo para la misma etiqueta y comprobar que reemplaza los archivos sin duplicar *(requiere confirmación del usuario)*
- [ ] T-013-25: instalar el APK de la Release en un móvil Android arm64 (si el propietario dispone de uno) y comprobar que arranca, carga la fuente y habla con Supabase; si no hay móvil, queda como «no verificado» en `review.md` *(requiere confirmación del usuario)*

---

## Checklist de cierre

- [ ] `pnpm lint:fix && pnpm format` sin errores
- [ ] `pnpm secrets:check` sin hallazgos y revisión manual de `git diff --cached` (ningún secreto, *keystore*, ruta local, correo ni identificador de cuenta o proyecto)
- [ ] `pnpm test:ci` y `pnpm test:scripts` en verde, y `pnpm build` sin avisos
- [ ] Todos los criterios P1 de `spec.md` verificados (US-013-01, 02, 03 y 04)
- [ ] Criterios P2 y P3 verificados (US-013-05, 06 y 07)
- [ ] Ensayo local de compilar y firmar correcto y sin restos
- [ ] Ejecución real en GitHub y primera Release comprobadas (tras fusionar la PR #1)
- [ ] Sin frontal: no aplica la revisión visual; APK comprobado con `apksigner` y `aapt2` (y en un móvil real si se dispone)
- [ ] `review.md` con el resultado
