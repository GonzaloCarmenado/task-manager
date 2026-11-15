import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tauri = resolve(import.meta.dirname, '..', 'src-tauri');
const capsDir = resolve(tauri, 'capabilities');
const PLUGIN_VERSION = '0.3.0-rc.3';

const capabilities = readdirSync(capsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, json: JSON.parse(readFileSync(resolve(capsDir, f), 'utf8')) }));

const permissionsOf = ({ json }) =>
  json.permissions.map((p) => (typeof p === 'string' ? p : p.identifier));

test('US-004-04 solo mobile.json concede la biometría, y solo permisos de estado y autenticación', () => {
  const withBiometry = capabilities.filter((c) =>
    permissionsOf(c).some((p) => p.startsWith('biometry:'))
  );
  assert.deepEqual(
    withBiometry.map((c) => c.file),
    ['mobile.json']
  );
  assert.deepEqual(permissionsOf(withBiometry[0]).filter((p) => p.startsWith('biometry:')), [
    'biometry:default',
  ]);
});

test('US-004-04 mobile.json se limita a Android y a la ventana principal', () => {
  const mobile = capabilities.find((c) => c.file === 'mobile.json');
  assert.ok(mobile, 'falta capabilities/mobile.json');
  assert.deepEqual(mobile.json.platforms, ['android']);
  assert.deepEqual(mobile.json.windows, ['main']);
});

test('US-004-04 ninguna capacidad concede acceso al almacenamiento del plugin ni a ficheros', () => {
  for (const c of capabilities) {
    for (const p of permissionsOf(c)) {
      assert.doesNotMatch(p, /^biometry:allow-(get|set|has|remove)-data$/, `${c.file}: ${p}`);
      assert.doesNotMatch(p, /^fs:/, `${c.file}: ${p}`);
    }
  }
});

test('US-004-04 default.json no concede ningún permiso de biometría', () => {
  const def = capabilities.find((c) => c.file === 'default.json');
  assert.ok(def, 'falta capabilities/default.json');
  assert.equal(permissionsOf(def).filter((p) => p.startsWith('biometry')).length, 0);
});

test('US-004-04 Cargo.toml fija la versión exacta del plugin y solo bajo Android', () => {
  const cargo = readFileSync(resolve(tauri, 'Cargo.toml'), 'utf8');
  assert.match(cargo, /^\[target\.'cfg\(target_os = "android"\)'\.dependencies\]/m);
  const section = cargo.split(/^\[target\.'cfg\(target_os = "android"\)'\.dependencies\]/m)[1];
  assert.ok(section, 'falta la sección de dependencias solo de Android');
  assert.match(section, new RegExp(`tauri-plugin-biometry\\s*=\\s*"=${PLUGIN_VERSION}"`));
  const general = cargo.split(/^\[target\./m)[0];
  assert.doesNotMatch(general, /tauri-plugin-biometry/);
});

test('US-004-04 lib.rs registra el plugin solo en Android', () => {
  const lib = readFileSync(resolve(tauri, 'src', 'lib.rs'), 'utf8');
  assert.match(lib, /#\[cfg\(target_os = "android"\)\][\s\S]*tauri_plugin_biometry::init\(\)/);
});

test('US-004-04 el paquete de JavaScript del plugin está fijado a la misma versión exacta', () => {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@choochmeque/tauri-plugin-biometry-api'], PLUGIN_VERSION);
});

test('US-004-04 los permisos solo están en capabilities/ y existe el directorio', () => {
  assert.ok(existsSync(capsDir));
});

// ---- Spec 006: notificaciones y plugin local de ajustes ----
const NOTIFICATION_VERSION = '2.8.1';

test('US-006-02 solo mobile.json concede las notificaciones y los ajustes del sistema', () => {
  for (const prefix of ['notification:', 'app-settings:']) {
    const files = capabilities
      .filter((c) => permissionsOf(c).some((p) => p.startsWith(prefix)))
      .map((c) => c.file);
    assert.deepEqual(files, ['mobile.json'], prefix);
  }
  const mobile = capabilities.find((c) => c.file === 'mobile.json');
  assert.ok(permissionsOf(mobile).includes('notification:default'));
  assert.ok(permissionsOf(mobile).includes('app-settings:default'));
});

test('US-006-02 default.json no concede notificaciones ni ajustes', () => {
  const def = capabilities.find((c) => c.file === 'default.json');
  assert.equal(permissionsOf(def).filter((p) => /^(notification|app-settings):/.test(p)).length, 0);
});

test('US-006-01 Cargo.toml fija la versión exacta del plugin de notificaciones y el plugin local, solo bajo Android', () => {
  const cargo = readFileSync(resolve(tauri, 'Cargo.toml'), 'utf8');
  const general = cargo.split(/^\[target\./m)[0];
  assert.doesNotMatch(general, /tauri-plugin-notification|tauri-plugin-app-settings/);
  const android = cargo.split(/^\[target\.'cfg\(target_os = "android"\)'\.dependencies\]/m)[1];
  assert.ok(android, 'falta la sección solo de Android');
  assert.match(
    android,
    new RegExp(`tauri-plugin-notification\\s*=\\s*"=${NOTIFICATION_VERSION.replaceAll('.', '\\.')}"`)
  );
  assert.match(android, /tauri-plugin-app-settings\s*=\s*\{\s*path\s*=\s*"plugins\/app-settings"\s*\}/);
});

test('US-006-01 lib.rs registra ambos plugins solo en Android', () => {
  const lib = readFileSync(resolve(tauri, 'src', 'lib.rs'), 'utf8');
  assert.match(lib, /#\[cfg\(target_os = "android"\)\][\s\S]*tauri_plugin_notification::init\(\)/);
  assert.match(lib, /#\[cfg\(target_os = "android"\)\][\s\S]*tauri_plugin_app_settings::init\(\)/);
});

test('US-006-01 el paquete de JavaScript del plugin de notificaciones está fijado a la misma versión exacta', () => {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@tauri-apps/plugin-notification'], NOTIFICATION_VERSION);
});

test('US-006-02 el plugin local declara el permiso de alarmas exactas y expone solo los cinco comandos previstos', () => {
  const dir = resolve(tauri, 'plugins', 'app-settings');
  const manifest = readFileSync(resolve(dir, 'android', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /android\.permission\.SCHEDULE_EXACT_ALARM/);
  const build = readFileSync(resolve(dir, 'build.rs'), 'utf8');
  const commands = [...build.matchAll(/"([a-z_]+)",/g)].map((m) => m[1]);
  assert.deepEqual(commands.sort(), [
    'can_schedule_exact_alarms',
    'launch_notification_id',
    'open_exact_alarm_settings',
    'open_notification_settings',
    'schedule_alarms',
  ]);
  assert.doesNotMatch(build, /[a-z_]*(read|write|delete|file|storage)[a-z_]*/i);
});

test('US-006-01 el plugin local programa y restaura las alarmas él mismo: receptores de aviso y de reinicio', () => {
  const dir = resolve(tauri, 'plugins', 'app-settings', 'android', 'src', 'main');
  const manifest = readFileSync(resolve(dir, 'AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /android\.permission\.RECEIVE_BOOT_COMPLETED/);
  assert.match(manifest, /<receiver[^>]*AlarmReceiver/);
  const boot = manifest.match(/<receiver[^>]*BootReceiver[\s\S]*?<\/receiver>/);
  assert.ok(boot, 'falta el receptor de reinicio');
  assert.match(boot[0], /android\.intent\.action\.BOOT_COMPLETED/);
  // el aviso no puede ser invocado desde otras apps
  assert.match(manifest.match(/<receiver[^>]*AlarmReceiver[^>]*>/)[0], /android:exported="false"/);
});
