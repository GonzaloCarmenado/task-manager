# Prompt de Stitch — Spec 003 (pantallas de carga y error de la sesión)

> Pegar tal cual en Stitch. Solo describe funcionalidad: pantallas, datos, acciones, estados y flujos. La parte visual la decide Stitch con la guía de estilo que ya tiene como contexto.

---

Diseña las pantallas de arranque de una app móvil Android de gestión de tareas gamificada para usuarios no profesionales (listado de tareas planificables, alarmas, XP, niveles y rachas). Usa la guía de estilo de la app que ya tienes como contexto. Esta petición es solo de **funcionalidad**: decide tú todo lo visual.

## Contexto de la funcionalidad

Al abrir la app por primera vez, la app prepara en segundo plano una identidad anónima del usuario: no hay registro, ni correo, ni contraseña, ni formulario de ningún tipo. Mientras eso ocurre, el usuario no puede usar la app, así que hacen falta pantallas que le expliquen qué pasa y, si algo falla, qué puede hacer. Cuando todo va bien, estas pantallas desaparecen solas y se entra a la app.

Estas pantallas **no se ven** en los arranques posteriores, porque la app recuerda al usuario y abre directamente. Solo aparecen en el primer arranque y, muy raramente, si la app tiene que renovar la identidad del usuario.

Uso en vertical, con una mano. Debe contemplar modo claro y modo oscuro.

## Pantalla 1 — Preparando la app (carga)

- **Qué muestra**: un mensaje corto y amable que indica que se está preparando el espacio del usuario, y un indicador de que hay algo en marcha.
- **Acciones**: ninguna. El usuario solo espera.
- **Qué ocurre después**: cuando la sesión está lista, desaparece sola y se muestra la app. Si falla o tarda demasiado, pasa a la pantalla 2.
- **Reglas**: dura pocos segundos como máximo; no debe parecer bloqueada. Cubre toda la app: no se ve ningún contenido detrás.
- Es la misma pantalla que se muestra al pulsar «Reintentar» y mientras la app renueva la identidad.

## Pantalla 2 — Algo no ha ido bien (error)

- **Qué muestra**: un título y una explicación en lenguaje llano, sin términos técnicos ni códigos, que cambian según el motivo. Debe tener tono cercano y tranquilizador: que no parezca culpa del usuario.
- **Variantes de motivo** (el diseño debe contemplar las cinco):
  1. **Sin conexión**: no hemos podido conectar; comprueba tu conexión a internet.
  2. **Demasiados intentos**: has hecho muchas peticiones seguidas; espera un momento y vuelve a intentarlo.
  3. **Servicio no disponible**: estamos teniendo problemas por nuestra parte, o el servicio aún no está activo; inténtalo en unos minutos.
  4. **Tarda más de lo normal**: la conexión va lenta y no hemos podido terminar a tiempo.
  5. **Error inesperado**: algo no ha funcionado y no sabemos exactamente qué.
- **Acciones**: una acción principal, **Reintentar**, siempre visible y fácil de pulsar con el pulgar. No hay más acciones.
- **Qué ocurre tras pulsar Reintentar**: vuelve a la pantalla 1 (carga). Si esta vez va bien, entra a la app; si no, vuelve a esta pantalla con el motivo que corresponda.
- **Reglas**: la app se recupera sola cuando vuelve la conexión, así que esta pantalla puede desaparecer sin que el usuario haga nada. No se pide registrarse ni iniciar sesión en ningún caso.

## Flujo completo

```
Abrir la app (primera vez)
  → Pantalla 1: Preparando la app
      → éxito → entra a la app
      → fallo o tiempo agotado → Pantalla 2: error (según motivo)
            → Reintentar → Pantalla 1
            → vuelve la conexión sola → Pantalla 1 → entra a la app
```

## Estados a cubrir

Carga · error de conexión · demasiados intentos · servicio no disponible · tiempo agotado · error inesperado · recuperación (transición de error a carga y a la app).

## Accesibilidad funcional

Todos los textos deben poder leerse con un lector de pantalla y el estado de carga debe anunciarse. La acción «Reintentar» debe ser alcanzable con una mano.

## Lo que NO quiero en este diseño

Ningún formulario, ni botones de registro o inicio de sesión, ni campos de texto, ni menús, ni pantalla de bienvenida (eso es otra funcionalidad). Solo estas dos pantallas y sus variantes.
