Arranca el ciclo SDD+TDD para una nueva feature. Genera `spec.md` y actualiza el índice.

## Pasos

1. Ejecuta `git branch --show-current` para saber la rama activa.
2. Obtén el **siguiente número disponible** (NNN) leyendo el directorio real:
   - `ls specs/ | grep -E '^[0-9]' | sort -n | tail -1` → NNN = ese número + 1. El README no es fuente de verdad del número.
3. Si el usuario no ha dado descripción de la feature, pídela antes de continuar (pregunta `F`).
3b. **Pregunta obligatoria (AskUserQuestion)**: «¿Ciclo completo (revisión cruzada con DeepSeek tras el clarify y antes del push) o simple (solo Claude)?». Recomienda *simple* solo si es mantenimiento sin lógica (actualizar una librería, texto, estilos) y *completo* en cualquier otro caso. Cuenta como pregunta `F`. Anótalo en la cabecera de la spec (`**Ciclo**: completo|simple`).
4. Determina si la feature tiene **frontal** (pantallas/UI) y anótalo en la cabecera (`**Frontal**: sí|no`). Si es sí, tras el clarify habrá que generar el prompt de Stitch (`/stitch-prompt`).
5. Crea `specs/NNN-nombre-kebab/spec.md` desde `specs/_TEMPLATE/spec.md`. Rellena:
   - **Objetivo**: una sola frase, sin ambigüedades.
   - **Contexto**: qué existe hoy y por qué no basta.
   - **Historias de usuario**: mínimo 2, con criterios de aceptación concretos y medibles; P1 = bloqueante, P2 = deseable, P3 = opcional. Incluye el comportamiento móvil relevante.
   - **Plan de tests (TDD)**: cada criterio con su test (id `US-NNN-xx`).
   - **Ficheros afectados**: rutas exactas; si dudas, `(por confirmar en /sdd-plan)`.
   - **Modelo de datos**: solo si hay tipos nuevos o SQL. Toda tabla nueva: RLS por usuario.
   - **Restricciones técnicas** y **Out of scope**.
6. Actualiza `specs/README.md`: incrementa "Siguiente número disponible" y añade la fila con estado `Borrador`.
7. Muestra la spec y espera feedback o aprobación explícita ("dale", "ok", "adelante", "vamos").
8. Al aprobar, informa: "Spec lista. Siguiente paso: `/clarify`."
9. Registra el turno y las preguntas (F/W) en `docs/interacciones.md`.

## Notas

- NO escribas tests ni implementes código en este paso.
- NO lances `/clarify` automáticamente; lo invoca el usuario.
- Repo público: nada de secretos, correos, *project refs*, rutas locales ni nombres de proyectos privados en la spec.
- La spec es un contrato, no un diseño técnico; el cómo va en `/sdd-plan`.
