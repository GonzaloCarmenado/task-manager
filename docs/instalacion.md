# Instalar la app en Android

La app (nombre provisional: *task-manager*) se descarga como un archivo `.apk` desde la sección **Releases** de este repositorio. Funciona en móviles Android con procesador **arm64** (prácticamente todos los modelos de los últimos años).

## Instalar

1. Abre la sección **Releases** del repositorio (a la derecha de la página principal, o la pestaña de versiones) y entra en la **última versión**.
2. En *Assets*, descarga `task-manager-X.Y.Z-arm64-v8a.apk` (y, si quieres comprobarlo, `task-manager-X.Y.Z-arm64-v8a.apk.sha256`).
3. Abre el archivo descargado. Android te pedirá permiso para instalar aplicaciones **desde orígenes desconocidos** (o «otras fuentes») para el navegador o el gestor de archivos que estés usando: permítelo solo para esa aplicación y, si quieres, desactívalo después.
4. Pulsa **Instalar** y abre la app.

La app crea sola una sesión anónima la primera vez; no hace falta registrarse. Las tareas se guardan en tu sesión y puedes crear una cuenta (usuario y contraseña) dentro de la app para no perderlas al cambiar de teléfono.

## Comprobar que el archivo es el auténtico (opcional)

Cada versión incluye la suma **SHA-256** del APK. Calcúlala en tu ordenador y compárala con el contenido del archivo `.sha256`:

```bash
sha256sum task-manager-X.Y.Z-arm64-v8a.apk          # Linux / macOS: shasum -a 256 ...
```

```powershell
Get-FileHash .\task-manager-X.Y.Z-arm64-v8a.apk -Algorithm SHA256     # Windows
```

Si los valores no coinciden, no instales el archivo y descárgalo de nuevo.

## Actualizar

Descarga el APK de la versión nueva e instálalo **encima** de la anterior: se conservan tus datos y tu sesión. Solo funciona si ambas versiones están firmadas con la misma clave, que es el caso de todas las Releases oficiales.

Si Android dice que la app **no se puede instalar** sobre la existente, es que la anterior se instaló con otra firma (por ejemplo, una compilación de desarrollo): desinstálala primero. Ten en cuenta que al desinstalar se borran los datos locales del móvil.

## Problemas habituales

- **«No se puede instalar» / «App no instalada»**: comprueba que tu móvil es arm64 y que hay espacio libre; si ya tenías una versión con otra firma, desinstálala.
- **No me deja abrir el archivo**: permite la instalación desde orígenes desconocidos para esa aplicación (paso 3).
- **Pantalla de «servicio no disponible» al abrirla**: sin conexión o con el servicio saturado; vuelve a intentarlo en unos minutos.
