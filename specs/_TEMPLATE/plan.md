# Plan NNN — Título de la Feature

**Spec**: [spec.md](./spec.md) | **Clarify**: [clarify.md](./clarify.md)
**Diseño (Stitch)**: pantallas generadas a partir de [stitch-prompt.md](./stitch-prompt.md) (solo si hay frontal)
**Estado**: Borrador
**Fecha**: YYYY-MM-DD

---

## Enfoque técnico

Descripción en prosa de la estrategia (1-3 párrafos): decisiones de diseño clave, patrones aplicados y por qué.

---

## Ficheros afectados

| Ruta | Acción | Descripción del cambio |
|---|---|---|
| `src/app/...` | Crear | Nuevo componente/servicio/modelo |
| `src/app/...` | Modificar | Descripción concisa del cambio |
| `supabase/migrations/YYYYMMDDHHMMSS_desc.sql` | Crear | Migración SQL con RLS |

---

## Interfaces TypeScript

```typescript
// src/app/shared/models/ejemplo.interface.ts
export interface NuevoModelo {
  readonly id: string;
}
```

---

## Esquema SQL (solo si hay BBDD)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql
-- tabla + RLS por usuario en la misma migración
-- Rollback documentado al final como comentario
```

---

## Pantallas (solo si hay frontal)

Una entrada por pantalla del diseño de Stitch: qué datos muestra, qué acciones permite, estados (vacío, carga, error) y navegación. Mapa pantalla → componente.

---

## Estrategia de tests (TDD)

| Fichero spec | Qué cubre | Criterio |
|---|---|---|
| `src/app/.../servicio.spec.ts` | Crear: métodos X e Y con mocks | US-NNN-01 |

Cobertura objetivo: ≥ 80 % en los access services afectados, sin bajar la existente.

---

## Orden de implementación (Red → Green → Refactor por historia)

1. Migración SQL (si aplica)
2. Interfaces / modelos
3. Por cada historia P1 → P2 → P3: tests en rojo → código mínimo → refactor
4. Revisión visual en navegador y Android

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Descripción del riesgo | Alta/Media/Baja | Cómo se mitiga |
