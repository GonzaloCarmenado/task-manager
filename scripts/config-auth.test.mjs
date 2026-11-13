import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const toml = readFileSync(resolve(import.meta.dirname, '..', 'supabase', 'config.toml'), 'utf8');

/** Valor (sin comentario) de la primera clave `key = valor` del fichero. */
function value(key) {
  const match = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*([^#\\r\\n]+?)\\s*(#.*)?$`, 'm'));
  return match ? match[1] : null;
}

test('US-003-05 config.toml habilita el inicio de sesión anónimo', () => {
  assert.equal(value('enable_anonymous_sign_ins'), 'true');
});

test('US-003-05 anonymous_users está presente y entre 1 y 30 por hora e IP', () => {
  const raw = value('anonymous_users');
  assert.notEqual(raw, null, 'falta anonymous_users');
  const limit = Number(raw);
  assert.ok(Number.isInteger(limit), `no es un entero: ${raw}`);
  assert.ok(limit >= 1 && limit <= 30, `fuera de rango: ${limit}`);
});

test('US-003-05 el registro general sigue siendo el de por defecto (no se abre por error)', () => {
  assert.equal(value('enable_signup'), 'true');
});
