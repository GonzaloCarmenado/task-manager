// Spec 010: la interfaz es fiel al sistema de diseño «Playful Momentum». Test estático: lee el
// propio DESIGN.md (fuente de verdad) y comprueba tokens, tipografía, sombras, fuente local,
// contraste AA, movimiento reducido y mixins. No ejecuta navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ---- DESIGN.md ---------------------------------------------------------------------------------
const design = read('specs/_design/playful-momentum/DESIGN.md').replace(/\r/g, '');
const front = design.split('---')[1] ?? '';

function section(name) {
  const lines = front.split('\n');
  const start = lines.findIndex((l) => l.trimEnd() === `${name}:`);
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

const designColors = Object.fromEntries(
  section('colors')
    .map((l) => l.match(/^\s+([\w-]+):\s*'(#[0-9a-fA-F]{6})'/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].toLowerCase()])
);

const designType = {};
{
  let current = null;
  for (const l of section('typography')) {
    const head = l.match(/^ {2}([\w-]+):\s*$/);
    if (head) {
      current = head[1];
      designType[current] = {};
      continue;
    }
    const prop = l.match(/^ {4}(\w+):\s*'?([^'\n]+)'?\s*$/);
    if (prop && current) designType[current][prop[1]] = prop[2].trim();
  }
}

// ---- Tokens ------------------------------------------------------------------------------------
function blockAt(css, open) {
  const start = css.indexOf(open);
  if (start < 0) return '';
  const from = css.indexOf('{', start);
  let depth = 0;
  for (let i = from; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(from + 1, i);
    }
  }
  return '';
}

function vars(block) {
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim().toLowerCase();
  return out;
}

const tokensCss = strip(read('src/styles/_tokens.scss'));
const light = vars(blockAt(tokensCss, ':root'));
const darkBlock = blockAt(tokensCss, '@media (prefers-color-scheme: dark)');
const dark = { ...light, ...vars(blockAt(darkBlock, ':root')) };

// token → clave del DESIGN.md (tema claro: manda la cabecera, decisión de /clarify)
const lightMap = {
  '--color-bg': 'background',
  '--color-surface': 'surface-container-lowest',
  '--color-surface-low': 'surface-container-low',
  '--color-surface-soft': 'surface-container',
  '--color-surface-high': 'surface-container-high',
  '--color-text': 'on-surface',
  '--color-text-muted': 'on-surface-variant',
  '--color-outline': 'outline-variant',
  '--color-outline-strong': 'outline',
  '--color-primary': 'primary',
  '--color-primary-text': 'primary',
  '--color-on-primary': 'on-primary',
  '--color-ring': 'primary-fixed-dim',
  '--color-primary-container': 'primary-container',
  '--color-on-primary-container': 'on-primary-container',
  '--color-primary-soft': 'primary-fixed',
  '--color-on-primary-soft': 'on-primary-fixed-variant',
  '--color-secondary': 'secondary',
  '--color-on-secondary': 'on-secondary',
  '--color-secondary-container': 'secondary-container',
  '--color-on-secondary-container': 'on-secondary-container',
  '--color-secondary-soft': 'secondary-fixed',
  '--color-on-secondary-soft': 'on-secondary-fixed',
  '--color-tertiary': 'tertiary',
  '--color-on-tertiary': 'on-tertiary',
  '--color-tertiary-container': 'tertiary-container',
  '--color-tertiary-soft': 'tertiary-fixed',
  '--color-on-tertiary-soft': 'on-tertiary-fixed',
  '--color-error': 'error',
  '--color-on-error': 'on-error',
  '--color-error-soft': 'error-container',
  '--color-on-error-soft': 'on-error-container',
};

test('US-010-01 el DESIGN.md se lee y trae paleta y tipografía', () => {
  assert.ok(Object.keys(designColors).length > 30, 'no se leyó la paleta del DESIGN.md');
  assert.equal(Object.keys(designType).length, 10, 'la escala tipográfica debe tener 10 roles');
});

test('US-010-01 la paleta clara usa los colores del DESIGN.md', () => {
  for (const [token, key] of Object.entries(lightMap)) {
    assert.ok(light[token], `falta el token ${token}`);
    assert.equal(light[token], designColors[key], `${token} debe ser ${key} (${designColors[key]})`);
  }
});

test('US-010-01 la paleta oscura define todos los tokens y usa los tonos del diseño', () => {
  for (const token of Object.keys(lightMap)) assert.ok(dark[token], `falta ${token} en oscuro`);
  assert.equal(dark['--color-bg'], '#0f0e17');
  assert.equal(dark['--color-surface'], '#1b1a2e');
  assert.equal(dark['--color-surface-soft'], '#2e2a56');
  assert.equal(dark['--color-primary'], '#6366f1');
  assert.equal(dark['--color-secondary-container'], '#f59e0b');
  assert.equal(dark['--color-tertiary-container'], '#10b981');
  assert.equal(dark['--color-text'], '#e2e8f0');
});

test('US-010-01 radios y espaciado del diseño', () => {
  assert.equal(light['--radius-sm'], '0.5rem');
  assert.equal(light['--radius-md'], '1rem');
  assert.equal(light['--radius-lg'], '1.5rem');
  assert.equal(light['--radius-xl'], '2rem');
  assert.equal(light['--radius-2xl'], '3rem');
  assert.equal(light['--radius-full'], '9999px');
  assert.equal(light['--space-margin'], '1.25rem');
  assert.equal(light['--space-gutter'], '1rem');
  assert.equal(light['--space-6'], '24px'); // space-lg
  assert.equal(light['--space-8'], '36px'); // space-xl
});

// ---- Profundidad, velo, degradado y alturas (T-010-02) -------------------------------------------
test('US-010-01 cuatro niveles de profundidad con los valores del diseño', () => {
  assert.match(light['--shadow-card'], /0 4px 20px -2px rgba\(99, ?102, ?241, ?0\.08\)/);
  assert.match(light['--shadow-streak'], /0 8px 24px -4px rgba\(245, ?158, ?11, ?0\.22\)/);
  assert.match(light['--shadow-xp'], /0 8px 24px -4px rgba\(99, ?102, ?241, ?0\.25\)/);
  assert.match(light['--shadow-modal'], /0 20px 40px -8px rgba\(15, ?14, ?23, ?0\.35\)/);
  assert.ok(light['--shadow-button'], 'falta --shadow-button (sombra tintada del botón primario)');
  for (const t of ['--shadow-card', '--shadow-streak', '--shadow-xp', '--shadow-modal', '--shadow-button']) {
    assert.ok(dark[t], `falta ${t} en oscuro`);
  }
});

test('US-010-01 velo con desenfoque de 8 px, degradado de progreso y alturas de control', () => {
  assert.ok(light['--scrim'], 'falta --scrim');
  assert.equal(light['--scrim-blur'], '8px');
  assert.match(light['--gradient-progress'], /linear-gradient\(/);
  assert.match(light['--gradient-progress'], /var\(--color-primary\)/);
  assert.match(light['--gradient-progress'], /var\(--color-tertiary-container\)/);
  assert.equal(light['--control-height'], '52px');
  assert.equal(light['--chip-height'], '36px');
  assert.equal(light['--check-size'], '28px');
  assert.equal(light['--tap-target'], '44px');
});

// ---- Tipografía (T-010-03) ------------------------------------------------------------------------
const typeCss = strip(read('src/styles/_type.scss'));

test('US-010-01 la escala tipográfica define los 10 roles con los valores del diseño', () => {
  assert.ok(typeCss, 'falta src/styles/_type.scss');
  for (const [role, spec] of Object.entries(designType)) {
    const body = blockAt(typeCss, `@mixin ${role}`);
    assert.ok(body, `falta el mixin ${role}`);
    const px = (v) => `${Number(v.replace('px', '')) / 16}rem`;
    assert.match(body, new RegExp(`font-size:\\s*${px(spec.fontSize).replace('.', '\\.')}`), `${role}: tamaño`);
    assert.match(body, new RegExp(`font-weight:\\s*${spec.fontWeight}`), `${role}: peso`);
    assert.match(body, new RegExp(`line-height:\\s*${px(spec.lineHeight).replace('.', '\\.')}`), `${role}: interlineado`);
    if (spec.letterSpacing) {
      assert.match(body, new RegExp(`letter-spacing:\\s*${spec.letterSpacing.replace('.', '\\.')}`), `${role}: tracking`);
    }
  }
  assert.match(blockAt(typeCss, '@mixin label-sm'), /text-transform:\s*uppercase/);
});

// ---- Fuente empaquetada (T-010-04) ----------------------------------------------------------------
const angularJson = read('angular.json');
const fontsCss = strip(read('src/styles/_fonts.scss'));

function allFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) allFiles(p, out);
    else out.push(p);
  }
  return out;
}

test('US-010-01 la fuente está empaquetada con la app y se sirve desde /fonts/', () => {
  assert.match(angularJson, /plus-jakarta-sans-latin-wght-normal\.woff2/);
  assert.match(angularJson, /plus-jakarta-sans-latin-ext-wght-normal\.woff2/);
  assert.match(angularJson, /"output":\s*"\/fonts"/);
  assert.match(angularJson, /"includePaths":\s*\[\s*"src\/styles"\s*\]/);
  assert.ok(existsSync(join(root, 'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2')));
  const faces = fontsCss.match(/@font-face/g) ?? [];
  assert.equal(faces.length, 2, 'dos @font-face (latin y latin-ext)');
  assert.match(fontsCss, /font-family:\s*'Plus Jakarta Sans'/);
  assert.match(fontsCss, /font-weight:\s*200 800/);
  assert.match(fontsCss, /font-display:\s*swap/);
  assert.match(fontsCss, /url\('\/fonts\/plus-jakarta-sans-latin-wght-normal\.woff2'\)/);
  assert.match(read('src/index.html'), /<link[^>]+rel="preload"[^>]+as="font"[^>]+crossorigin/);
  assert.match(read('package.json'), /"@fontsource-variable\/plus-jakarta-sans":\s*"5\.3\.0"/);
});

test('US-010-01 ningún estilo ni el HTML pide fuentes a un servicio externo', () => {
  const files = allFiles(join(root, 'src')).filter((f) => /\.(scss|css|html|ts)$/.test(f) && !/\.spec\.ts$/.test(f));
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /fonts\.googleapis|fonts\.gstatic|@import\s+url\(\s*['"]?https?:/i, `${f} pide fuentes externas`);
  }
});

// ---- Contraste AA (T-010-05) -----------------------------------------------------------------------
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [texto, fondo]: pares que la interfaz usa de verdad
const pairs = [
  ['--color-text', '--color-bg'],
  ['--color-text', '--color-surface'],
  ['--color-text', '--color-surface-soft'],
  ['--color-text-muted', '--color-bg'],
  ['--color-text-muted', '--color-surface'],
  ['--color-text-muted', '--color-surface-soft'],
  ['--color-primary-text', '--color-bg'],
  ['--color-primary-text', '--color-surface'],
  ['--color-primary-text', '--color-surface-soft'],
  ['--color-on-primary', '--color-primary'],
  ['--color-on-primary-container', '--color-primary-container'],
  ['--color-on-primary-soft', '--color-primary-soft'],
  ['--color-on-secondary-soft', '--color-secondary-soft'],
  ['--color-on-secondary-container', '--color-secondary-container'],
  ['--color-secondary', '--color-surface'],
  ['--color-on-tertiary', '--color-tertiary'],
  ['--color-on-tertiary-soft', '--color-tertiary-soft'],
  ['--color-tertiary', '--color-surface'],
  ['--color-error', '--color-surface'],
  ['--color-error', '--color-bg'],
  ['--color-on-error-soft', '--color-error-soft'],
];

// Excepción documentada: el diseño fija el botón primario oscuro en #6366F1 con texto blanco (4,47:1, 3 centésimas
// bajo AA). Se mantiene por fidelidad; el texto sobre fondo oscuro usa --color-primary-text (#c0c1ff).
const exceptions = { oscuro: { '--color-on-primary|--color-primary': 4.4 } };

for (const [name, theme] of [['claro', light], ['oscuro', dark]]) {
  test(`US-010-01 el contraste de texto cumple AA (4,5:1) en tema ${name}`, () => {
    const fails = [];
    for (const [fg, bg] of pairs) {
      assert.match(theme[fg] ?? '', /^#[0-9a-f]{6}$/, `${fg} debe ser un color hexadecimal`);
      assert.match(theme[bg] ?? '', /^#[0-9a-f]{6}$/, `${bg} debe ser un color hexadecimal`);
      const ratio = contrast(theme[fg], theme[bg]);
      const min = exceptions[name]?.[`${fg}|${bg}`] ?? 4.5;
      if (ratio < min) fails.push(`${fg} sobre ${bg}: ${ratio.toFixed(2)}:1`);
    }
    assert.deepEqual(fails, [], `pares bajo AA en tema ${name}`);
  });
}

// ---- Mixins, movimiento reducido y compatibilidad (T-010-06) ------------------------------------------
const mixinsCss = strip(read('src/styles/_mixins.scss'));
const globalCss = strip(read('src/styles.scss'));

test('US-010-01 el botón primario es una píldora de 52 px con sombra tintada y escala 0,97 al pulsar', () => {
  const body = blockAt(mixinsCss, '@mixin pill-button');
  assert.ok(body, 'falta el mixin pill-button');
  assert.match(body, /min-height:\s*var\(--control-height\)/);
  assert.match(body, /border-radius:\s*var\(--radius-full\)/);
  assert.match(body, /box-shadow:\s*var\(--shadow-button\)/);
  assert.match(body, /scale\(0\.97\)/);
});

test('US-010-01 existen los mixins card, chip, field, scrim, sheet y pill', () => {
  for (const m of ['card', 'chip', 'field', 'scrim', 'sheet', 'pill']) {
    assert.ok(blockAt(mixinsCss, `@mixin ${m}`), `falta el mixin ${m}`);
  }
  assert.match(blockAt(mixinsCss, '@mixin scrim'), /backdrop-filter:\s*blur\(var\(--scrim-blur\)\)/);
  assert.match(blockAt(mixinsCss, '@mixin scrim'), /-webkit-backdrop-filter/);
  assert.match(blockAt(mixinsCss, '@mixin chip'), /min-height:\s*var\(--chip-height\)/);
});

test('US-010-01 con «reducir movimiento» no hay animaciones ni transiciones (salvo el indicador de carga)', () => {
  const block = blockAt(globalCss, '@media (prefers-reduced-motion: reduce)');
  assert.ok(block, 'falta la regla global de prefers-reduced-motion en styles.scss');
  assert.match(block, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(block, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(block, /\.spinner/);
});

test('US-010-01 ningún estilo usa funciones CSS recientes que un WebView antiguo no entiende', () => {
  const files = allFiles(join(root, 'src')).filter((f) => /\.(scss|css)$/.test(f));
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /color-mix\(/, `${f} usa color-mix`);
  for (const f of allFiles(join(root, 'src/app')).filter((p) => p.endsWith('.ts') && !p.endsWith('.spec.ts'))) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /color-mix\(/, `${f} usa color-mix`);
  }
});
