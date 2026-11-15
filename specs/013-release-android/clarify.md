# Clarify 013 — Publicar el APK de Android en las Releases

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-15

---

## Preguntas

1. **Arquitecturas del APK**: ¿arm64 + x86_64, solo arm64 o universal? (el emulador del propietario es x86_64; los móviles actuales, casi todos arm64).
2. **Rama de las etiquetas**: la spec exige que la etiqueta apunte a un commit de `main`, pero hoy todo el código vive en la PR #1, aún sin fusionar. ¿Se mantiene la regla?
3. **Relanzar el flujo para una etiqueta ya publicada** (valor por defecto aplicado, sin preguntar): se reemplazan los archivos de esa Release (`--clobber`); no se duplican ni se crea otra.
4. **Primera versión y cómo se sube la versión** (valor por defecto aplicado): la primera Release es `v0.1.0` (la versión actual de los tres ficheros). Para subir de versión se edita a mano `package.json`, `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml` y se crea la etiqueta; la guarda de US-013-04 falla si no coinciden. Sin script de «bump» en esta spec.
5. **Notas y nombres** (valor por defecto aplicado): notas generadas por GitHub a partir de los cambios desde la versión anterior; archivos `task-manager-X.Y.Z-arm64-v8a.apk` y `task-manager-X.Y.Z-arm64-v8a.apk.sha256` (nombre provisional del producto, como en `tauri.conf.json`).
6. **Todos usan el mismo Supabase** (aviso, sin decisión): el APK apunta al proyecto de Supabase del propietario; cada persona recibe una sesión anónima y la RLS aísla sus datos, pero el límite de altas anónimas por hora e IP y las cuotas del plan son compartidos. Es consecuencia directa del objetivo («que todos puedan funcionar») y se documenta en `docs/release.md`.
7. **Probar el flujo antes de publicar** (consecuencia de la pregunta 2): `workflow_dispatch` solo aparece en GitHub cuando el fichero del flujo está en la rama por defecto, así que la prueba manual y la primera etiqueta llegan **después de fusionar la PR #1**.

---

## Respuestas

1. **Solo arm64.** Un único APK (`arm64-v8a`). El emulador x86_64 sigue usando el APK debug local (`docs/setup-android.md`), no el de la Release.
2. **Solo `main`.** El flujo comprueba que el commit de la etiqueta está en `main`.
3. Reemplazar los archivos de la Release (por defecto).
4. `v0.1.0` y versión editada a mano con guarda (por defecto).
5. Notas automáticas y nombres con versión y ABI (por defecto).
6. Se documenta el uso compartido de Supabase (aviso).
7. La prueba real va tras fusionar la PR #1.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Arquitectura | Solo `arm64-v8a`; un APK por Release |
| APK para emulador x86_64 | No se publica; se usa el debug local |
| Etiquetas válidas | `vMAYOR.MENOR.PARCHE` (y `-sufijo` como versión previa, P3) |
| Rama | El commit de la etiqueta debe estar en `main` |
| Relanzar | Reemplaza los archivos de la Release de esa etiqueta |
| Primera Release | `v0.1.0`, tras fusionar la PR #1 |
| Subir de versión | A mano en los tres ficheros; el flujo falla si no coinciden con la etiqueta |
| Nombres | `task-manager-X.Y.Z-arm64-v8a.apk` y `.sha256` |
| Notas | Generadas por GitHub desde la versión anterior |
| Supabase | Proyecto único compartido; se documentan los límites en `docs/release.md` |
| Prueba manual | `workflow_dispatch`, disponible tras fusionar la PR #1 |
| Revisión cruzada | No aplica (`Ciclo: simple`) |

---

**Estado**: CERRADO
