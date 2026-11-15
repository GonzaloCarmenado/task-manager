# Diseño 012 — Tareas repetitivas

**Procedencia**: exportado de Stitch a partir de `../stitch-prompt.md` (2026-11-15). `DESIGN.md` es idéntico al sistema común `specs/_design/playful-momentum/DESIGN.md` (no se vuelve a copiar). `code.html` es solo referencia visual: no se ejecuta ni se copia a la app.

**La spec manda.** Todo lo que Stitch añadió y no está en la spec o en el prompt se ignora.

## Mapa pantalla → estado

| Carpeta | Contiene |
|---|---|
| `formulario-configurar-repeticion/` | Formulario con la fila «Repetir» (con repetición y sin fecha), hoja «Configurar repetición» con frecuencia, días, intervalo, día del mes, finalización, error de fecha y resumen |
| `lista-series-y-decision/` | Lista con tareas repetitivas, ocurrencia futura bloqueada, aviso «Próxima: …», hoja de edición «Solo esta / Toda la serie» y hoja de borrado |

## Se implementa (coincide con la spec)

Fila «Repetir» con regla resumida y desactivada sin fecha («Elige una fecha para repetir la tarea»); hoja con las seis frecuencias, siete botones de día (L M X J V S D, 44 px), selector numérico, aviso del último día del mes, «Nunca» / «El día…», error de fecha de fin, resumen y «Primera ocurrencia»; «Descartar» / «Listo»; icono y texto de repetición en cada tarea; ocurrencia futura con completar desactivado y «Disponible el jueves»; aviso «Hecho. Próxima: …»; hojas «Esta tarea se repite» al editar y borrar con «Solo esta» / «Toda la serie» y «Cancelar»; mensaje de que lo completado se conserva al borrar la serie.

## Ignorado (no está en la spec ni en el prompt)

- Simuladores de estado: «Modo demo interactivo», «Modos de prueba», «Spec Recurrencia».
- XP inventado: insignia «+25 XP» en la cabecera del formulario, «+10 XP» en el botón Guardar, «+25/+15 XP» por tarea. El XP es el de la 008 (10 por tarea) y no cambia.
- Tarjeta «Racha de 6 días · x1.5 XP» del formulario: un multiplicador de XP no existe y no entra.
- Etiqueta «Única» en las tareas que no se repiten.
- Sección aparte «Próximamente / Ocurrencias futuras» con «Solo lectura»: la ocurrencia futura va en la lista, en su día, con el completar desactivado.
- Barra inferior «Tareas / Hábitos / Logros / Perfil» y cabecera «Task List / Task Form» del prototipo: la app ya tiene su navegación y sus cabeceras.
- Barra «Posponer mueve solo esta ocurrencia» dentro de cada tarjeta: posponer sigue en su sitio actual (spec 007).
- Opción «El cuarto viernes» del día del mes: no está en la spec.
- Candado y texto «proteger el cómputo honesto de tu racha» / «a las 00:00 del jueves»: el texto es inexacto; basta «Disponible el jueves».

## Inexacto o incompleto respecto a la spec (se corrige al implementar)

- **Cada N semanas** no muestra los siete botones de día (solo el selector numérico). La spec los exige: se muestran ambos.
- **Día del mes**: solo enseña «Día 24»; falta el selector del 1 al 31.
- **Error de fecha de fin**: dice «debe ser posterior»; la spec solo prohíbe que sea **anterior** a la primera ocurrencia (el mismo día vale).
- Hoja de borrar: «cancela todas las tareas futuras planificadas» es falso (solo hay una pendiente por serie). Texto correcto: se borra la ocurrencia pendiente y la tarea deja de repetirse.
- Hoja de editar: «tarea programada para hoy» / «futuras permanecerán sin cambios»; la ocurrencia puede ser de otro día. Se redacta sin «hoy».
- Falta el aviso «Hecho. Era la última repetición» y el estado de ocurrencia atrasada; se hacen según la spec con el patrón del resto.
- «Hecho (+10 XP)» solo se muestra si hay XP real; si el tope diario ya se alcanzó, no.
- Cuando se quita la fecha de una tarea con repetición, el prototipo no muestra el aviso de que vuelve a «No se repite»; se implementa según el prompt.

## Decisiones pendientes

Ninguna: no hay decisión de producto que la spec no resuelva.
