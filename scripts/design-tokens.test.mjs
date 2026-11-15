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

// ---- Formulario y hojas (spec 010, US-010-04) ---------------------------------------------------------
const scss = (p) => strip(read(p));
const sheetFiles = [
  'src/app/features/tasks/postpone/postpone-sheet/postpone-sheet.scss',
  'src/app/features/tasks/alarms/exact-alarm-sheet/exact-alarm-sheet.scss',
];

test('US-010-04 el chip de 36 px conserva una zona táctil de 44 px', () => {
  const body = blockAt(mixinsCss, '@mixin chip');
  assert.match(body, /position:\s*relative/);
  assert.match(body, /&::after\s*\{[^}]*inset:\s*-4px 0/);
});

test('US-010-04 los velos de hojas y diálogos usan el mixin scrim (desenfoque) y no un color suelto', () => {
  for (const f of [...sheetFiles, 'src/app/features/tasks/task-form/task-form.scss']) {
    const css = scss(f);
    assert.match(blockAt(css, '.backdrop'), /@include mixins\.scrim/, `${f}: .backdrop sin scrim`);
    assert.doesNotMatch(css, /rgba\(15,\s*14,\s*23/, `${f}: velo con color suelto`);
  }
});

test('US-010-04 las hojas inferiores usan el mixin sheet (radio superior, relleno y sombra de nivel 3)', () => {
  for (const f of sheetFiles) {
    assert.match(blockAt(scss(f), '.sheet'), /@include mixins\.sheet/, `${f}: .sheet sin mixin sheet`);
  }
  assert.match(blockAt(scss('src/app/features/tasks/task-form/task-form.scss'), '.dialog'), /@include mixins\.sheet/);
});

test('US-010-04 el formulario usa los mixins de campo en píldora, chip y botón primario', () => {
  const css = scss('src/app/features/tasks/task-form/task-form.scss');
  assert.match(blockAt(css, '\n.field {'), /@include mixins\.field/);
  assert.match(blockAt(css, '\n.chip {'), /@include mixins\.chip/);
  assert.match(blockAt(css, '\n.save,'), /@include mixins\.pill-button/);
});

test('US-010-04 los botones principales de hojas y avisos usan el mixin pill-button (52 px)', () => {
  for (const f of [
    ...sheetFiles,
    'src/app/features/tasks/alarms/alarm-permission-prompt/alarm-permission-prompt.scss',
    'src/app/features/tasks/alarms/alarms-banner/alarms-banner.scss',
  ]) {
    const css = scss(f);
    const target = f.includes('alarms-banner') ? '.activate' : f.includes('postpone') ? '.close' : '.primary';
    if (f.includes('postpone')) continue; // la hoja de posponer no tiene botón principal: elige una opción
    assert.match(blockAt(css, target), /@include mixins\.pill-button/, `${f}: ${target} sin pill-button`);
  }
});

test('US-010-04 el selector de fecha de posponer es un campo en píldora', () => {
  assert.match(
    blockAt(scss('src/app/features/tasks/postpone/postpone-sheet/postpone-sheet.scss'), '.date'),
    /@include mixins\.field/
  );
});

test('US-010-04 el aviso de alarmas tiene identidad ámbar suave (no el rojo de error)', () => {
  const body = blockAt(scss('src/app/features/tasks/alarms/alarms-banner/alarms-banner.scss'), '.banner');
  assert.match(body, /background:\s*var\(--color-secondary-soft\)/);
  assert.match(body, /color:\s*var\(--color-on-secondary-soft\)/);
});

test('US-010-04 los textos de formulario y hojas usan la escala tipográfica (sin tamaños sueltos)', () => {
  for (const f of [
    'src/app/features/tasks/task-form/task-form.scss',
    ...sheetFiles,
    'src/app/features/tasks/alarms/alarm-permission-prompt/alarm-permission-prompt.scss',
    'src/app/features/tasks/alarms/alarms-banner/alarms-banner.scss',
  ]) {
    assert.doesNotMatch(scss(f), /var\(--font-size-/, `${f}: usa tamaños antiguos en vez de la escala`);
  }
});

// ---- Pantallas de sistema (spec 010, US-010-05) ---------------------------------------------------------
const systemScreens = [
  ['src/app/shared/components/biometric-offer/biometric-offer.scss', '\n.primary {'],
  ['src/app/shared/components/biometric-lock-screen/biometric-lock-screen.scss', '\n.unlock {'],
  ['src/app/shared/components/biometric-notice/biometric-notice.scss', '\n.ack {'],
  ['src/app/shared/components/session-status/session-status.scss', '\n.retry {'],
];

test('US-010-05 las pantallas de sistema usan títulos headline-md y la escala tipográfica', () => {
  for (const [f] of systemScreens) {
    const css = scss(f);
    assert.match(blockAt(css, '\n.title {'), /@include type\.headline-md/, `${f}: .title sin headline-md`);
    assert.doesNotMatch(css, /var\(--font-size-/, `${f}: usa tamaños antiguos en vez de la escala`);
  }
});

test('US-010-05 su botón principal es el botón de 52 px del diseño', () => {
  for (const [f, selector] of systemScreens) {
    assert.match(blockAt(scss(f), selector), /@include mixins\.pill-button/, `${f}: ${selector.trim()} sin pill-button`);
  }
});

test('US-010-05 la insignia es de color con halo de profundidad', () => {
  for (const [f] of systemScreens) {
    const body = blockAt(scss(f), '\n.badge {');
    assert.match(body, /background:\s*var\(--color-primary-soft\)/, `${f}: insignia sin color de rol`);
    assert.match(body, /box-shadow:\s*var\(--shadow-xp\)/, `${f}: insignia sin halo`);
  }
});

test('US-010-05 la tarjeta de error de sesión es una tarjeta del diseño y las zonas seguras se respetan', () => {
  const css = scss('src/app/shared/components/session-status/session-status.scss');
  assert.match(blockAt(css, '\n.card {'), /@include mixins\.card/);
  for (const [f] of systemScreens) {
    assert.match(scss(f), /safe-area-inset-bottom/, `${f}: no respeta la zona segura inferior`);
  }
});

// ---- Spec 011: tokens nuevos de la cuenta (T-011-27) ------------------------------------------------
const accountColorMap = {
  '--color-surface-highest': 'surface-container-highest',
  '--color-inverse-surface': 'inverse-surface',
  '--color-inverse-on-surface': 'inverse-on-surface',
  '--color-tertiary-soft-dim': 'tertiary-fixed-dim',
  '--color-on-primary-soft-strong': 'on-primary-fixed',
};

const accountLiteral = {
  '--glass-bar': 'rgba(252, 248, 255, 0.85)',
  '--tint-secondary': 'rgba(255, 221, 184, 0.3)',
  '--tint-error': 'rgba(255, 218, 214, 0.3)',
  '--tint-surface-high': 'rgba(233, 229, 255, 0.6)',
  '--tint-tertiary': 'rgba(78, 222, 163, 0.3)',
  '--scrim-inverse-40': 'rgba(45, 42, 91, 0.4)',
  '--scrim-inverse-60': 'rgba(45, 42, 91, 0.6)',
  '--scrim-inverse-75': 'rgba(45, 42, 91, 0.75)',
  '--shadow-field': '0 4px 20px -2px rgba(70, 72, 212, 0.06)',
  '--shadow-input': '0 2px 12px rgba(96, 99, 238, 0.06)',
  '--shadow-pop': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  '--shadow-soft': '0 1px 2px rgba(0, 0, 0, 0.05)',
  '--shadow-header': '0 1px 8px rgba(0, 0, 0, 0.04)',
};

test('US-011-01 los colores nuevos de la cuenta coinciden con el DESIGN.md en claro', () => {
  for (const [token, key] of Object.entries(accountColorMap)) {
    assert.ok(designColors[key], `el DESIGN.md no trae ${key}`);
    assert.equal(light[token], designColors[key], `${token} debe ser ${key} (${designColors[key]})`);
  }
});

test('US-011-01 los tintes, velos y sombras nuevos tienen el valor claro del diseño', () => {
  for (const [token, value] of Object.entries(accountLiteral)) {
    assert.equal(light[token], value, `${token} debe valer ${value}`);
  }
});

test('US-011-01 los tokens nuevos están redefinidos en oscuro (no heredan el valor claro)', () => {
  const darkOnly = vars(blockAt(darkBlock, ':root'));
  const missing = [...Object.keys(accountColorMap), ...Object.keys(accountLiteral)].filter(
    (token) => !darkOnly[token]
  );
  assert.deepEqual(missing, [], 'tokens sin valor propio en oscuro');
});

test('US-011-01 contraste de los pares nuevos: texto 4,5:1 e iconos 3:1, en claro y oscuro', () => {
  const text = [['--color-inverse-on-surface', '--color-inverse-surface']];
  const icons = [
    ['--color-tertiary-soft-dim', '--color-inverse-surface'],
    ['--color-on-primary-soft-strong', '--color-primary-soft'],
  ];
  const fails = [];
  for (const [name, theme] of [['claro', light], ['oscuro', dark]]) {
    for (const [fg, bg] of text) {
      const r = contrast(theme[fg], theme[bg]);
      if (r < 4.5) fails.push(`${name} ${fg} sobre ${bg}: ${r.toFixed(2)}:1`);
    }
    for (const [fg, bg] of icons) {
      const r = contrast(theme[fg], theme[bg]);
      if (r < 3) fails.push(`${name} ${fg} sobre ${bg}: ${r.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(fails, []);
});
