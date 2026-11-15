// Spec 012: la migración de las tareas repetitivas (series, ocurrencias, índice único y disparador de guarda).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'supabase', 'migrations');
const file = readdirSync(dir).find((f) => /_task_series\.sql$/.test(f));
const sql = file ? readFileSync(resolve(dir, file), 'utf8') : '';
const code = sql.replace(/--.*$/gm, '');

test('US-012-01 existe la migración de las series', () => {
  assert.ok(file, 'falta supabase/migrations/<marca>_task_series.sql');
  assert.match(code, /create\s+table\s+public\.task_series/i);
});

test('US-012-01 task_series tiene RLS por usuario en las cuatro operaciones y sin acceso anónimo', () => {
  assert.match(code, /alter\s+table\s+public\.task_series\s+enable\s+row\s+level\s+security/i);
  for (const op of ['select', 'insert', 'update', 'delete']) {
    assert.match(code, new RegExp(`create\\s+policy\\s+"task_series_${op}"\\s+on\\s+public\\.task_series\\s+for\\s+${op}\\s+to\\s+authenticated`, 'i'));
  }
  assert.match(code, /user_id\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  assert.match(code, /revoke\s+all\s+on\s+public\.task_series\s+from\s+anon/i);
  assert.match(code, /user_id\s+uuid\s+not\s+null\s+default\s+auth\.uid\(\)\s+references\s+auth\.users\s*\(id\)\s+on\s+delete\s+cascade/i);
});

test('US-012-01 las restricciones impiden reglas incoherentes', () => {
  assert.match(code, /kind\s+text\s+not\s+null\s+check\s*\(kind\s+in\s*\('daily',\s*'weekly',\s*'monthly'\)\)/i);
  assert.match(code, /interval_n[^,]*between\s+1\s+and\s+30/i);
  assert.match(code, /month_day[^,]*between\s+1\s+and\s+31/i);
  assert.match(code, /kind\s*=\s*'weekly'\s+and\s+cardinality\(weekdays\)\s+between\s+1\s+and\s+7/i);
  assert.match(code, /weekdays\s*<@\s*array\[1,2,3,4,5,6,7\]/i);
  assert.match(code, /kind\s*=\s*'monthly'\s+and\s+month_day\s+is\s+not\s+null\s+and\s+interval_n\s*=\s*1/i);
  assert.match(code, /until_date\s+is\s+null\s+or\s+until_date\s*>=\s*start_date/i);
  assert.match(code, /char_length\(title\)\s+between\s+1\s+and\s+120/i);
});

test('US-012-01 las ocurrencias enlazan con la serie y exigen fecha', () => {
  assert.match(code, /add\s+column\s+series_id\s+uuid\s+references\s+public\.task_series\s*\(id\)\s+on\s+delete\s+set\s+null/i);
  assert.match(code, /add\s+column\s+series_date\s+date/i);
  assert.match(code, /series_id\s+is\s+null\s+or\s+series_date\s+is\s+not\s+null/i);
  assert.match(code, /series_id\s+is\s+null\s+or\s+due_date\s+is\s+not\s+null/i);
});

test('US-012-02 como mucho una ocurrencia pendiente por serie (índice único parcial)', () => {
  assert.match(
    code,
    /create\s+unique\s+index\s+tasks_series_one_pending\s+on\s+public\.tasks\s*\(series_id\)\s+where\s+series_id\s+is\s+not\s+null\s+and\s+completed_at\s+is\s+null/i
  );
});

test('US-012-02 el disparador rechaza completar una ocurrencia futura', () => {
  assert.match(code, /create\s+function\s+public\.tasks_series_guard\s*\(\s*\)\s+returns\s+trigger/i);
  assert.match(code, /create\s+trigger\s+tasks_series_guard\s+before\s+update\s+on\s+public\.tasks/i);
  assert.match(code, /new\.due_date\s*>\s*new\.completed_day/i);
  assert.match(code, /raise\s+exception\s+'future occurrence'\s+using\s+errcode\s*=\s*'P0001'/i);
});

test('US-012-02 al desmarcar se borra la pendiente generada después', () => {
  assert.match(
    code,
    /delete\s+from\s+public\.tasks\s+where\s+series_id\s*=\s*new\.series_id\s+and\s+completed_at\s+is\s+null\s+and\s+id\s*<>\s*new\.id/i
  );
});

test('US-012-02 el disparador respeta la RLS del usuario (sin security definer) y fija el search_path', () => {
  const fn = code.slice(code.search(/create\s+function\s+public\.tasks_series_guard/i));
  assert.doesNotMatch(fn, /security\s+definer/i);
  assert.match(fn, /set\s+search_path\s*=\s*public/i);
});

test('US-012-01 no destruye datos y documenta el rollback', () => {
  assert.doesNotMatch(code, /truncate/i);
  assert.doesNotMatch(code, /drop\s+table/i);
  assert.match(sql, /--\s+drop\s+table\s+public\.task_series/i);
  assert.match(sql, /--\s+drop\s+trigger\s+tasks_series_guard/i);
  assert.match(sql, /--\s+drop\s+index\s+public\.tasks_series_one_pending/i);
});

test('US-012-01 sin datos personales ni semillas', () => {
  assert.doesNotMatch(code, /insert\s+into/i);
  assert.doesNotMatch(sql, /@[a-z0-9-]+\.(com|es|org)/i);
});
