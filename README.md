# task-manager

Gestor de tareas **gamificado** para móvil (Android), pensado para usuarios no profesionales: planifica tareas por fecha, activa alarmas, pospón o completa tareas y gana XP, niveles y rachas. Estilo desenfadado.

> Estado: en desarrollo temprano. Desarrollo guiado por especificaciones (SDD) y tests primero (TDD); ver [`specs/`](./specs/README.md).

## Stack

- **Angular 22** (standalone, Signals, OnPush, zoneless) — UI propia, **sin Angular Material**
- **Tauri 2** — solo **Android** (no hay versión web como entregable)
- **Supabase** — backend (conexión en curso, spec 002)
- pnpm · Vitest · ESLint + Prettier · Husky

## Puesta en marcha

Requisitos: Node 24+, pnpm, Rust (con los targets Android), Android SDK/NDK y JDK. Guía completa en [`docs/setup-android.md`](./docs/setup-android.md).

```bash
pnpm install
pnpm start              # navegador, solo para iterar rápido (viewport móvil)
pnpm test               # tests en watch  (pnpm test:ci: una pasada)
pnpm lint && pnpm format:check && pnpm secrets:check
pnpm tauri:android:dev  # app en emulador/dispositivo Android
```

## Base de datos (Supabase)

El esquema se define **solo con migraciones versionadas** en `supabase/migrations/`; nunca se cambia desde el panel web. Cualquiera que clone el repo podrá crear sus propias tablas en **su propio proyecto Supabase** con la CLI (`supabase link` + `db push`). Las migraciones llegarán con las primeras features; el flujo se documentará en `docs/supabase.md` (spec 002).

## Secretos

Este repositorio es público. **Nunca** se versionan contraseñas, tokens, claves secretas ni URLs privadas. La configuración local (p. ej. `src/environments/environment.ts`) está ignorada por git y se parte de `environment.example.ts`. `pnpm secrets:check` se ejecuta en cada commit.

## Cómo se trabaja aquí

Las reglas del proyecto (flujo, SDD + TDD, convenciones, seguridad) están en [`CLAUDE.md`](./CLAUDE.md) y [`.specify/memory/constitution.md`](./.specify/memory/constitution.md).
