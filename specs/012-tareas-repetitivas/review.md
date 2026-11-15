# Review 012 — Tareas repetitivas

**Rama**: `interaction-logging-claude-md`
**Fecha**: 2026-11-15
**Resultado**: APROBADO (sin revisión cruzada: ciclo simple)

---

## Coherencia documental

| Check | Estado | Notas |
|---|---|---|
| Todos los criterios P1 tienen tarea `[x]` y test | PASS | US-012-01, 02 y 03 con tests unitarios y e2e. P2 (US-012-04, 05 y 06) también hechas. US-012-07 (P3) quedó fuera de alcance en el clarify |
| Todos los ficheros del plan aparecen en el diff | PASS | Salvo las vistas previas de desarrollo de la lista y de las hojas de decisión, sustituidas por las capturas de Cypress (`repetitivas-fidelidad.cy.ts`) porque necesitan datos |
| Decisiones de `clarify.md` reflejadas en código | PASS | Alcance P1 + P2; las ocurrencias futuras no se pueden completar hasta su día (lista y disparador); repetir desde la fecha prevista; una sola atrasada por serie; historial conservado; traspaso con la regla |

## Calidad de código

| Check | Estado | Notas |
|---|---|---|
| `pnpm lint:fix && pnpm format` sin errores | PASS | |
| `pnpm secrets:check` sin hallazgos | PASS | |
| `pnpm test:ci` en verde | PASS | 1183 tests. Cobertura alta en `TasksAccessService` y `core/utils/recurrence.ts` (casos de éxito, fallo, reintento y reparación) |
| `pnpm test:scripts` en verde | PASS | 138 (migración, tokens de diseño de las hojas nuevas, presupuestos y paquete inicial) |
| `pnpm e2e` en verde | PASS | 135 (98 anteriores + 29 de repetitivas + 7 de fidelidad + 1 de traspaso de cuenta) |
| `pnpm type-check` y `pnpm build` | PASS | Build sin avisos; paquete inicial 550 kB (aviso a 560 kB) |
| Sin `any` en ficheros nuevos/modificados | PASS | |
| OnPush en componentes nuevos/modificados | PASS | Cada componente lo comprueba en su spec |
| Sin `console.log` de debug | PASS | Las operaciones de series nunca escriben en consola (test explícito) |
| Migraciones con RLS y rollback documentado | PASS | `task_series` con las cuatro políticas por `user_id`, sin acceso anónimo; índice único parcial y disparador sin `security definer`; rollback al final del fichero |

## Verificación visual

| Check | Estado | Notas |
|---|---|---|
| Navegador (extensión de Chrome, 390×844, claro y oscuro) | PASS | Hoja «Configurar repetición» en sus estados (semana, sin días, día del mes, fecha de fin con error) con consola limpia. Fila «Repetir», lista y hojas de «Solo esta / Toda la serie» con capturas reales de la app (`cypress/screenshots`) y medidas automáticas: controles de 44/52 px, hoja a todo el ancho y pegada abajo, sin desbordes y fuente local |
| Android (emulador, APK debug x86_64, contra el proyecto real) | PASS | Con toques reales: crear una repetitiva (hoja de repetición, días de la semana), completar (XP, aviso «Hecho. Próxima: jueves 19 de noviembre», siguiente con candado y «Disponible el jueves»), alarma real de una ocurrencia con hora (alarma `RTC_WAKEUP` programada y notificación recibida a su hora), arranque en frío (la lista y la alarma sobreviven), editar «solo esta» y borrar «toda la serie». El botón atrás cierra solo la hoja de arriba (repetición, decisión de editar y de borrar) y conserva lo escrito. Las hojas no usan teclado: la fecha de fin es el selector nativo. Los datos de prueba se limpiaron desde la propia app |

## Remoto (Supabase)

| Check | Estado | Notas |
|---|---|---|
| Migración `task_series` aplicada | PASS | `db push` tras comprobar la cuenta de la CLI por id de organización (la primera comprobación detectó otra cuenta y se paró) y revisar el `db:push:dry` (solo esa migración) |
| `pnpm verify:series` | PASS | 17/17: RLS de `task_series`, restricciones, índice único, guarda de futuras, desmarcar y borrar la serie; no deja datos |

## Revisión cruzada (DeepSeek)

| Revisión | Resultado | Notas |
|---|---|---|
| Spec + clarify | Omitida (ciclo simple) | Decisión del usuario: se descarta DeepSeek |
| Diff antes del push | Omitida (ciclo simple) | Idem |

## Integridad de la rama

| Check | Estado | Notas |
|---|---|---|
| Rama basada en `origin/main` actualizado | PASS | Sin conflictos |
| `git status` limpio | PASS tras el commit de cierre | |

---

## Ajustes técnicos

- **Una sola pendiente por serie**: índice único parcial en la base de datos; el cliente ignora el `23505` al crear la siguiente, así que un reintento o un segundo móvil no duplican. Si el cliente se cierra entre completar y crear la siguiente, `load()` repara la serie.
- **Red de seguridad al completar**: además del botón desactivado, `TasksList.toggle` ignora una ocurrencia futura (un clic forzado llegó al controlador en el e2e) y el disparador `tasks_series_guard` la rechaza en el servidor.
- **Cambiar la regla es siempre de toda la serie**: no se pregunta «solo esta / toda la serie» si cambia la regla (incluido «No se repite» o quitar la fecha); solo si cambian título, fecha u hora con la regla igual.
- **CLI de Supabase 3.x**: pide `--yes` para aplicar en modo agente; se usó solo tras la aprobación del propietario y un `db:push:dry` revisado.
- **Plural en el resumen** (hallazgo en Android): «los jueves y domingo» pasó a «los jueves y domingos» (con test).

## Discrepancias diseño ↔ comportamiento

Ver `design/README.md`. Se ignoraron los simuladores de estado, los XP inventados (+25 / +10 XP), el multiplicador «x1.5 XP», la etiqueta «Única», la sección «Próximamente», la barra inferior y «El cuarto viernes». Se corrigieron los textos inexactos (borrar no cancela «todas las futuras», «para hoy») y se añadieron los siete días en «Cada N semanas» y el selector 1–31 del día del mes.

## Issues encontrados / fuera de alcance

- Saltar una ocurrencia y terminar tras N repeticiones (P3) quedaron fuera de esta spec.
- Si el cliente cambia la regla de una serie sin red, la edición no se aplica (como cualquier edición sin conexión): se avisa del error y se puede reintentar.
- Una serie cuya última ocurrencia pasó la fecha de fin queda como fila sin pendiente (no se borra); no genera nada más.
