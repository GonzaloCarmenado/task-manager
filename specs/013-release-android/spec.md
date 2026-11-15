# Spec 013 — Publicar el APK de Android en las Releases con GitHub Actions

**Rama**: `interaction-logging-claude-md`
**Creada**: 2026-11-15
**Estado**: Aprobada
**Ciclo**: simple
**Frontal**: no

> `Ciclo: simple` por decisión del usuario (se descarta DeepSeek). Sigue habiendo clarify, plan, tareas, TDD y revisión. Sin frontal: no hay prompt de Stitch.

---

## Objetivo

Que al crear una etiqueta de versión, GitHub Actions compile la app, genere un APK de Android **firmado y listo para instalar** y lo publique en la sección *Releases* del repositorio, para que cualquiera pueda descargarlo e instalarlo sin tocar el código.

---

## Contexto

- Hoy el APK solo se genera a mano en el equipo del propietario (`pnpm tauri android build --debug --apk --target x86_64`, ver `docs/setup-android.md`). Es un APK **debug** (identificador `com.polyp.taskmanager.debug`), pensado para el emulador, y nadie más puede conseguirlo.
- No existe `.github/` ni ningún flujo de integración continua.
- Lo que un APK de producción necesita y el repo **no** tiene (por seguridad, es público):
  - **Firma**: un *keystore* de publicación. Está ignorado por git (`*.jks`, `*.keystore`) y debe vivir solo en secretos de GitHub y en una copia de seguridad del propietario. Con la misma firma, una versión nueva se instala encima de la anterior sin perder datos.
  - **Configuración de Supabase**: `src/environments/environment.ts` está ignorado por git. La URL y la clave *publishable* son públicas por diseño (viajan dentro del APK), pero en CI deben llegar desde secretos/variables, no del repo.
  - **Proyecto de Android generado**: `src-tauri/gen/` está ignorado por git; hay que generarlo en el flujo (`tauri android init`) y aplicarle ahí la firma y la versión.
- Dependencias con otras specs: las migraciones de Supabase (011 y 012) ya están aplicadas en el proyecto al que apuntará la app; la app es solo Android (spec 001).
- Qué más conviene incluir («etc.»), propuesto aquí y a confirmar en `/clarify`:
  - **P1**: lanzar al crear una etiqueta `vX.Y.Z`; APK firmado de producción; configuración y secretos que nunca tocan el repo ni los registros; guardas antes de publicar (versión coherente, tests en verde).
  - **P2**: ejecución manual de prueba (sin publicar); suma de comprobación SHA-256 y notas de versión automáticas; instrucciones de instalación y de mantenimiento.
  - **P3**: etiquetas con sufijo (`v0.2.0-rc.1`) como versión previa.

---

## Historias de usuario

### US-013-01 — Publicar una versión al crear una etiqueta (P1)

**Como** propietario del proyecto, **quiero** crear una etiqueta `vX.Y.Z` y que se publique sola una Release con el APK, **para** repartir la app sin compilar nada a mano.

**Criterios de aceptación:**
- El flujo se lanza al empujar una etiqueta con la forma `vMAYOR.MENOR.PARCHE` (p. ej. `v0.2.0`) y **solo** con ese patrón.
- Termina creando (o actualizando, si se relanza) una Release de GitHub con ese nombre que contiene el APK firmado y su suma SHA-256.
- La Release lleva notas generadas a partir de los cambios desde la versión anterior.
- Si cualquier paso falla (tests, compilación, firma), **no** se publica ninguna Release a medias.
- Relanzar el flujo para la misma etiqueta no duplica archivos ni deja la Release inconsistente.

### US-013-02 — APK de producción firmado e instalable (P1)

**Como** persona que descarga la app, **quiero** un APK firmado que se instale en mi móvil y se actualice con la versión siguiente, **para** usarla sin perder mis datos al actualizar.

**Criterios de aceptación:**
- El APK es de **release** (sin sufijo `.debug`): identificador `com.polyp.taskmanager`.
- Está firmado con la clave de publicación; `apksigner verify` lo valida y el flujo falla si la firma no es válida.
- `versionName` sale de la etiqueta (`v0.2.0` → `0.2.0`) y `versionCode` crece con cada versión (derivado de la etiqueta: `MAYOR*10000 + MENOR*100 + PARCHE`), de modo que Android permite actualizar encima.
- Incluye al menos la arquitectura `arm64-v8a` (la de casi todos los móviles actuales); las demás se deciden en `/clarify`.
- Móvil: se instala en un Android real/emulador, arranca, carga la fuente local y habla con Supabase (no queda pantalla en blanco por un ABI equivocado).

### US-013-03 — Configuración y secretos sin tocar el repo (P1)

**Como** propietario, **quiero** que la configuración de Supabase y la firma lleguen desde secretos de GitHub, **para** que el repo público nunca contenga nada sensible.

**Criterios de aceptación:**
- `environment.ts` se genera durante el flujo desde la URL y la clave *publishable* guardadas en GitHub; no se versiona y se descarta al terminar el trabajo.
- El *keystore* se recibe como secreto (en base64), se escribe en un directorio temporal del ejecutor y se borra al terminar (también si el flujo falla).
- Si falta algún secreto o tiene un valor evidentemente inválido (p. ej. la clave `service_role` en lugar de la *publishable*), el flujo **falla al principio** con un mensaje claro que nombra el secreto que falta (sin imprimir valores).
- Ningún secreto aparece en los registros (ni su valor, ni derivados como la contraseña o el contenido del *keystore*); el flujo no activa trazas que los muestren.
- El flujo no se ejecuta con secretos desde *forks* ni desde ramas arbitrarias: solo desde etiquetas del propio repositorio.

### US-013-04 — Guardas antes de publicar (P1)

**Como** propietario, **quiero** que no se publique una versión rota o mal etiquetada, **para** no repartir un APK que no pasa las pruebas o cuya versión no coincide.

**Criterios de aceptación:**
- Antes de compilar, el flujo comprueba que la versión de la etiqueta coincide con la de `package.json` y `src-tauri/tauri.conf.json` (y `Cargo.toml`); si no, falla diciendo qué difiere.
- La etiqueta apunta a un commit que está en la rama principal (`main`); si no, falla.
- Pasan `pnpm secrets:check`, `pnpm lint`, `pnpm type-check`, `pnpm test:ci` y `pnpm test:scripts` (los mismos del pre-commit) antes de empezar a compilar el APK.
- Permisos mínimos: el flujo solo puede escribir en las Releases (`contents: write`), nada más.

### US-013-05 — Ejecución manual de prueba (P2)

**Como** propietario, **quiero** lanzar el flujo a mano sin publicar, **para** comprobar la compilación y la firma antes de la primera etiqueta real.

**Criterios de aceptación:**
- El flujo admite ejecución manual (`workflow_dispatch`) que hace todo el proceso pero **sube el APK como artefacto del flujo** (con caducidad corta) y **no** crea ninguna Release.
- El artefacto manual se firma con la misma clave y lleva una versión de prueba que no choca con ninguna Release.

### US-013-06 — Cómo instalar y cómo mantener (P2)

**Como** persona que descarga la app y como propietario, **quiero** instrucciones claras, **para** instalarla sin dudas y mantener el proceso de publicación.

**Criterios de aceptación:**
- `docs/instalacion.md`: cómo descargar el APK de la última Release, permitir la instalación desde el navegador/gestor de archivos, comprobar la suma SHA-256 y actualizar.
- `docs/release.md`: cómo crear el *keystore* (la clave la genera el propietario en su equipo; nunca se escribe en el chat ni en el repo), qué secretos crear en GitHub (nombres y para qué sirve cada uno), cómo hacer una copia de seguridad del *keystore*, cómo publicar (subir versión → etiqueta) y qué hacer si se pierde la clave.
- Los documentos no contienen ni valores de secretos, ni rutas locales, ni identificadores de cuenta o proyecto.

### US-013-07 — Versiones previas (P3)

**Como** propietario, **quiero** que una etiqueta con sufijo (`v0.3.0-rc.1`) se publique como versión previa, **para** probar con otras personas sin que sea «la última».

**Criterios de aceptación:**
- Las etiquetas con sufijo `-algo` se publican marcadas como *pre-release* y no se convierten en «latest».
- El `versionCode` de una versión previa es menor que el de la final del mismo número (`v0.3.0-rc.1` < `v0.3.0`).

---

## Plan de tests (TDD)

El flujo en sí solo se prueba de verdad en GitHub; lo comprobable en local se extrae a **scripts con tests** (`node --test`) y a un test estático del propio fichero del flujo.

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-013-02 versionCode y versionName desde la etiqueta` | CA 3 de US-013-02, CA 2 de US-013-07 | `scripts/release-version.test.mjs` | unit (script) |
| `US-013-04 la etiqueta coincide con las versiones del proyecto` | CA 1 de US-013-04 | `scripts/release-version.test.mjs` | unit (script) |
| `US-013-04 etiquetas inválidas se rechazan` | CA 1 de US-013-01 | `scripts/release-version.test.mjs` | unit (script) |
| `US-013-03 genera environment.ts desde variables` | CA 1 de US-013-03 | `scripts/write-environment.test.mjs` | unit (script) |
| `US-013-03 falla sin variables o con una clave service_role` | CA 3 de US-013-03 | `scripts/write-environment.test.mjs` | unit (script) |
| `US-013-03 nunca imprime los valores` | CA 4 de US-013-03 | `scripts/write-environment.test.mjs` | unit (script) |
| `US-013-01 se lanza solo con etiquetas vX.Y.Z y a mano` | CA 1 de US-013-01, CA 1 de US-013-05 | `scripts/release-workflow.test.mjs` | estático |
| `US-013-04 permisos mínimos y solo contents: write en publicar` | CA 4 de US-013-04 | `scripts/release-workflow.test.mjs` | estático |
| `US-013-04 pasan los mismos controles que el pre-commit antes de compilar` | CA 3 de US-013-04 | `scripts/release-workflow.test.mjs` | estático |
| `US-013-03 los secretos solo se usan por env, sin eco ni trazas` | CA 4 de US-013-03 | `scripts/release-workflow.test.mjs` | estático |
| `US-013-01 las acciones de terceros van fijadas por versión/SHA` | restricciones técnicas | `scripts/release-workflow.test.mjs` | estático |
| `US-013-03 el keystore se borra al terminar (always)` | CA 2 de US-013-03 | `scripts/release-workflow.test.mjs` | estático |
| `US-013-05 la ejecución manual no crea Release` | CA 1 de US-013-05 | `scripts/release-workflow.test.mjs` | estático |
| `US-013-06 docs sin secretos ni rutas locales` | CA 3 de US-013-06 | `scripts/docs-release.test.mjs` | estático |
| Ejecución real: `workflow_dispatch` en GitHub y descarga del artefacto | US-013-02, 03, 05 | (manual) | manual |
| Ejecución real: etiqueta de prueba, Release creada, APK instalado en el emulador (y actualización encima) | US-013-01, 02 | (manual) | manual |

Sin frontal: no hay revisión visual; sí comprobación en Android (instalar el APK de la Release en el emulador y arrancar).

---

## Ficheros afectados

(Por confirmar en `/sdd-plan`.)

**Crear:**
- `.github/workflows/release-android.yml`
- `scripts/release-version.mjs` (+ `scripts/release-version.test.mjs`)
- `scripts/write-environment.mjs` (+ `scripts/write-environment.test.mjs`)
- `scripts/release-workflow.test.mjs`
- `scripts/docs-release.test.mjs`
- `docs/instalacion.md`, `docs/release.md`

**Modificar:**
- `CLAUDE.md` (sección de publicación y regla de secretos de CI), `docs/setup-android.md` (enlace a la publicación), `specs/README.md`, `docs/interacciones.md`
- `package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` solo si hace falta alinear versiones (se decide en el plan)

**Supabase / Tauri / Android:** sin migraciones. La firma y la versión se aplican en el proyecto Android que el flujo genera (`src-tauri/gen/` sigue ignorado por git).

---

## Modelo de datos

No aplica (sin tipos de datos de la app ni SQL).

**Secretos y variables de GitHub previstos** (solo nombres; los valores los crea el propietario en *Settings → Secrets and variables → Actions*):

| Nombre | Tipo | Para qué |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | secreto | *Keystore* de publicación codificado en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | secreto | Contraseña del *keystore* |
| `ANDROID_KEY_ALIAS` | secreto | Alias de la clave |
| `ANDROID_KEY_PASSWORD` | secreto | Contraseña de la clave |
| `SUPABASE_URL` | secreto | URL pública del proyecto Supabase (viaja en el APK) |
| `SUPABASE_PUBLISHABLE_KEY` | secreto | Clave *publishable* (nunca la `service_role`) |

---

## Restricciones técnicas

- Repo público: ningún secreto, ruta local, correo ni identificador de cuenta o proyecto en el flujo, los scripts, los documentos, los tests ni los commits; `pnpm secrets:check` en verde.
- Permisos del flujo al mínimo (`permissions` explícitos); `contents: write` solo en el trabajo que publica.
- Acciones de terceros fijadas por versión exacta (mejor por SHA de commit); sin `pull_request_target`; sin ejecutar código de *forks* con secretos.
- Los secretos solo se pasan por `env:` a los pasos que los necesitan; nunca se interpolan en comandos (`${{ secrets.X }}` en `run:`), nunca se hace `echo` de ellos ni se activan trazas (`set -x`).
- Versiones de herramientas fijas y coherentes con `docs/setup-android.md` (Node, pnpm 11, Rust 1.93 con los *targets* de Android, JDK, Android SDK/NDK).
- El *keystore* nunca se commitea; la copia de seguridad es responsabilidad del propietario y se documenta.
- La app es solo Android (spec 001): no se compilan versiones de escritorio.
- Convenciones del proyecto: scripts en `scripts/*.mjs` con tests `node --test`; sin `any` (los scripts son JS); nada de rutas absolutas del equipo del propietario.

---

## Out of scope

- Publicar en Google Play (AAB, ficha, cuenta de desarrollador) o en F-Droid.
- Un flujo de integración continua en cada PR/push (lint, tests, e2e): sería otra spec.
- Actualizaciones automáticas dentro de la app (descargar e instalar versiones nuevas desde la propia app).
- Compilar para iOS, escritorio o web.
- Firma con Play App Signing, rotación de claves y ofuscación (R8/ProGuard) más allá de lo que Tauri ya hace.
- Notificar a los usuarios de una versión nueva.
