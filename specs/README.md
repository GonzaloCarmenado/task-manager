# task-manager — Índice de Especificaciones

**Siguiente número disponible**: `012`

---

## Especificaciones

| # | Especificación | Estado | Descripción |
|---|---|---|---|
| [001](./001-scaffolding/spec.md) | Scaffolding Angular + Tauri Android | Implementada | Esqueleto Angular sin Material, lint/format/tests/hooks, Tauri 2 solo Android |
| [002](./002-supabase-setup/spec.md) | Conexión con Supabase | Implementada | CLI, migraciones, cliente Angular y entorno sin secretos en git |
| [003](./003-sesion-anonima/spec.md) | Sesión anónima con Supabase | Implementada | Identidad anónima persistente, abre sin red con sesión guardada, pantallas de carga y error |
| [004](./004-bloqueo-huella/spec.md) | Bloqueo de la app con huella | Implementada | Bloqueo opcional con el lector de huellas de Android (solo pantalla), tras la 003 |
| [005](./005-tareas-basicas/spec.md) | Tareas básicas | Implementada | Crear, listar por fecha, completar, editar y borrar tareas por usuario en Supabase (RLS) |
| [006](./006-alarmas/spec.md) | Alarmas de tareas | Implementada | Aviso del móvil a la hora de la tarea (notificaciones locales de Android, permiso en contexto) |
| [007](./007-posponer/spec.md) | Posponer tareas | Implementada | Mover una tarea a otro día con opciones rápidas y contador de pospuestas |
| [008](./008-gamificacion/spec.md) | Gamificación: XP, niveles y rachas | Implementada | 10 XP por tarea completada, niveles, rachas de días y pantallas de progreso |
| [009](./009-e2e-cypress/spec.md) | Pruebas e2e con Cypress | Implementada | 42 pruebas de flujos completos con Supabase simulado (`pnpm e2e`) |
| [010](./010-interfaz-stitch/spec.md) | Interfaz fiel al sistema de diseño de Stitch | Implementada | Adoptar tipografía, paleta, formas, sombras y componentes de «Playful Momentum» en todas las pantallas, sin funcionalidad nueva |
| [011](./011-cuenta-usuario/spec.md) | Cuenta de usuario | Aprobada (clarify cerrado) | Usuario y contraseña (sin correo) conservando lo anónimo, pantalla Cuenta, cerrar sesión, cambiar contraseña y usuario, borrar cuenta |

---

## Diseño

El sistema de diseño común vive en `specs/_design/` (hoy, `playful-momentum`). Los diseños de pantallas de cada spec van en `specs/NNN-nombre/design/` (referencia visual de Stitch, no código a copiar).

---

## Metodología SDD + TDD

Spec → aprobación → tests en rojo → implementación mínima → refactor. Ver `CLAUDE.md` y `specs/_TEMPLATE/spec.md`.
