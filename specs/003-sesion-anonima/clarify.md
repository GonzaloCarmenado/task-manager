# Clarify 003 — Sesión anónima con Supabase

**Spec**: [spec.md](./spec.md)
**Estado**: CERRADO
**Fecha**: 2026-11-13

---

## Preguntas

> Generadas por `/clarify` al analizar `spec.md`. Las marcadas «por defecto» no se preguntaron: se aplicó la propuesta.

1. **Alcance**: ¿la parte de la huella va en esta spec 003 o se separa como spec 004?
2. **Qué protege la huella**: ¿solo bloquea la pantalla o además protege el token de sesión?
3. **Cuándo se pide la huella**: ¿solo al arrancar o también al volver de segundo plano, y tras cuánto?
4. **Arranque sin sesión**: mientras se crea la sesión (o si falla), ¿app utilizable con aviso o pantalla de carga?
5. **Método alternativo** si falla la huella (por defecto): permitir el PIN, patrón o contraseña del móvil.
6. **Frecuencia de la oferta** tras «Ahora no» (por defecto): siguiente arranque; tras 3 veces se trata como «No volver a preguntar».
7. **Dónde se activa y desactiva** el bloqueo (depende de la 1).
8. **Caso límite detectado en el análisis** (por defecto): si ya hay una sesión guardada pero no hay red, ¿se muestra error o se abre la app?

---

## Respuestas

1. **Separar en spec 004** (recomendación aceptada).
2. **Solo bloquear la pantalla** con `authenticate` (recomendación aceptada).
3. **Al arrancar y al volver de segundo plano pasados 30 s** (recomendación aceptada).
4. **Pantalla de carga y, si falla, pantalla de error** con Reintentar (recomendación aceptada).
5. Sin preguntar: se permite el método alternativo del móvil.
6. Sin preguntar: siguiente arranque y tope de 3.
7. Pasa a la spec 004: se decidirá en su propio clarify.
8. Sin preguntar: con sesión guardada la app **abre al instante aunque no haya red**; el error solo aparece en el primer arranque sin sesión.

---

## Decisiones

> Resumen de lo acordado. Formato clave: valor.

| Decisión | Valor acordado |
|---|---|
| alcance | La huella sale de la 003 y pasa a la spec 004 (posterior). La 003 queda con la sesión anónima (US-003-01 a 06). |
| arranque_sin_sesión | Pantalla de carga con tiempo máximo (a fijar en el plan, p. ej. 10 s) y, si falla, pantalla de error con Reintentar. La app no se usa sin identidad. |
| arranque_con_sesión_guardada | Abre al instante, sin esperar a la red, aunque el token haya caducado; el refresco va en segundo plano. |
| refresco_fallido_definitivo | Se descarta la sesión local y se crea una nueva sesión anónima (cambia el `uid`), sin loguear tokens. Es el único caso en que cambia. |
| huella (spec 004) | Solo bloqueo de pantalla (`authenticate`); se pide al arrancar y tras 30 s en segundo plano; método alternativo del móvil permitido; «Ahora no» tope de 3. |
| interruptor_de_activación | Se decide en el clarify de la spec 004. |
| uso_offline_sin_identidad | Fuera de alcance: la app no se usa hasta tener identidad. |
| fallo_de_refresco_transitorio_o_definitivo | Conservador: transitorio (sin red, tiempo agotado, 5xx, 429 y cualquier error no reconocido) nunca descarta la sesión. Definitivo solo con rechazo explícito del servidor (token no encontrado o ya usado, sesión o usuario no encontrados). Como `supabase-js` gestiona el refresco y retira él mismo la sesión ante un rechazo definitivo (emite `SIGNED_OUT`), se detecta escuchando `onAuthStateChange`: un `SIGNED_OUT` no pedido por la app es el rechazo definitivo; no se relee ni se reintenta sobre una sesión ya retirada. El plan lo comprueba contra la versión instalada y fija los códigos exactos. |
| motivo_del_error | `AuthAccessService` expone la señal `errorReason` (`network`, `rate_limited`, `disabled`, `timeout`, `service_unavailable`, `unknown`; `null` salvo en `error`). El tiempo máximo agotado tiene su propio motivo `timeout` y las respuestas 5xx del primer inicio, `service_unavailable`. |
| reintento_tras_recuperar_red | `supabase-js` (`auth-js` 2.119.0, verificado en el código instalado) reintenta el refresco con un ciclo de **30 s**, aplica un **enfriamiento de 60 s** tras un fallo de refresco y se reactiva al volver la app a primer plano, pero no escucha el evento de red: tras reconectar puede tardar hasta ~60 s. El plan lo comprueba y, si hiciera falta, fuerza el refresco al detectar la reconexión. |
| tiempo_máximo_y_un_solo_intento | El plazo del primer inicio **solo cambia lo que se ve** (pasa a `error` con `timeout`); la llamada a `signInAnonymously()` **no se abandona** (`supabase-js` no permite cancelarla). `retry()` o un reintento automático mientras siga pendiente **se une a ella** con un plazo nuevo; si la original acaba con éxito se usa su sesión y si acaba con error se aplica. Nunca hay dos llamadas simultáneas: sin usuarios anónimos huérfanos ni gasto extra del límite por IP. |
| motivos_con_reintento_automático | Solo `network`, `timeout` y `service_unavailable` se reintentan solos (espera creciente, `online`, primer plano). `rate_limited`, `disabled` y `unknown` esperan al `retry()` manual. |
| contrato_de_ready | `ready` significa que hay identidad (`userId`), no que haya conexión ni token vigente: con token caducado y sin red las consultas con `auth.uid()` darán 401. Cada capa de datos lo trata. Documentado en `docs/supabase.md` y `CLAUDE.md`. |
| verificación_de_us_003_03 | Script reutilizable `pnpm verify:auth` (manual, no corre en CI): sesión anónima real y solo booleanos (uid coincide, `is_anonymous`, claim `role`); `decodeJwtRole` es una función pura con test. Un test de fichero comprueba que `docs/supabase.md` documenta `is_anonymous`, `ready` y `userId`. |
| tokens_en_logs | «Ningún token en consola» se prueba en todos los flujos (inicio anónimo, refresco, error y cambio de identidad). |
| rol_del_jwt | `getUser()` no devuelve el rol; se comprueba el claim `role` del `access_token` decodificado en local, sin imprimir el token. |
| diseño_de_las_pantallas | Prompt de Stitch en `stitch-prompt.md`; diseño recibido en `design/` (referencia, no se implementa tal cual). Carga y error con 5 variantes de mensaje y la acción Reintentar. |
| motivos_y_variantes | Hay 6 motivos de error y 5 variantes de mensaje: `disabled` usa la variante «Servicio no disponible» (el usuario no necesita saber que el registro anónimo está desactivado en el servidor) y `unknown` la de «Error inesperado». |
| disparador_de_reconexión_primer_inicio | El primer inicio no es un refresco y `supabase-js` no lo reintenta: lo disparan el evento `online` del WebView y la vuelta a primer plano, respetando un solo intento en curso. El plan comprueba que `online` funciona en Android. |
| carga_indeterminada (D1) | La carga es un indicador indeterminado: sin porcentaje, pasos simulados ni promesas de tiempo. |
| textos_veraces (D2, D4) | Ningún texto afirma que los datos estén «en el dispositivo» ni que «los avances siguen a salvo». |
| sin_gamificación_en_la_carga (D3) | La carga no muestra XP, racha ni nivel; sin XP de bienvenida (la gamificación empieza con la primera tarea). |
| aviso_de_reintento_automático (D5) | «Comprobando la conexión automáticamente…» solo en `network`, `timeout` y `service_unavailable` y solo mientras queden reintentos. |
| elementos_de_prototipo | No se implementan el selector de tema, el simulador de estados, la herramienta de prueba ni la barra «System Recovery». El tema sigue al del sistema. |
| cambio_de_identidad_en_caliente | Pasa por `loading` (pantalla de carga) y publica el nuevo `userId`; las capas de datos futuras indexan por `userId()` y descartan lo del `uid` anterior. |
| estado_idle | Se trata como `loading`: cubre la app; nunca se ve contenido sin identidad. |
| límite_de_registros_anónimos | `anonymous_users` entre 1 y 30 por hora e IP, comprobado por test. |

---

## Revisión cruzada (DeepSeek, tras el primer cierre)

6 hallazgos (3 graves). Aplicados 5 (criterio P1 sin test, frontera transitorio/definitivo, carrera de cambio de `uid`, estado `idle`, límite de registros sin test). Descartado 1: «las decisiones de la huella no están en la 003», porque la spec 004 ya existía y las recoge (el revisor solo ve lo versionado en `HEAD`).

---

**Estado**: CERRADO
