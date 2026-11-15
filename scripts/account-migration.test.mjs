import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'supabase', 'migrations');
const file = readdirSync(dir).find((f) => /_account\.sql$/.test(f));
const sql = file ? readFileSync(resolve(dir, file), 'utf8') : '';
const code = sql.replace(/--.*$/gm, '');

test('US-011-06 existe la migración de la cuenta', () => {
  assert.ok(file, 'falta supabase/migrations/<marca>_account.sql');
  assert.match(code, /create\s+(or\s+replace\s+)?function\s+public\.delete_my_account\s*\(\s*\)/i);
});

test('US-011-06 la función es security definer con search_path fijo', () => {
  assert.match(code, /security\s+definer/i);
  assert.match(code, /set\s+search_path\s*=\s*public\s*,\s*auth/i);
});

test('US-011-06 rechaza sin sesión y a las sesiones anónimas', () => {
  assert.match(code, /auth\.uid\(\)/i);
  assert.match(code, /28000/);
  assert.match(code, /is_anonymous/i);
  assert.match(code, /42501/);
});

test('US-011-06 borra solo al propio usuario de auth.users', () => {
  assert.match(code, /delete\s+from\s+auth\.users\s+where\s+id\s*=\s*\w+/i);
  assert.doesNotMatch(code, /delete\s+from\s+auth\.users\s*;/i);
});

test('US-011-06 solo la puede ejecutar un usuario autenticado', () => {
  assert.match(code, /revoke\s+all\s+on\s+function\s+public\.delete_my_account\(\)\s+from\s+public\s*,\s*anon/i);
  assert.match(code, /grant\s+execute\s+on\s+function\s+public\.delete_my_account\(\)\s+to\s+authenticated/i);
});

test('US-011-06 documenta el rollback y no lleva datos personales', () => {
  assert.match(sql, /drop\s+function\s+public\.delete_my_account\(\)/i);
  assert.doesNotMatch(sql, /@[a-z0-9-]+\.(com|es|org)/i);
});
