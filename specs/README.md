# task-manager — Índice de Especificaciones

**Siguiente número disponible**: `005`

---

## Especificaciones

| # | Especificación | Estado | Descripción |
|---|---|---|---|
| [001](./001-scaffolding/spec.md) | Scaffolding Angular + Tauri Android | Implementada | Esqueleto Angular sin Material, lint/format/tests/hooks, Tauri 2 solo Android |
| [002](./002-supabase-setup/spec.md) | Conexión con Supabase | Implementada | CLI, migraciones, cliente Angular y entorno sin secretos en git |
| [003](./003-sesion-anonima/spec.md) | Sesión anónima con Supabase | Implementada | Identidad anónima persistente, abre sin red con sesión guardada, pantallas de carga y error |
| [004](./004-bloqueo-huella/spec.md) | Bloqueo de la app con huella | Borrador | Bloqueo opcional con el lector de huellas de Android (solo pantalla), tras la 003 |

---

## Diseño

El sistema de diseño común vive en `specs/_design/` (hoy, `playful-momentum`). Los diseños de pantallas de cada spec van en `specs/NNN-nombre/design/` (referencia visual de Stitch, no código a copiar).

---

## Metodología SDD + TDD

Spec → aprobación → tests en rojo → implementación mínima → refactor. Ver `CLAUDE.md` y `specs/_TEMPLATE/spec.md`.
