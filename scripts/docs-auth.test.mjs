import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docs = readFileSync(resolve(import.meta.dirname, '..', 'docs', 'supabase.md'), 'utf8');

test('US-003-03 docs/supabase.md explica cómo distinguir usuarios anónimos en una política', () => {
  assert.match(docs, /is_anonymous/);
  assert.match(docs, /auth\.jwt\(\)/);
});

test('US-003-03 docs/supabase.md documenta el contrato de ready y de userId', () => {
  assert.match(docs, /`ready`/);
  assert.match(docs, /userId/);
  assert.match(docs, /no (que haya )?conexi[oó]n|conexi[oó]n ni/i);
});

test('US-003-03 docs/supabase.md avisa de que las consultas esperan sin red con token caducado', () => {
  assert.match(docs, /25 ?s/);
  assert.match(docs, /plazos? propios?/i);
});

test('US-003-05 docs/supabase.md explica cómo habilitar el registro anónimo y comprobarlo', () => {
  assert.match(docs, /enable_anonymous_sign_ins/);
  assert.match(docs, /config diff/);
  assert.match(docs, /verify:auth/);
});
