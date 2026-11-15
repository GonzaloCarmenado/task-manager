# Review 013 — Publicar el APK de Android en las Releases

**Rama**: `interaction-logging-claude-md`
**Fecha**: 2026-11-15
**Resultado**: PENDIENTE (falta la ejecución real en GitHub: secretos, prueba manual y primera etiqueta, que requieren fusionar la PR #1)

---

## Coherencia documental

| Check | Estado | Notas |
|---|---|---|
| Todos los criterios P1 tienen tarea `[x]` y test | PASS | US-013-01, 02, 03 y 04 con tests de scripts y test estático del flujo; la verificación real está en el Bloque 6 |
| Todos los ficheros del plan aparecen en el diff | PASS | Salvo `android-actions/setup-android`: se usan el SDK y el NDK que trae el ejecutor de GitHub (menos acciones de terceros) |
| Decisiones de `clarify.md` reflejadas en código | PASS | Solo `arm64-v8a`; etiquetas solo desde `main`; relanzar reemplaza los archivos; versión editada a mano con guarda; notas automáticas; Supabase compartido documentado |

## Calidad de código

| Check | Estado | Notas |
|---|---|---|
| `pnpm lint:fix && pnpm format` sin errores | PASS | |
| `pnpm secrets:check` sin hallazgos | PASS | Los valores de prueba de los tests se arman al vuelo (no hay credenciales ni correos literales) |
| `pnpm test:ci` en verde | PASS | 1183 tests de la app (sin cambios de código de la app) |
| `pnpm test:scripts` en verde | PASS | 210 (48 nuevos: versiones 22, `write-environment` 13, `release-ci` 7 y flujo 22… más documentos 8) |
| `pnpm type-check` | PASS | |
| `actionlint` sobre el flujo | PASS | Sin hallazgos (sintaxis, expresiones y `shellcheck` de los `run:`) |
| Migraciones | N/A | Sin cambios de base de datos |

## Ensayo local de compilar y firmar

| Check | Estado | Notas |
|---|---|---|
| `tauri android init --ci` y compilación release arm64 con `--config` desde `bash` | PASS | Sale exactamente un `*-release-unsigned.apk` |
| Paso «Firmar y validar el APK» del flujo (extraído del YAML y ejecutado con un *keystore* desechable) | PASS | `apksigner verify` correcto; paquete `com.polyp.taskmanager`, `versionCode` y `versionName` inyectados, solo `arm64-v8a`, no depurable; suma SHA-256 generada |
| Limpieza | PASS | Keystore desechable, `environment.ts` de prueba (se restauró el real), APK y cachés borrados; sin restos en el árbol |

Hallazgos del ensayo: (1) `apksigner` genera un `.idsig` (firma v4) que no hace falta: se desactiva con `--v4-signing-enabled false`. (2) El disco `C:` del equipo del propietario estaba al 100%: el ensayo se repitió con las cachés de Rust y Gradle en `D:` y después se borraron; conviene liberar espacio en `C:`.

## Verificación real en GitHub

| Check | Estado | Notas |
|---|---|---|
| Secretos creados por el propietario | PENDIENTE | Seis secretos; ver `docs/release.md` |
| Ejecución manual (`workflow_dispatch` desde `main`) | PENDIENTE | Requiere fusionar la PR #1 (el flujo debe estar en la rama por defecto) |
| Etiqueta `v0.1.0` → Release con APK y `.sha256`; relanzar reemplaza | PENDIENTE | |
| APK de la Release instalado en un móvil arm64 | PENDIENTE | Si el propietario dispone de uno |

## Revisión cruzada (DeepSeek)

| Revisión | Resultado | Notas |
|---|---|---|
| Spec + clarify | Omitida (ciclo simple) | Decisión del usuario |
| Diff antes del push | Omitida (ciclo simple) | Idem |

## Integridad de la rama

| Check | Estado | Notas |
|---|---|---|
| Rama basada en `origin/main` actualizado | PASS | |
| `git status` limpio | PENDIENTE | Cambios de la 013 sin commitear |

---

## Ajustes técnicos

- **Tres trabajos con permisos mínimos**: `verify` (sin secretos), `build` (único con secretos; solo lee el repo) y `publish` (único con `contents: write`; sin la clave de firma).
- **Firma después de compilar** (`zipalign` + `apksigner`, contraseñas por `env:`) en lugar de parchear el proyecto Android generado (`src-tauri/gen/` está ignorado).
- **`versionCode`** ampliado a `(MAYOR*10000+MENOR*100+PARCHE)*100 + etapa` (99 en la final) para que `v0.3.0-rc.1` < `v0.3.0`; `package.json` se alineó a `0.1.0`.
- **SDK y NDK del ejecutor** en lugar de otra acción de terceros; el resto de acciones, fijadas por SHA de commit.

## Issues encontrados / fuera de alcance

- El flujo no se ha ejecutado todavía en GitHub: el primer ensayo real puede mostrar diferencias del ejecutor de Linux (por ejemplo, el navegador de `pnpm test:ci` o la versión de `build-tools`); está previsto en el Bloque 6.
- Quedan fuera de esta spec: Google Play, CI en cada PR, APK x86_64 y las actualizaciones dentro de la app.
