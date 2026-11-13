# Spec NNN — Título de la Feature

> Sustituir NNN por el número siguiente. Borrar este bloque al rellenar.

**Rama**: `<usuario>/NNN-nombre-kebab`
**Creada**: YYYY-MM-DD
**Estado**: Borrador
**Ciclo**: completo
**Frontal**: sí | no

> `Ciclo: simple` salta la revisión cruzada con DeepSeek (solo para mantenimiento sin lógica: texto, estilos, actualizar una librería). `Frontal: sí` obliga a generar el prompt de Stitch tras el clarify.

---

## Objetivo

Una frase: qué resuelve esta spec y para quién.

---

## Contexto

- Qué componentes/servicios existen y se modifican.
- Por qué el estado actual no es suficiente.
- Dependencias con otras specs.

---

## Historias de usuario

### US-NNN-01 — Nombre corto (P1)

**Como** [rol], **quiero** [acción], **para** [beneficio].

**Criterios de aceptación:**
- El sistema hace X cuando ocurre Y.
- Caso borde B → mensaje M.
- Móvil: comportamiento táctil / safe-area / teclado virtual relevante.

### US-NNN-02 — Nombre corto (P2)

...

---

## Plan de tests (TDD)

Cada criterio tiene al menos un test. El orden es el orden Red → Green.

| Test | Criterio | Fichero spec | Tipo |
|---|---|---|---|
| `US-NNN-01 …` | CA 1 de US-NNN-01 | `src/app/features/x/x.access.service.spec.ts` | unit |

Si hay frontal: revisión visual en navegador con la extensión de Chrome (obligatoria) y comprobación en Android.

---

## Ficheros afectados

**Crear:**
- `src/app/...`

**Modificar:**
- `src/app/...`

**Supabase (si aplica):**
- `supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql` (con RLS)

**Tauri / Android (si aplica):**
- `src-tauri/...`

---

## Modelo de datos (si aplica)

```typescript
export interface Nuevo {
  readonly id: string;
}
```

---

## Restricciones técnicas

- `ChangeDetectionStrategy.OnPush`, Signals, standalone, sin `any`.
- Sin Angular Material: UI con componentes propios de `shared/components`.
- Mobile-first: targets ≥ 44 px, safe-areas, sin depender de hover.
- Acceso a datos / APIs nativas solo desde el `access.service`.
- Repo público: sin secretos ni datos privados en código, specs ni docs; `pnpm secrets:check` en verde.
- Cambios de esquema solo con migración versionada y RLS por usuario.
- [Específicas de esta spec]

---

## Out of scope

- [Lo que explícitamente NO entra]
