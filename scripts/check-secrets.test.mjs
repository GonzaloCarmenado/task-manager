import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(import.meta.dirname, 'check-secrets.mjs');

/** Crea un repo git temporal con los ficheros dados y ejecuta el escáner dentro. */
function scan(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-secrets-'));
  try {
    spawnSync('git', ['init', '-q'], { cwd: dir });
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), content);
    }
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: dir, encoding: 'utf8' });
    return { code: r.status, out: r.stdout, err: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('un repo sin nada sensible pasa', () => {
  assert.equal(scan({ 'a.md': 'Hola mundo\nVisita http://localhost:4200\n' }).code, 0);
});

test('detecta un token de Supabase', () => {
  const r = scan({ 'a.ts': 'const t = "sbp_0123456789abcdef0123456789abcdef";\n' });
  assert.equal(r.code, 1);
  assert.match(r.err, /token de acceso de Supabase/);
});

test('detecta rutas absolutas de Windows del usuario', () => {
  for (const ruta of [
    'ANDROID_HOME=E:\\Herramientas\\Sdk',
    'export JAVA_HOME="C:/Program Files/Java/jdk-NN"',
    'ver C:\\Users\\alguien\\proyecto',
    'ruta /c/Users/alguien/x',
    'en /d/Git/otro-proyecto',
  ]) {
    const r = scan({ 'doc.md': ruta + '\n' });
    assert.equal(r.code, 1, ruta);
    assert.match(r.err, /ruta local/, ruta);
  }
});

test('detecta rutas home de macOS/Linux', () => {
  assert.equal(scan({ 'doc.md': 'cd /home/pepe/proyecto\n' }).code, 1);
  assert.equal(scan({ 'doc.md': 'cd /Users/pepe/proyecto\n' }).code, 1);
});

test('detecta correos personales pero no los genéricos', () => {
  const r = scan({ 'doc.md': 'contacto: alguien.real@gmail.com\n' });
  assert.equal(r.code, 1);
  assert.match(r.err, /correo/);
  for (const ok of [
    'admin@email.com',
    'a@example.com',
    '1234+user@users.noreply.github.com',
    'noreply@anthropic.com',
    'icono icon@2x.png',
  ]) {
    assert.equal(scan({ 'doc.md': ok + '\n' }).code, 0, ok);
  }
});

test('no confunde rutas relativas, URLs ni placeholders con rutas locales', () => {
  const ok = [
    'src/app/core/services/supabase.ts',
    'https://angular.dev/guide',
    'ANDROID_HOME="<ruta del Android SDK>"',
    '$ANDROID_HOME/ndk/<versión>',
    "const re = /a:\\s+b/;",
  ];
  for (const linea of ok) assert.equal(scan({ 'doc.md': linea + '\n' }).code, 0, linea);
});

test('el marcador secrets:allow permite una línea concreta', () => {
  const r = scan({ 'doc.md': 'ruta C:\\Users\\ejemplo\\x // secrets:allow\n' });
  assert.equal(r.code, 0);
});

test('detecta ficheros sensibles por nombre', () => {
  assert.equal(scan({ '.env': 'A=1\n' }).code, 1);
  assert.equal(scan({ 'src/environments/environment.ts': 'x\n' }).code, 1);
  assert.equal(scan({ 'src/environments/environment.example.ts': 'x\n' }).code, 0);
});
