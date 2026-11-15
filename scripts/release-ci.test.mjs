// Spec 013: el flujo falla al principio nombrando los secretos que faltan, sin imprimir nunca valores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { missing } from './release-ci.mjs';

const script = join(import.meta.dirname, 'release-ci.mjs');
const VALUE = ['valor', 'de', 'prueba', '123'].join('-');

test('US-013-03 missing devuelve solo los nombres ausentes', () => {
  assert.deepEqual(missing({ A: VALUE, C: VALUE }, ['A', 'B', 'C', 'D']), ['B', 'D']);
});

test('US-013-03 missing trata «vacío» y «solo espacios» como ausente', () => {
  assert.deepEqual(missing({ A: '', B: '   ', C: '\n', D: VALUE }, ['A', 'B', 'C', 'D']), ['A', 'B', 'C']);
});

test('US-013-03 missing con todo presente devuelve una lista vacía', () => {
  assert.deepEqual(missing({ A: VALUE, B: VALUE }, ['A', 'B']), []);
});

test('US-013-03 missing nunca incluye valores en su resultado', () => {
  const result = missing({ A: VALUE }, ['A', 'B']);
  assert.ok(!JSON.stringify(result).includes(VALUE));
});

function run(env, names) {
  try {
    const stdout = execFileSync('node', [script, 'require', ...names], {
      env: { PATH: process.env.PATH, ...env },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return { code: error.status, stdout: String(error.stdout), stderr: String(error.stderr) };
  }
}

test('US-013-03 el CLI sale con éxito si están todos y no imprime valores', () => {
  const r = run({ UNO: VALUE, DOS: VALUE }, ['UNO', 'DOS']);
  assert.equal(r.code, 0);
  assert.ok(!r.stdout.includes(VALUE) && !r.stderr.includes(VALUE));
});

test('US-013-03 el CLI falla listando solo los nombres que faltan, nunca valores', () => {
  const r = run({ UNO: VALUE }, ['UNO', 'DOS', 'TRES']);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /DOS/);
  assert.match(r.stderr, /TRES/);
  assert.doesNotMatch(r.stderr, /UNO/);
  assert.ok(!r.stdout.includes(VALUE) && !r.stderr.includes(VALUE));
});

test('US-013-03 el CLI sin nombres es un error de uso', () => {
  const r = run({}, []);
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /Uso/);
});
