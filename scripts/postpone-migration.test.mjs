import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'supabase', 'migrations');
const file = readdirSync(dir).find((f) => /_tasks_postponed_count\.sql$/.test(f));
const sql = file ? readFileSync(resolve(dir, file), 'utf8') : '';
// Sin comentarios: lo que cuenta es el SQL que se ejecuta.
const code = sql.replace(/--.*$/gm, '');

test('US-007-02 existe la migración del contador de pospuestas', () => {
  assert.ok(file, 'falta supabase/migrations/<marca>_tasks_postponed_count.sql');
  assert.match(code, /alter\s+table\s+public\.tasks/i);
});

test('US-007-02 la columna es entera, no nula y vale 0 por defecto', () => {
  assert.match(code, /add\s+column\s+postponed_count\s+integer\s+not\s+null\s+default\s+0/i);
});

test('US-007-02 el contador no admite valores negativos', () => {
  assert.match(code, /check\s*\(\s*postponed_count\s*>=\s*0\s*\)/i);
});

test('US-007-02 no inserta datos, no borra y no cambia la RLS', () => {
  assert.doesNotMatch(code, /\binsert\b/i);
  assert.doesNotMatch(code, /\bdrop\b/i);
  assert.doesNotMatch(code, /\btruncate\b/i);
  assert.doesNotMatch(code, /\b(policy|row\s+level\s+security|grant|revoke)\b/i);
});

test('US-007-02 documenta el rollback', () => {
  assert.match(sql, /rollback/i);
});
