# Revisión cruzada (DeepSeek) — spec 007

**Fecha**: 2026-11-14 · Una pasada tras cerrar el clarify.

El revisor leyó la spec anterior al clarify (y sin las specs 006 a 008, que aún no estaban versionadas), por lo que varios hallazgos ya estaban resueltos en el disco cuando se emitieron.

| # | Hallazgo | Gravedad | Valoración |
|---|---|---|---|
| 1 | El contador «sube cada vez que se pospone» contradice el clarify | alta | **Ya resuelto** al emitirse (criterio reescrito); se añade test de la semántica real |
| 2 | La opción «+1 hora» no está en la spec | media | **Ya resuelto**; faltaba el valor `later-today` en el modelo (corregido) |
| 3 | Opciones ocultas y «misma fecha» no están en la spec | media | **Ya resuelto**; ahora con test |
| 4 | El plan de tests no cubre esos criterios | media | **Válido**: añadidas las filas de contador, medianoche, opciones ocultas y mínimo de «Elegir fecha» |
| 5 | US-007-03 depende de la 006, que «no existe» | media | **Falso en el repo** (la 006 existe, sin versionar aún), **válido como dependencia**: se fija el orden de implementación (006 antes que 007) y qué pasa si faltara |
| 6 | «Elegir fecha» permite mover una tarea futura hacia atrás | baja | **Válido**: el mínimo pasa a ser posterior a la fecha actual de la tarea (hoy si está atrasada o sin fecha; el día siguiente si ya es de hoy o futura) |

---

# Implementación (estado al cerrar el cliente)

| Comprobación | Resultado |
|---|---|
| Tests de la app, de scripts y `secrets:check` | En verde |
| Hoja de posponer en navegador (390 px): opciones, atrasada, sin fecha y lejana, fecha no válida, objetivos ≥ 44 px, sin scroll horizontal, consola limpia | OK |
| Fila de la lista con el botón Posponer; tema oscuro | OK en emulador (claro y oscuro) |
| Botón atrás de Android cierra la hoja sin salir de la app; selector nativo de fecha con mínimo; la tarea cambia de grupo y se avisa | OK en emulador |
| Aviso del sistema reprogramado al posponer (alarma exacta nueva a la hora elegida) y cancelado al completar | OK en emulador (`dumpsys alarm`) |
| Persistencia al reabrir la app | OK |
| `db push` de `postponed_count` y `verify:rls` ampliado | **HECHO** (migración aplicada; 16 comprobaciones OK) |

**Orden obligatorio**: aplicar la migración **antes** de ejecutar el cliente contra el remoto: el cliente exige `postponed_count` y, sin la columna, las tareas existentes no se mostrarían.

Hallazgo de la revisión en emulador: en las filas sin hora el título quedaba pegado arriba; se centra verticalmente (`justify-content: center` en `.open`).
