Ejecuta el ciclo de implementación autónomo (TDD) a partir de `tasks.md`. Para ante operaciones destructivas o con efecto en el remoto.

## Pasos

1. Identifica la spec activa (número en la rama; si no, pregunta).
2. Lee `tasks.md`, `plan.md`, `spec.md` y `clarify.md`.
3. Verifica que existen spec, clarify, plan y tasks (y el diseño de Stitch si hay frontal). Si falta alguno, avisa y detente.
4. Ejecuta las tareas en orden, **respetando Red → Green → Refactor**:
   - **Red**: escribe los tests de la historia y **ejecútalos para ver que fallan por el motivo correcto** (no por un error de compilación ajeno). Si ya pasan, el test no prueba nada: corrígelo.
   - **Green**: implementa lo mínimo para que pasen. Lee cada fichero antes de modificarlo.
   - **Refactor**: limpia con los tests en verde.
   - Marca la tarea `[x]` en `tasks.md` al terminarla.
5. Al cerrar cada bloque: `pnpm lint:fix && pnpm format && pnpm secrets:check && pnpm test:ci`. Corrige hasta que pase. Si la cobertura baja, añade tests antes de continuar.
6. **PARA OBLIGATORIAMENTE y pide confirmación** antes de: `pnpm db:push` o cualquier `supabase` con efecto en el remoto, migraciones destructivas (`DROP`, `TRUNCATE`), borrar ficheros existentes, `git push --force`/`reset --hard`, o cualquier acción sobre datos reales. Verifica antes la cuenta de la CLI de Supabase (ver `CLAUDE.md`).
7. Con todas las tareas `[x]`, ejecuta la **verificación visual** (si hay frontal; ver abajo) y la comprobación en Android.
8. Resume al usuario: tareas, tests, cobertura y verificación visual. Pregunta confirmación para `git add -A && git commit` (pregunta `W`); tras confirmar, pregunta para `git push` (pregunta `W`; el hook `hook-push` lanzará la revisión cruzada del diff).
9. Informa: "Implementación completa. Siguiente paso: `/pr-review`."

## Verificación visual en navegador (obligatoria si hay frontal)

Con la extensión de Claude para Chrome (`mcp__claude-in-chrome__*`; invoca antes la skill `claude-in-chrome`):

1. Carga las herramientas con `ToolSearch` en una sola llamada y obtén el contexto de pestañas (`tabs_context_mcp`).
2. Levanta `pnpm start`, abre `http://localhost:4200` en una pestaña nueva y redimensiona a viewport móvil (≈ 390×844). Si la extensión no está conectada, **para y avisa al usuario**; no sustituyas la revisión por suposiciones.
3. Recorre todos los criterios **P1** de la spec: navega, ejecuta la acción y verifica el resultado. Revisa además tema claro/oscuro, estados (vacío, carga, error, foco), targets ≥ 44 px, safe-areas, scroll horizontal y la consola (`read_console_messages`).
4. Si algo no coincide con un criterio P1 es un bug: corrige, relanza `pnpm test:ci` y repite. Discrepancias P2/P3: aviso, no bloquean.
5. Graba un GIF (`gif_creator`) si hay flujos de más de 2 pasos: `specs/NNN-nombre/verification.gif`.
6. Cierra las pestañas que hayas abierto y detén el servidor.
7. Comprueba también en Android (emulador o dispositivo; ABI correcto, ver `docs/setup-android.md`).

## Comportamiento ante fallos

- **TypeScript**: causa raíz, nunca `any` como escape.
- **Test roto**: decide si falla el test o la implementación según la spec.
- **Hallazgos de `secrets:check`**: parar, quitar el secreto, rotarlo si llegó a publicarse y avisar.
- **Fallo irrecuperable tras 3 intentos**: describe el problema y espera instrucciones.

## Convenciones obligatorias

OnPush siempre · patrón 3 servicios · sin `any` · Signals · standalone · sin Angular Material · fechas con `getFullYear/getMonth/getDate` (nunca `toISOString().slice(0,10)`) · solo `SupabaseService` accede a Supabase · migraciones con RLS · sin secretos en el repo.
