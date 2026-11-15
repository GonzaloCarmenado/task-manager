// Presupuestos del build de producción (angular.json). Spec 011: la cuenta añade 28 iconos y siete pantallas;
// el paquete inicial pasa de 498 a ~536 kB (134 kB transferidos) y la pantalla Cuenta ronda los 9 kB de estilos.
// Los avisos suben con el motivo anotado; los errores (que rompen el build) no se tocan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const angular = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'angular.json'), 'utf8'));
const budgets = angular.projects['task-manager'].architect.build.configurations.production.budgets;
const byType = (type) => budgets.find((b) => b.type === type);
const kb = (value) => Number.parseFloat(value) * (/MB$/i.test(value) ? 1024 : 1);

test('US-011-01 el aviso del paquete inicial es de 560 kB y el error sigue en 1 MB', () => {
  assert.equal(byType('initial').maximumWarning, '560kB');
  assert.equal(byType('initial').maximumError, '1MB');
});

test('US-011-01 el aviso de estilos de componente es de 10 kB y el error sigue en 12 kB', () => {
  assert.equal(byType('anyComponentStyle').maximumWarning, '10kB');
  assert.equal(byType('anyComponentStyle').maximumError, '12kB');
});

test('US-011-01 los avisos nunca superan a los errores', () => {
  for (const b of budgets) assert.ok(kb(b.maximumWarning) < kb(b.maximumError), b.type);
});
