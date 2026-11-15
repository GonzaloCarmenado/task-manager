// Spec 013: test estático (de texto, sin dependencias) del flujo que publica el APK de Android en las Releases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const file = join(import.meta.dirname, '..', '.github', 'workflows', 'release-android.yml');
const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
const SECRETS = [
  'ANDROID_KEYSTORE_BASE64',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
];

/** Líneas sin comentarios de línea completa (las explicaciones no cuentan como código). */
const code = text
  .split('\n')
  .filter((line) => !/^\s*#/.test(line))
  .join('\n');

/** Texto de un trabajo (desde su clave hasta el siguiente trabajo). */
function job(name) {
  const lines = code.split('\n');
  const start = lines.findIndex((l) => l === `  ${name}:`);
  assert.ok(start >= 0, `falta el trabajo «${name}»`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^ {2}[A-Za-z][\w-]*:\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

test('US-013-01 existe el flujo de publicación', () => {
  assert.ok(existsSync(file), 'falta .github/workflows/release-android.yml');
});

test('US-013-01 se lanza solo con etiquetas vX.Y.Z (y con sufijo) o a mano, nunca por ramas ni PR', () => {
  const on = code.slice(code.indexOf('\non:'), code.indexOf('\npermissions:'));
  assert.match(on, /tags:/);
  assert.match(on, /'v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+'/);
  assert.match(on, /'v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+-\*'/);
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /branches:/);
  assert.doesNotMatch(on, /pull_request/);
  assert.doesNotMatch(on, /schedule:/);
  assert.doesNotMatch(code, /pull_request_target/);
});

test('US-013-04 permisos mínimos: ninguno por defecto, contents: write solo en publish', () => {
  assert.match(code, /^permissions: \{\}$/m);
  assert.equal(code.match(/contents: write/g)?.length, 1);
  assert.match(job('publish'), /contents: write/);
  assert.match(job('verify'), /contents: read/);
  assert.match(job('build'), /contents: read/);
  for (const name of ['verify', 'build', 'publish']) assert.match(job(name), /permissions:/, `${name} sin permissions`);
});

test('US-013-04 el orden es verify → build → publish', () => {
  assert.match(job('build'), /needs: verify/);
  assert.match(job('publish'), /needs: \[verify, build\]/);
});

test('US-013-04 verify pasa los mismos controles que el pre-commit antes de compilar', () => {
  const verify = job('verify');
  for (const command of ['pnpm secrets:check', 'pnpm lint', 'pnpm type-check', 'pnpm test:ci', 'pnpm test:scripts']) {
    assert.ok(verify.includes(command), `verify no ejecuta ${command}`);
  }
  assert.match(verify, /pnpm install --frozen-lockfile/);
});

test('US-013-04 verify comprueba versiones y que el commit está en main', () => {
  const verify = job('verify');
  assert.match(verify, /release-version\.mjs resolve/);
  assert.match(verify, /merge-base --is-ancestor/);
  assert.match(verify, /origin\/main/);
  assert.match(verify, /fetch-depth: 0/);
});

test('US-013-05 la ejecución manual solo se admite desde main', () => {
  assert.match(job('verify'), /if: .*github\.event_name == 'push'.*github\.ref == 'refs\/heads\/main'/);
});

test('US-013-03 las acciones de terceros van fijadas por SHA de commit (40 caracteres)', () => {
  const uses = [...code.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(uses.length >= 8, 'se esperan las acciones de checkout, pnpm, node, java, android, rust, caché y artefactos');
  for (const u of uses) assert.match(u, /@[0-9a-f]{40}$/, `«${u}» no está fijada por SHA`);
});

test('US-013-03 los secretos solo van en env: de un paso, nunca dentro de run: ni en ningún otro sitio', () => {
  for (const line of code.split('\n').filter((l) => l.includes('secrets.'))) {
    assert.match(line, /^\s+[A-Z][A-Z0-9_]*: \$\{\{ secrets\.[A-Z][A-Z0-9_]* \}\}\s*$/, `uso de secreto no permitido: ${line.trim()}`);
  }
});

test('US-013-03 los seis secretos se usan y solo en el trabajo build', () => {
  const build = job('build');
  for (const name of SECRETS) assert.ok(build.includes(`secrets.${name}`), `build no usa ${name}`);
  assert.doesNotMatch(job('verify'), /secrets\./);
  assert.doesNotMatch(job('publish'), /secrets\./);
});

test('US-013-03 el flujo falla al principio si falta un secreto y genera environment.ts desde ellos', () => {
  const build = job('build');
  const required = build.indexOf('release-ci.mjs require');
  assert.ok(required >= 0, 'falta la comprobación de secretos');
  for (const name of SECRETS) assert.ok(build.slice(required).includes(name));
  assert.ok(build.indexOf('write-environment.mjs') > required, 'environment.ts debe generarse después de comprobar los secretos');
  assert.ok(build.indexOf('tauri android build') > build.indexOf('write-environment.mjs'));
});

test('US-013-03 sin trazas ni eco de secretos', () => {
  assert.doesNotMatch(code, /set -x|xtrace|ACTIONS_STEP_DEBUG|ACTIONS_RUNNER_DEBUG/);
  assert.doesNotMatch(code, /echo[^\n]*\$\{?(ANDROID_KEYSTORE|ANDROID_KEY_|SUPABASE_)/);
  assert.doesNotMatch(code, /cat[^\n]*(keystore|\.jks)/i);
  assert.doesNotMatch(code, /continue-on-error:\s*true/);
});

test('US-013-02 se firma con apksigner (contraseñas por env:), se verifica y se valida el contenido del APK', () => {
  const build = job('build');
  assert.match(build, /zipalign"? /);
  assert.match(build, /apksigner"? sign/);
  assert.match(build, /--ks-pass env:ANDROID_KEYSTORE_PASSWORD/);
  assert.match(build, /--key-pass env:ANDROID_KEY_PASSWORD/);
  assert.doesNotMatch(build, /--ks-pass pass:|--key-pass pass:/);
  assert.match(build, /apksigner"? verify/);
  assert.match(build, /aapt2"? dump badging/);
  for (const expected of ['com.polyp.taskmanager', 'arm64-v8a', 'versionCode', 'versionName']) {
    assert.ok(build.includes(expected), `la validación no comprueba ${expected}`);
  }
});

test('US-013-02 compila solo arm64, en release, con la versión inyectada desde verify', () => {
  const build = job('build');
  assert.match(build, /tauri android init --ci/);
  assert.match(build, /tauri android build --apk --target aarch64/);
  assert.doesNotMatch(build, /--debug/);
  assert.match(build, /--config/);
  assert.match(build, /needs\.verify\.outputs\.version_code/);
  assert.match(build, /needs\.verify\.outputs\.version\b/);
  assert.match(build, /aarch64-linux-android/);
});

test('US-013-02 localiza exactamente un APK sin firmar y lo nombra con versión y ABI', () => {
  const build = job('build');
  assert.match(build, /release-unsigned\.apk/);
  assert.match(build, /exactamente un/);
  assert.match(build, /task-manager-.*arm64-v8a\.apk/);
  assert.match(build, /sha256sum/);
  assert.match(build, /\.apk\.sha256/);
});

test('US-013-03 el keystore y environment.ts se borran siempre (también si falla)', () => {
  const build = job('build');
  const cleanup = build.split('\n      - ').find((step) => step.includes('if: always()'));
  assert.ok(cleanup, 'falta el paso de limpieza con if: always()');
  assert.match(cleanup, /rm -f/);
  assert.match(cleanup, /release\.jks/);
  assert.match(cleanup, /environment\.ts/);
  assert.match(build, /RUNNER_TEMP/);
});

test('US-013-05 el artefacto caduca pronto: 1 día en manual y 7 en etiqueta', () => {
  const build = job('build');
  assert.match(build, /actions\/upload-artifact@/);
  assert.match(build, /retention-days: \$\{\{ github\.event_name == 'push' && 7 \|\| 1 \}\}/);
});

test('US-013-05 la ejecución manual no publica: publish solo en push de etiqueta', () => {
  assert.match(job('publish'), /if: github\.event_name == 'push'/);
});

test('US-013-01 publish crea o reemplaza la Release sin duplicar y con notas automáticas', () => {
  const publish = job('publish');
  assert.match(publish, /gh release/);
  assert.match(publish, /--clobber/);
  assert.match(publish, /--verify-tag/);
  assert.match(publish, /--generate-notes/);
  assert.match(publish, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(publish, /actions\/download-artifact@/);
});

test('US-013-07 las versiones previas se publican como pre-release y no como «latest»', () => {
  const publish = job('publish');
  assert.match(publish, /--prerelease/);
  assert.match(publish, /--latest=false/);
  assert.match(publish, /needs\.verify\.outputs\.prerelease/);
});

test('US-013-01 una publicación en marcha nunca se cancela y cada trabajo tiene tiempo máximo', () => {
  assert.match(code, /concurrency:/);
  assert.match(code, /cancel-in-progress: false/);
  for (const name of ['verify', 'build', 'publish']) assert.match(job(name), /timeout-minutes: \d+/, `${name} sin timeout-minutes`);
});

test('US-013-03 los checkouts no dejan credenciales en el repositorio local', () => {
  const checkouts = code.split('actions/checkout@').slice(1);
  assert.ok(checkouts.length >= 2);
  for (const c of checkouts) assert.match(c.slice(0, 300), /persist-credentials: false/);
});
