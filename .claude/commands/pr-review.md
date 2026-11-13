Revisa la coherencia spec → clarify → plan → tasks → código antes de abrir la PR. Genera `review.md` y abre la PR si todo cuadra.

## Pasos

1. Identifica la spec activa (número en la rama).
2. Lee `spec.md`, `clarify.md`, `plan.md` y `tasks.md`.
3. Obtén `git diff main..HEAD --stat` y `git log --oneline main..HEAD`.
4. Ejecuta los **Checks** y crea `specs/NNN-nombre/review.md` desde `specs/_TEMPLATE/review.md`.
5. Si todo pasa: procede a abrir la PR. Si algo falla: informa con detalle y lanza el mini-ciclo de corrección; al corregir, actualiza `review.md` y vuelve al paso 5.

## Checks

### Coherencia documental
- [ ] Todos los criterios P1 de `spec.md` tienen tarea `[x]` y al menos un test que los cubre
- [ ] Todos los ficheros del plan aparecen en el diff
- [ ] Las decisiones de `clarify.md` están reflejadas en el código

### Calidad de código
- [ ] `pnpm lint:fix && pnpm format` sin errores (ejecútalo)
- [ ] `pnpm secrets:check` sin hallazgos (ejecútalo) y revisión manual de `git diff main..HEAD` en busca de secretos, URLs privadas, correos o rutas locales
- [ ] `pnpm test:ci` en verde, sin bajar la cobertura
- [ ] No hay `any`, todos los componentes son `OnPush`, no hay `console.log` de debug
- [ ] Migraciones nuevas con RLS y rollback documentado; solo `SupabaseService` accede a Supabase

### Verificación visual (si hay frontal)
- [ ] Revisado en navegador con la extensión de Chrome y en Android (pega el resultado en `review.md`; si no se pudo, queda como NO VERIFICADO)

### Revisión cruzada
- [ ] Spec + clarify revisados por DeepSeek (o `Ciclo: simple`), con los hallazgos graves resueltos o aceptados por el usuario
- [ ] Diff revisado antes del push (o aceptado con `node scripts/cross-review.mjs accept`)

### Integridad de la rama
- [ ] Rama basada en `main` actualizado, sin conflictos
- [ ] `git status` limpio

## Mini-ciclo de corrección

1. Identifica el fichero/sección que falla. 2. Léelo completo. 3. Aplica la corrección mínima. 4. Repite el check. 5. Tras 3 intentos fallidos, describe el problema al usuario y espera instrucciones.

## Apertura de PR (si todos los checks pasan)

1. `git log --oneline main..HEAD` y `git diff --stat main..HEAD`.
2. Redacta título (`feat/fix/chore(NNN): descripción`, < 70 caracteres) y cuerpo: **Summary**, **Spec** (referencia a `specs/NNN-nombre/`), **Test plan** (checklist basado en los P1, incluyendo Android).
3. Muestra título y cuerpo al usuario y pide confirmación (pregunta `W`).
4. Solo tras confirmación explícita: `gh pr create --title "..." --body "..." --base main`.
5. Informa la URL de la PR.
6. Registra el turno y las preguntas en `docs/interacciones.md`.
