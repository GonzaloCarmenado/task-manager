import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwtRole } from './verify-auth.mjs';

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma-ficticia`; // secrets:allow

test('US-003-03 decodeJwtRole devuelve el claim role', () => {
  assert.equal(decodeJwtRole(token({ role: 'authenticated', sub: 'x' })), 'authenticated');
  assert.equal(decodeJwtRole(token({ role: 'anon' })), 'anon');
});

test('US-003-03 decodeJwtRole devuelve null sin lanzar ante tokens mal formados', () => {
  for (const bad of ['', 'abc', 'a.b', 'a.b.c', '...', 'a.%%%.c', null, undefined, 42, {}]) {
    assert.equal(decodeJwtRole(bad), null, String(bad));
  }
});

test('US-003-03 decodeJwtRole devuelve null si no hay claim role o no es texto', () => {
  assert.equal(decodeJwtRole(token({ sub: 'x' })), null);
  assert.equal(decodeJwtRole(token({ role: 5 })), null);
  assert.equal(decodeJwtRole(token({ role: null })), null);
});

test('US-003-03 decodeJwtRole nunca incluye el token en lo que devuelve', () => {
  const t = token({ role: 'authenticated' });
  assert.ok(!String(decodeJwtRole(t)).includes(t));
});
