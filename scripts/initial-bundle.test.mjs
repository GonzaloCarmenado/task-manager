// Spec 011: el paquete inicial de la app no debe cargar la lógica de cuenta antes de necesitarla.
// Test estático: `app.ts` no puede importar de forma estática el servicio de cuenta ni sus textos
// (se carga con `import()` solo cuando hay un traspaso que reanudar).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const app = readFileSync(resolve(root, 'src', 'app', 'app.ts'), 'utf8');
const staticImports = [...app.matchAll(/^import\s[^;]*?from\s+'([^']+)';/gms)].map((m) => m[1]);

test('US-011-02 app.ts no importa de forma estática el servicio de cuenta ni sus textos', () => {
  const heavy = staticImports.filter((p) =>
    /account\.(access|constructor)\.service|tasks\.access\.service|progress\.access\.service/.test(p)
  );
  assert.deepEqual(heavy, [], 'esas importaciones engordan el paquete inicial');
});

test('US-011-02 el traspaso pendiente se reanuda con una importación dinámica', () => {
  assert.match(app, /import\(\s*'\.\/features\/account\/account\.access\.service'\s*\)/);
});

test('US-011-01 el aviso flotante sí va en el paquete inicial (es pequeño y se usa en cualquier pantalla)', () => {
  assert.ok(staticImports.some((p) => /account-toast\/account-toast$/.test(p)));
});
