Abre una Pull Request para la rama actual siguiendo las convenciones del proyecto.

Pasos:
1. Ejecuta `git log --oneline main..HEAD` para ver los commits incluidos.
2. Ejecuta `git diff --stat main..HEAD` para ver los ficheros cambiados.
3. Redacta título (< 70 caracteres, formato `feat/fix/chore(NNN): descripción`) y cuerpo con:
   - **Summary**: bullets con los cambios principales
   - **Spec**: referencia a la spec implementada
   - **Test plan**: checklist de verificación manual (incluye comprobación en Android)
4. Muestra título y cuerpo al usuario para aprobación ANTES de ejecutar `gh pr create` (pregunta `W`).
5. Solo ejecuta `gh pr create` tras confirmación explícita.
6. Registra la interacción en `docs/interacciones.md`.
