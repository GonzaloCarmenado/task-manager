# Spec 009 — Pruebas e2e con Cypress

**Rama**: `interaction-logging-claude-md` (actual)
**Creada**: 2026-11-14
**Estado**: Implementada (pendiente de revisión del usuario)
**Ciclo**: simple (sin lógica de producto: solo pruebas y tooling)
**Frontal**: no

---

## Objetivo

Comprobar de extremo a extremo, en un navegador real y con viewport móvil (390×844), los flujos completos de la app: crear, editar, borrar, completar, posponer, XP, tope diario, niveles, racha y fallos. No se limitan a navegar: cada prueba comprueba lo que se ve y lo que llega al servidor.

## Contexto

Hasta ahora solo había tests unitarios (Vitest, servicios simulados) y revisiones manuales. Las e2e no sustituyen la comprobación en Android (emulador/dispositivo), que sigue siendo obligatoria.

## Decisiones

- **Cypress 16** (`pnpm e2e`, `pnpm e2e:open`). `scripts/e2e.mjs` arranca `ng serve --configuration e2e` en el puerto 4300 y lo para al terminar.
- **Entorno ficticio**: la configuración `e2e` de Angular sustituye `environment.ts` por `environment.e2e.ts` (URL local y clave inventadas, versionado). Nunca se toca un Supabase real ni hacen falta credenciales.
- **Supabase simulado con estado** (`cypress/support/backend.ts`) mediante `cy.intercept`: sesión anónima, CRUD de `tasks`, `get_progress` y las reglas de los disparadores (10 XP por tarea, tope de 100 XP/día, desmarcar quita el XP, racha por días seguidos). Permite inyectar fallos (500 y error de red).
- **Fecha fija**: `cy.clock` solo simula `Date`: hoy es el sábado 14/11/2026 a las 10:00.
- **Límite**: el simulador replica las reglas documentadas, pero no prueba las migraciones SQL reales; eso lo cubren `pnpm verify:rls` y `pnpm verify:progress` contra el remoto.

## Cobertura

| Fichero | Flujos |
|---|---|
| `tareas.cy.ts` | Estado vacío, crear con fecha y hora, validación de título y de 120 caracteres, fecha por defecto y hora dependiente de fecha, agrupado y orden, editar, cancelar, borrar con confirmación, persistencia tras recargar |
| `completar-xp.cy.ts` | +10 XP, celebración, completadas, desmarcar (−10 XP), bucle sin XP, subida de nivel, tope diario, desmarcar sin XP, día local enviado |
| `posponer.cy.ts` | Opciones de la hoja, Mañana, semana que viene, más tarde hoy, atrasadas, fecha elegida válida e inválida, desde el formulario, rollback si falla, completadas sin botón |
| `progreso.cy.ts` | Usuario nuevo, racha de 3 días, racha viva, racha rota, desmarcar rompe la racha, Volver/Cerrar, carga directa |
| `errores.cy.ts` | Fallo de carga (500 y red) con Reintentar, guardado, completar, borrar, progreso y pantalla de progreso |

## Out of scope

- Android real (Tauri): alarmas, botón atrás, selector nativo de fecha.
- Ejecutar las e2e en CI (queda para cuando exista pipeline).
- Tema oscuro (Cypress no alterna `prefers-color-scheme` de forma sencilla).
