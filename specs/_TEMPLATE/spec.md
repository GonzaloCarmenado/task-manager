# Spec NNN — Título de la Feature

> Sustituir NNN por el número siguiente del README. Borrar este bloque al rellenar.

**Rama**: `<usuario>/NNN-nombre-kebab`
**Creada**: YYYY-MM-DD
**Estado**: Borrador

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

---

## Ficheros afectados

**Crear:**
- `src/app/...`

**Modificar:**
- `src/app/...`

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

- `ChangeDetectionStrategy.OnPush`, Signals, standalone.
- Sin Angular Material: UI con componentes propios de `shared/components`.
- Mobile-first: targets ≥ 44 px, safe-areas, sin depender de hover.
- Revisión visual en navegador con la extensión de Chrome (obligatoria si hay UI).
- Acceso a datos / APIs nativas solo desde el `access.service`.
- Repo público: sin secretos ni datos privados en código, specs ni docs; `pnpm secrets:check` en verde.
- [Específicas de esta spec]

---

## Out of scope

- [Lo que explícitamente NO entra]
