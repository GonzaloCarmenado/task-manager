# Diseño de la spec 003 (Stitch)

**Origen**: export de Stitch recibido el 2026-11-13, generado a partir de [`../stitch-prompt.md`](../stitch-prompt.md).
**Sistema de diseño**: [`../../_design/playful-momentum/DESIGN.md`](../../_design/playful-momentum/DESIGN.md) («Playful Momentum»: tokens de color, tipografía, radios y espaciado, y reglas de componentes). Es común a todas las specs.

## Contenido

| Carpeta | Pantalla (US-003-06) | Estado de la sesión |
|---|---|---|
| `preparando-la-app/` | Carga | `idle`, `loading` y cambio de identidad |
| `algo-no-ha-ido-bien/` | Error con 5 variantes (sin conexión, demasiados intentos, servicio no disponible, tarda más de lo normal, error inesperado) | `error` (`network`, `rate_limited`, `service_unavailable` y `disabled`, `timeout`, `unknown`) |

Cada carpeta tiene `screen.png` (captura) y `code.html` (maqueta).

## Cómo usarlo

- **Es referencia visual y funcional, no código a copiar.** `code.html` se apoya en Tailwind por CDN y en un simulador de estados con JavaScript. No se ejecuta, no se sirve y no entra en la app. La app se construye con componentes Angular propios, tokens CSS y sin Material ni Tailwind (ver `CLAUDE.md`).
- De aquí salen, en el plan, el mapa pantalla → componente y los tokens de `src/styles/_tokens.scss`.
- El mapa de motivos de la spec a variantes de Stitch: `disabled` usa la variante «Servicio no disponible» y `unknown`, «Error inesperado».

## Elementos de prototipo que NO se implementan

- Barra superior de la carga con «MODO RÁPIDO» y el selector «Claro».
- Tarjeta «Herramienta de prueba · Simular fallo».
- En el error: «SIMULADOR DE ESTADOS», las pastillas para cambiar de variante y el botón «Modo Oscuro» (el tema sigue el del sistema).
- En el error: la barra de aplicación «System Recovery» (en inglés), con flecha de volver y avatar. En el arranque no hay navegación ni perfil.

## Decisiones sobre el contenido del diseño (resueltas el 2026-11-13)

> Regla del proyecto: lo que Stitch añade y no está en la spec se ignora sin preguntar; solo se conserva lo pedido. No hace falta regenerar las pantallas (`../stitch-ajustes.md` es opcional).

Se aplican en la spec (US-003-06, criterios 8 a 10) y se anotan en el `clarify.md`.

| # | Dónde | Problema en el diseño | Decisión |
|---|---|---|---|
| D1 | Carga | Barra con porcentaje, pasos «Identidad / Misiones / Espacio XP», «Creando misiones de primer día…» y «Todo listo en 3 segundos»: simulan un progreso que no existe y prometen un tiempo. | **Indicador indeterminado**, sin cifras, sin pasos falsos y sin promesas de tiempo. |
| D2 | Carga | «100 % Anónimo · En tu dispositivo» es inexacto (la identidad se crea en el servidor); «Sin cuenta bancaria ni registros» es confuso. | **Texto veraz**, sin «en tu dispositivo», p. ej. «Sin registro: empiezas ya». |
| D3 | Carga | «+50 XP», «Racha de bienvenida», «Nivel 1 Activo» y «0 tareas vencidas» inventan progreso. | **Quitado**: la carga no muestra XP, racha ni nivel. La gamificación empieza con la primera tarea completada. |
| D4 | Error | «Tus avances siguen a salvo · No has perdido ningún dato ni racha» es engañoso (en el primer arranque no hay avances; con sesión guardada no se ve esta pantalla). | **Quitado** (o sustituido por un texto cierto). |
| D5 | Error | «Comprobando conexión automáticamente…» no es cierto en todos los motivos. | **Solo mientras queden reintentos automáticos reales** (`network`, `timeout`, `service_unavailable`). |

Mapa de motivos a variantes: `network` → Sin conexión · `rate_limited` → Demasiados intentos · `timeout` → Tarda más de lo normal · `service_unavailable` y `disabled` → Servicio no disponible · `unknown` → Error inesperado.

Para que las pantallas de Stitch reflejen estas decisiones, ver [`../stitch-ajustes.md`](../stitch-ajustes.md).
