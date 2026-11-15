// Spec 013: los documentos de instalación y de publicación existen, explican lo necesario y no llevan datos sensibles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const docs = join(import.meta.dirname, '..', 'docs');
const read = (name) => (existsSync(join(docs, name)) ? readFileSync(join(docs, name), 'utf8') : '');
const install = read('instalacion.md');
const release = read('release.md');
const SECRETS = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
];

test('US-013-06 existen docs/instalacion.md y docs/release.md', () => {
  assert.ok(existsSync(join(docs, 'instalacion.md')), 'falta docs/instalacion.md');
  assert.ok(existsSync(join(docs, 'release.md')), 'falta docs/release.md');
});

test('US-013-06 instalacion.md explica descargar, permitir la instalación, comprobar el SHA-256 y actualizar', () => {
  assert.match(install, /Releases/);
  assert.match(install, /\.apk/);
  assert.match(install, /arm64/i);
  assert.match(install, /desconocid|otras fuentes|origen desconocido/i);
  assert.match(install, /SHA-256|sha256/i);
  assert.match(install, /sha256sum|Get-FileHash|certutil/i);
  assert.match(install, /actualiz/i);
  assert.match(install, /datos/i);
});

test('US-013-06 release.md nombra los seis secretos y para qué sirve cada uno', () => {
  for (const name of SECRETS) assert.ok(release.includes(name), `release.md no nombra ${name}`);
});

test('US-013-06 release.md explica el keystore, la copia de seguridad y qué pasa si se pierde la clave', () => {
  assert.match(release, /keytool/);
  assert.match(release, /copia de seguridad/i);
  assert.match(release, /pierd/i);
  assert.match(release, /gh secret set/);
});

test('US-013-06 release.md explica cómo publicar: versión en los tres ficheros, main y etiqueta', () => {
  assert.match(release, /package\.json/);
  assert.match(release, /tauri\.conf\.json/);
  assert.match(release, /Cargo\.toml/);
  assert.match(release, /git tag/);
  assert.match(release, /main/);
  assert.match(release, /workflow_dispatch|ejecución manual/i);
  assert.match(release, /pre-?release|versión previa/i);
});

test('US-013-06 release.md avisa de que todos comparten el mismo proyecto de Supabase y de sus límites', () => {
  assert.match(release, /Supabase/);
  assert.match(release, /compart/i);
  assert.match(release, /anónim/i);
  assert.match(release, /límite|cuota/i);
});

test('US-013-06 los documentos no contienen valores de secretos, rutas locales, correos ni identificadores', () => {
  for (const [name, text] of [['instalacion.md', install], ['release.md', release]]) {
    assert.doesNotMatch(text, /[A-Za-z]:\\|[A-Za-z]:\//, `${name}: ruta que empieza por una unidad de disco`);
    assert.doesNotMatch(text, /\/(Users|home)\/[^\s/]+/, `${name}: carpeta personal del sistema`);
    assert.doesNotMatch(text, /[\w.+-]+@[\w-]+\.(com|es|org|net)\b/i, `${name}: correo`);
    assert.doesNotMatch(text, /sb_(publishable|secret)_[A-Za-z0-9]{6,}/, `${name}: clave de Supabase`);
    assert.doesNotMatch(text, /eyJ[A-Za-z0-9_-]{10,}/, `${name}: token`);
    assert.doesNotMatch(text, /sbp_[A-Za-z0-9]{10,}/, `${name}: token de acceso`);
    assert.doesNotMatch(text, /https:\/\/[a-z0-9]{20}\.supabase\.co/, `${name}: URL de un proyecto de Supabase`);
  }
});

test('US-013-06 los comandos de ejemplo usan marcadores, no contraseñas', () => {
  assert.match(release, /<[^>\n]+>/, 'debe usar marcadores como <alias>');
  assert.doesNotMatch(release, /-storepass\s+(?!<)\S+/, 'una contraseña literal en -storepass');
  assert.doesNotMatch(release, /-keypass\s+(?!<)\S+/, 'una contraseña literal en -keypass');
});
