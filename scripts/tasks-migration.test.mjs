import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'supabase', 'migrations');
const file = readdirSync(dir).find((f) => /_tasks\.sql$/.test(f));
const sql = file ? readFileSync(resolve(dir, file), 'utf8') : '';
// Sin comentarios: lo que cuenta es el SQL que se ejecuta.
const code = sql.replace(/--.*$/gm, '');

test('US-005-05 existe la migración de la tabla tasks', () => {
  assert.ok(file, 'falta supabase/migrations/<marca>_tasks.sql');
  assert.match(code, /create\s+table\s+public\.tasks/i);
});

test('US-005-05 la tabla lleva user_id con auth.uid() por defecto y borrado en cascada', () => {
  assert.match(code, /user_id\s+uuid\s+not\s+null\s+default\s+auth\.uid\(\)/i);
  assert.match(code, /references\s+auth\.users\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/i);
});

test('US-005-05 la RLS está activada en la misma migración', () => {
  assert.match(code, /alter\s+table\s+public\.tasks\s+enable\s+row\s+level\s+security/i);
});

test('US-005-05 hay una política por operación, solo para el propio usuario', () => {
  for (const op of ['select', 'insert', 'update', 'delete']) {
    assert.match(
      code,
      new RegExp(`create\\s+policy\\s+\\w+\\s+on\\s+public\\.tasks\\s+for\\s+${op}\\s+to\\s+authenticated`, 'i'),
      `falta la política de ${op}`
    );
  }
  const policies = code.match(/create\s+policy[\s\S]*?;/gi) ?? [];
  assert.equal(policies.length, 4);
  for (const policy of policies) {
    assert.match(policy, /user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i, policy);
    assert.doesNotMatch(policy, /\btrue\b/i, 'una política abierta a todos');
  }
});

test('US-005-01 el título tiene entre 1 y 120 caracteres y sin espacios en los extremos', () => {
  assert.match(code, /char_length\s*\(\s*title\s*\)\s+between\s+1\s+and\s+120/i);
  assert.match(code, /title\s*=\s*btrim\s*\(\s*title\s*\)/i);
});

test('US-005-01 la hora solo se admite con fecha', () => {
  assert.match(code, /due_time\s+is\s+null\s+or\s+due_date\s+is\s+not\s+null/i);
});

test('US-005-05 se retira el acceso al rol anon', () => {
  assert.match(code, /revoke\s+all\s+on\s+public\.tasks\s+from\s+anon/i);
});

test('US-005-05 la migración no inserta datos ni es destructiva', () => {
  assert.doesNotMatch(code, /\binsert\s+into\b/i);
  assert.doesNotMatch(code, /\b(drop|truncate)\b/i);
});

test('US-005-05 documenta el rollback', () => {
  assert.match(sql, /rollback/i);
});
