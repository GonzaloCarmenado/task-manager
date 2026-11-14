import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '..', 'supabase', 'migrations');
const file = readdirSync(dir).find((f) => /_progress\.sql$/.test(f));
const sql = file ? readFileSync(resolve(dir, file), 'utf8') : '';
// Sin comentarios: lo que cuenta es el SQL que se ejecuta.
const code = sql.replace(/--.*$/gm, '');

test('US-008-01 existe la migración del progreso', () => {
  assert.ok(file, 'falta supabase/migrations/<marca>_progress.sql');
  assert.match(code, /alter\s+table\s+public\.tasks/i);
});

test('US-008-01 tasks guarda el día local, el XP concedido y el día del XP', () => {
  assert.match(code, /add\s+column\s+completed_day\s+date/i);
  assert.match(code, /add\s+column\s+xp_awarded\s+smallint\s+not\s+null\s+default\s+0/i);
  assert.match(code, /add\s+column\s+xp_day\s+date/i);
  assert.match(code, /check\s*\(\s*\(completed_at\s+is\s+null\)\s*=\s*\(completed_day\s+is\s+null\)\s*\)/i);
  assert.match(code, /check\s*\(\s*xp_awarded\s+between\s+0\s+and\s+10\s*\)/i);
});

test('US-008-01 existen player_stats y xp_events con user_id y borrado en cascada', () => {
  assert.match(code, /create\s+table\s+public\.player_stats/i);
  assert.match(code, /create\s+table\s+public\.xp_events/i);
  const cascades = code.match(/references\s+auth\.users\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/gi) ?? [];
  assert.ok(cascades.length >= 2, 'ambas tablas deben borrarse con el usuario');
  assert.match(code, /total_xp\s+integer\s+not\s+null\s+default\s+0\s+check\s*\(\s*total_xp\s*>=\s*0\s*\)/i);
});

test('US-008-01 el movimiento de XP no tiene clave foránea a tasks (sobrevive al borrado)', () => {
  const events = code.match(/create\s+table\s+public\.xp_events[\s\S]*?\);/i)?.[0] ?? '';
  assert.doesNotMatch(events, /references\s+public\.tasks/i);
});

test('US-008-03 la RLS está activada en las dos tablas nuevas en la misma migración', () => {
  assert.match(code, /alter\s+table\s+public\.player_stats\s+enable\s+row\s+level\s+security/i);
  assert.match(code, /alter\s+table\s+public\.xp_events\s+enable\s+row\s+level\s+security/i);
});

test('US-008-03 solo hay políticas de lectura y solo del propio usuario', () => {
  const policies = code.match(/create\s+policy[\s\S]*?;/gi) ?? [];
  assert.equal(policies.length, 2);
  for (const p of policies) {
    assert.match(p, /for\s+select\s+to\s+authenticated/i);
    assert.match(p, /user_id\s*=\s*\(\s*select\s+auth\.uid\(\)\s*\)/i);
  }
});

test('US-008-03 el cliente solo puede leer las tablas nuevas (sin escritura)', () => {
  assert.match(code, /revoke\s+all\s+on\s+public\.player_stats\s*,\s*public\.xp_events\s+from\s+anon\s*,\s*authenticated/i);
  assert.match(code, /grant\s+select\s+on\s+public\.player_stats\s*,\s*public\.xp_events\s+to\s+authenticated/i);
  assert.doesNotMatch(code, /grant\s+(insert|update|delete|all)/i);
});

test('US-008-01 hay disparadores before (insert o update) y after (update) sobre tasks', () => {
  assert.match(code, /create\s+trigger\s+tasks_progress_before\s+before\s+insert\s+or\s+update\s+on\s+public\.tasks/i);
  assert.match(code, /create\s+trigger\s+tasks_progress_after\s+after\s+update\s+on\s+public\.tasks/i);
});

test('US-008-03 las funciones son security definer con search_path fijado', () => {
  const functions = code.match(/create\s+function[\s\S]*?\$\$;?[\s\S]*?(\$\$|end\s*\$\$)/gi) ?? [];
  assert.ok(functions.length >= 4, 'streak_ending, dos disparadores y get_progress');
  const defs = code.match(/create\s+function[\s\S]*?language[^$]*\$\$/gi) ?? [];
  assert.equal(defs.length, 4);
  for (const d of defs) {
    assert.match(d, /security\s+definer/i);
    assert.match(d, /set\s+search_path\s*=\s*public/i);
  }
});

test('US-008-03 solo get_progress es ejecutable desde el cliente', () => {
  assert.match(code, /revoke\s+execute\s+on\s+function[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(code, /grant\s+execute\s+on\s+function\s+public\.get_progress\(date\)\s+to\s+authenticated/i);
  const grants = code.match(/grant\s+execute[\s\S]*?;/gi) ?? [];
  assert.equal(grants.length, 1);
});

test('US-008-02 el tope diario es de 100 XP y cada tarea da 10', () => {
  assert.match(code, /least\(\s*10\s*,\s*100\s*-\s*used\s*\)/i);
});

test('US-008-01 no inserta datos de ejemplo ni borra tablas existentes', () => {
  assert.doesNotMatch(code, /insert\s+into\s+public\.(tasks|player_stats)\s*\(?[^)]*\)?\s*values\s*\(\s*'/i);
  assert.doesNotMatch(code, /\btruncate\b/i);
  assert.doesNotMatch(code, /drop\s+table/i);
});

test('US-008-01 documenta el rollback', () => {
  assert.match(sql, /rollback/i);
});

test('US-008-01 las tareas ya completadas reciben su día antes de añadir la restricción', () => {
  const backfill = code.search(/update\s+public\.tasks\s+set\s+completed_day/i);
  const constraint = code.search(/add\s+constraint\s+tasks_completed_day_pair/i);
  assert.ok(backfill >= 0, 'falta rellenar completed_day de las tareas existentes');
  assert.ok(backfill < constraint, 'el relleno va antes de la restricción');
});
