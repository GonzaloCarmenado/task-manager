// Spec 013: environment.ts se genera en el flujo de publicación desde secretos, con validación y sin imprimir valores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEnvironment, writeEnvironment } from './write-environment.mjs';

const script = join(import.meta.dirname, 'write-environment.mjs');

// Valores de prueba construidos al vuelo: ni parecen ni son credenciales reales (el escáner de secretos no los ve).
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const jwt = (role) => [b64({ alg: 'HS256', typ: 'JWT' }), b64({ role, iss: 'prueba' }), 'firma-de-prueba'].join('.');
const PUBLISHABLE = ['sb', 'publishable', 'prueba123'].join('_');
const SECRET = ['sb', 'secret', 'prueba123'].join('_');
const URL_OK = 'https://abcdefghij.supabase.co';
const ok = (over = {}) => ({ SUPABASE_URL: URL_OK, SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE, ...over });

function expectError(env, variable, forbidden = []) {
  let error;
  try {
    buildEnvironment(env);
  } catch (e) {
    error = e;
  }
  assert.ok(error, `debería fallar (${variable})`);
  assert.match(error.message, new RegExp(variable));
  for (const value of forbidden) {
    assert.ok(!error.message.includes(value), `el error no debe contener el valor «${value.slice(0, 6)}…»`);
  }
}

test('US-013-03 genera environment.ts con supabaseUrl y supabaseKey, como el ejemplo', () => {
  const text = buildEnvironment(ok());
  assert.match(text, /export const environment = \{/);
  assert.match(text, new RegExp(`supabaseUrl: '${URL_OK}',`));
  assert.match(text, new RegExp(`supabaseKey: '${PUBLISHABLE}',`));
});

test('US-013-03 el fichero generado lo entienden los scripts de verificación (mismo formato)', () => {
  const text = buildEnvironment(ok());
  assert.equal(text.match(/supabaseUrl:\s*'([^']*)'/)?.[1], URL_OK);
  assert.equal(text.match(/supabaseKey:\s*'([^']*)'/)?.[1], PUBLISHABLE);
});

test('US-013-03 quita la barra final de la URL', () => {
  assert.match(buildEnvironment(ok({ SUPABASE_URL: `${URL_OK}/` })), new RegExp(`supabaseUrl: '${URL_OK}',`));
});

test('US-013-03 acepta una clave publishable y un JWT con rol anon', () => {
  assert.doesNotThrow(() => buildEnvironment(ok({ SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE })));
  assert.doesNotThrow(() => buildEnvironment(ok({ SUPABASE_PUBLISHABLE_KEY: jwt('anon') })));
});

test('US-013-03 falla si falta la URL o la clave, o si están vacías o en blanco', () => {
  expectError({ SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE }, 'SUPABASE_URL');
  expectError(ok({ SUPABASE_URL: '' }), 'SUPABASE_URL');
  expectError(ok({ SUPABASE_URL: '   ' }), 'SUPABASE_URL');
  expectError({ SUPABASE_URL: URL_OK }, 'SUPABASE_PUBLISHABLE_KEY');
  expectError(ok({ SUPABASE_PUBLISHABLE_KEY: '' }), 'SUPABASE_PUBLISHABLE_KEY');
});

test('US-013-03 falla si la URL no es https o no es una URL', () => {
  expectError(ok({ SUPABASE_URL: 'http://abcdefghij.supabase.co' }), 'SUPABASE_URL', ['http://abcdefghij.supabase.co']);
  expectError(ok({ SUPABASE_URL: 'abcdefghij.supabase.co' }), 'SUPABASE_URL');
  expectError(ok({ SUPABASE_URL: 'https://' }), 'SUPABASE_URL');
  // La URL con credenciales se arma al vuelo (un literal «usuario:clave@dominio» parece un correo al escáner de secretos).
  const credentials = ['usuario', 'clave'].join(':');
  expectError(ok({ SUPABASE_URL: `https://${credentials}${String.fromCharCode(64)}abcdefghij.supabase.co` }), 'SUPABASE_URL', [credentials]);
});

test('US-013-03 falla con la clave secreta (sb_secret_) y nunca la imprime', () => {
  expectError(ok({ SUPABASE_PUBLISHABLE_KEY: SECRET }), 'SUPABASE_PUBLISHABLE_KEY', [SECRET]);
});

test('US-013-03 falla con un JWT de rol service_role y nunca lo imprime', () => {
  const key = jwt('service_role');
  expectError(ok({ SUPABASE_PUBLISHABLE_KEY: key }), 'SUPABASE_PUBLISHABLE_KEY', [key]);
});

test('US-013-03 falla con un JWT de otro rol o ilegible, y con algo que no parece una clave', () => {
  for (const key of [jwt('authenticated'), 'aaa.bbb.ccc', 'clave-cualquiera']) {
    expectError(ok({ SUPABASE_PUBLISHABLE_KEY: key }), 'SUPABASE_PUBLISHABLE_KEY', [key]);
  }
});

test('US-013-03 rechaza valores con comillas, barras o saltos de línea (no se cuelan en el TypeScript)', () => {
  expectError(ok({ SUPABASE_URL: `https://a.supabase.co/'; process.exit()//` }), 'SUPABASE_URL');
  expectError(ok({ SUPABASE_PUBLISHABLE_KEY: `${PUBLISHABLE}\nmalo` }), 'SUPABASE_PUBLISHABLE_KEY');
  expectError(ok({ SUPABASE_PUBLISHABLE_KEY: `${PUBLISHABLE}\\` }), 'SUPABASE_PUBLISHABLE_KEY');
});

test('US-013-03 writeEnvironment escribe el fichero y, si falla, no deja nada escrito', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-environment-'));
  try {
    const good = join(dir, 'ok', 'environment.ts');
    writeEnvironment(ok(), good);
    assert.match(readFileSync(good, 'utf8'), /supabaseKey/);

    const bad = join(dir, 'bad', 'environment.ts');
    assert.throws(() => writeEnvironment(ok({ SUPABASE_PUBLISHABLE_KEY: SECRET }), bad));
    assert.equal(existsSync(bad), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function run(env, target) {
  try {
    const stdout = execFileSync('node', [script, '--target', target], {
      env: { PATH: process.env.PATH, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return { code: error.status, stdout: String(error.stdout), stderr: String(error.stderr) };
  }
}

test('US-013-03 el CLI genera el fichero y no imprime ningún valor', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-environment-'));
  try {
    const target = join(dir, 'environment.ts');
    const r = run(ok(), target);
    assert.equal(r.code, 0);
    assert.ok(existsSync(target));
    for (const value of [URL_OK, PUBLISHABLE]) {
      assert.ok(!r.stdout.includes(value) && !r.stderr.includes(value), 'no debe imprimir valores');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('US-013-03 el CLI falla al principio nombrando la variable y sin imprimir el valor', () => {
  const dir = mkdtempSync(join(tmpdir(), 'write-environment-'));
  try {
    const target = join(dir, 'environment.ts');
    const r = run(ok({ SUPABASE_PUBLISHABLE_KEY: SECRET }), target);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /SUPABASE_PUBLISHABLE_KEY/);
    assert.ok(!r.stdout.includes(SECRET) && !r.stderr.includes(SECRET));
    assert.equal(existsSync(target), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
