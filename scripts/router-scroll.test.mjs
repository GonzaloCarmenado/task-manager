// Spec 011 (comprobación en Android): el WebView conserva el desplazamiento del documento al cambiar de
// ruta, así que una pantalla nueva aparecía ya desplazada. Cada navegación debe empezar arriba.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const config = readFileSync(resolve(import.meta.dirname, '..', 'src', 'app', 'app.config.ts'), 'utf8');

test('US-011-01 el router lleva al inicio de la página en cada navegación', () => {
  assert.match(config, /withInMemoryScrolling\(\s*\{\s*scrollPositionRestoration:\s*'top'\s*\}\s*\)/);
  assert.match(config, /provideRouter\(\s*routes\s*,\s*withInMemoryScrolling/);
});
