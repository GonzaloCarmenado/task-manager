# Clarify 011 — Cuenta de usuario

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-14

---

## Preguntas

> Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Verificación del correo y recuperación**: ¿código de 6 dígitos o enlace?
2. **Entrar en una cuenta existente con tareas anónimas en el móvil**: ¿descartar, fusionar o preguntar?
3. **Envío de correo**: ¿integrado ahora y SMTP propio antes de publicar, o SMTP propio desde ya?
4. **Recordatorio a quien no tiene cuenta**: ¿aviso discreto o solo el icono de perfil?
5. **Sin correos, ¿con qué se identifica la cuenta?** (surgió de la respuesta 1 y 3)
6. **Sin correos, ¿cómo se recupera el acceso?** (surgió de la respuesta 1 y 3)
7. **Reglas de contraseña** (por defecto): mínimo 8 caracteres y máximo 64, sin otras exigencias de composición; no puede ser igual al nombre de usuario. Se explica en el momento qué falta. Los intentos fallidos los limita el servicio: la app muestra «Demasiados intentos, espera unos minutos» sin detalles técnicos.
8. **Cerrar sesión** (por defecto): deja una sesión anónima nueva y vacía, cancela las alarmas del móvil y los datos siguen en la cuenta.
9. **Confirmaciones sensibles** (por defecto): cambiar la contraseña pide la actual; borrar la cuenta pide la contraseña y una confirmación explícita; cambiar el nombre de usuario pide la contraseña.
10. **Nombre de usuario** (por defecto): de 3 a 24 caracteres entre letras minúsculas, números, punto, guion y guion bajo; no distingue mayúsculas (se guarda en minúsculas); único. Al registrarse, «no disponible» es inevitable (revela que existe); al iniciar sesión, el error es siempre genérico.
11. **Qué pasa con las alarmas, la caché y el bloqueo con huella al cambiar de identidad** (por defecto): se cancelan y reconcilian las alarmas, la caché sigue indexada por `userId()` y el bloqueo con huella es independiente de la cuenta.
12. **Dónde está la cuenta** (por defecto): icono de perfil en la cabecera de la lista que abre la pantalla Cuenta; el recordatorio es una tarjeta bajo el resumen de nivel.
13. **Sin red** (por defecto): registrarse, entrar, cambiar contraseña y borrar necesitan red y lo explican; la sesión guardada sigue funcionando sin red.

---

## Respuestas

1. **Sin verificación por correo.** Ni código ni enlace.
2. **Preguntar**: antes de entrar, si el móvil tiene tareas anónimas, se ofrece «traer las tareas pendientes de este móvil a tu cuenta» o «usar solo tu cuenta» (las de este móvil se descartan, con confirmación). El XP y las completadas del móvil no se suman a la cuenta.
3. **Sin envío de correo de ningún tipo.** No hay SMTP ni plantillas.
4. **Aviso discreto descartable**: tarjeta pequeña bajo el resumen de nivel, solo tras completar la primera tarea; si se descarta no vuelve en 14 días.
5. **Nombre de usuario y contraseña.** No se recoge ningún correo. Por dentro Supabase usa un identificador interno con forma de correo que la persona nunca ve (se comprobará en `/sdd-plan` que el servicio lo acepta).
6. **Sin recuperación.** Si se olvida la contraseña, la cuenta se pierde; se avisa con claridad y con confirmación al crearla. Solo se puede cambiar la contraseña estando dentro.

---

## Decisiones

| Decisión | Valor acordado |
|---|---|
| Identificador | Nombre de usuario + contraseña; sin correo ni verificación; identificador interno ficticio |
| Verificación y envío de correo | Ninguno (sin SMTP, sin plantillas, sin códigos ni enlaces) |
| Recuperar el acceso | **Sin recuperación** (historia US-011-04 sin trabajo); aviso claro y confirmación al crear la cuenta |
| Datos anónimos al entrar en una cuenta existente | Preguntar: traer pendientes o usar solo la cuenta (descartar con confirmación); sin XP ni completadas |
| Contraseña | 8–64 caracteres, distinta del nombre de usuario; sin otras reglas |
| Nombre de usuario | 3–24 caracteres `[a-z0-9._-]`, sin distinguir mayúsculas, único |
| Cerrar sesión | Sesión anónima nueva y vacía; alarmas canceladas; datos en la cuenta |
| Confirmaciones | Contraseña actual para cambiarla; contraseña para borrar y para cambiar el nombre de usuario |
| Cambiar el correo | Pasa a «cambiar el nombre de usuario» (P3) |
| Recordatorio sin cuenta | Tarjeta descartable tras la primera tarea completada; no reaparece en 14 días |
| Remoto | Desactivar la confirmación de correo del proyecto y fijar la longitud mínima de contraseña (configuración remota, con confirmación del usuario y tras verificar la cuenta de la CLI) |
| Riesgos aceptados | Sin recuperación; sin verificación: nombre de usuario ocupable por cualquiera; seguridad = solo la contraseña (sin MFA) |

---

**Estado**: CERRADO
