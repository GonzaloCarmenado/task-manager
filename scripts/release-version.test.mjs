// Spec 013: etiqueta de versión → versionName, versionCode y comprobación de que el proyecto coincide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseTag, releaseOf, resolveRelease, versionMismatches } from './release-version.mjs';

const script = join(import.meta.dirname, 'release-version.mjs');
const CARGO = (version) => `[package]\nname = "app"\nversion = "${version}"\nedition = "2024"\n`;

test('US-013-01 parseTag acepta vMAYOR.MENOR.PARCHE y un sufijo opcional', () => {
  assert.deepEqual(parseTag('v0.3.0'), { major: 0, minor: 3, patch: 0, pre: null });
  assert.deepEqual(parseTag('v0.3.0-rc.1'), { major: 0, minor: 3, patch: 0, pre: 'rc.1' });
  assert.deepEqual(parseTag('v1.2.3-beta'), { major: 1, minor: 2, patch: 3, pre: 'beta' });
  assert.deepEqual(parseTag('v99.99.99'), { major: 99, minor: 99, patch: 99, pre: null });
});

test('US-013-01 parseTag rechaza lo que no es vMAYOR.MENOR.PARCHE[-sufijo]', () => {
  for (const bad of [
    '',
    '0.3.0',
    'v1.2',
    'v1.2.3.4',
    'v1.2.x',
    'V1.2.3',
    'v1.2.3-',
    'v1.2.3-rc 1',
    'v01.2.3',
    'v1.02.3',
    'v1.2.03',
    'refs/tags/v1.2.3',
  ]) {
    assert.throws(() => parseTag(bad), /etiqueta/i, `debería rechazar «${bad}»`);
  }
});

test('US-013-02 parseTag rechaza números que no caben en el versionCode (más de 99)', () => {
  for (const bad of ['v100.0.0', 'v1.100.0', 'v1.0.100']) {
    assert.throws(() => parseTag(bad), /99/, `debería rechazar «${bad}»`);
  }
});

test('US-013-02 releaseOf: versionName viene de la etiqueta sin la «v»', () => {
  assert.equal(releaseOf('v0.2.0').version, '0.2.0');
  assert.equal(releaseOf('v0.3.0-rc.1').version, '0.3.0-rc.1');
});

test('US-013-02 releaseOf: versionCode = (MAYOR*10000+MENOR*100+PARCHE)*100 + etapa (99 en la final)', () => {
  assert.equal(releaseOf('v0.1.0').versionCode, 10099);
  assert.equal(releaseOf('v0.3.0').versionCode, 30099);
  assert.equal(releaseOf('v0.3.1').versionCode, 30199);
  assert.equal(releaseOf('v1.0.0').versionCode, 1000099);
  assert.equal(releaseOf('v99.99.99').versionCode, 99999999);
});

test('US-013-07 una versión previa lleva su número de «-rc.N» como etapa (0 si no hay número)', () => {
  assert.equal(releaseOf('v0.3.0-rc.1').versionCode, 30001);
  assert.equal(releaseOf('v0.3.0-rc.12').versionCode, 30012);
  assert.equal(releaseOf('v0.3.0-beta.2').versionCode, 30002);
  assert.equal(releaseOf('v1.0.0-beta').versionCode, 1000000);
  assert.equal(releaseOf('v1.0.0-rc.98').versionCode, 1000098);
});

test('US-013-07 el número de etapa de una versión previa no puede llegar a 99 (colisionaría con la final)', () => {
  assert.throws(() => releaseOf('v1.0.0-rc.99'), /98/);
  assert.throws(() => releaseOf('v1.0.0-rc.150'), /98/);
});

test('US-013-07 una versión previa es menor que su final y esta menor que la siguiente', () => {
  const codes = ['v0.3.0-rc.1', 'v0.3.0-rc.2', 'v0.3.0', 'v0.3.1-rc.1', 'v0.3.1', 'v0.4.0'].map(
    (t) => releaseOf(t).versionCode
  );
  const sorted = [...codes].sort((a, b) => a - b);
  assert.deepEqual(codes, sorted);
  assert.equal(new Set(codes).size, codes.length);
});

test('US-013-07 solo las etiquetas con sufijo son versiones previas', () => {
  assert.equal(releaseOf('v0.3.0').prerelease, false);
  assert.equal(releaseOf('v0.3.0-rc.1').prerelease, true);
  assert.equal(releaseOf('v1.0.0-beta').prerelease, true);
});

test('US-013-04 versionMismatches: sin diferencias cuando las tres versiones coinciden con la etiqueta', () => {
  const project = { packageJson: { version: '0.1.0' }, tauriConf: { version: '0.1.0' }, cargoToml: CARGO('0.1.0') };
  assert.deepEqual(versionMismatches(releaseOf('v0.1.0'), project), []);
});

test('US-013-04 versionMismatches: una previa se compara por MAYOR.MENOR.PARCHE', () => {
  const project = { packageJson: { version: '0.3.0' }, tauriConf: { version: '0.3.0' }, cargoToml: CARGO('0.3.0') };
  assert.deepEqual(versionMismatches(releaseOf('v0.3.0-rc.1'), project), []);
});

test('US-013-04 versionMismatches: nombra el fichero y las dos versiones cuando difieren', () => {
  const project = { packageJson: { version: '0.0.0' }, tauriConf: { version: '0.1.0' }, cargoToml: CARGO('0.2.0') };
  const found = versionMismatches(releaseOf('v0.1.0'), project);
  assert.equal(found.length, 2);
  assert.match(found[0], /package\.json/);
  assert.match(found[0], /0\.0\.0/);
  assert.match(found[0], /0\.1\.0/);
  assert.match(found[1], /Cargo\.toml/);
  assert.match(found[1], /0\.2\.0/);
});

test('US-013-04 versionMismatches: un Cargo.toml sin versión también es una diferencia', () => {
  const project = { packageJson: { version: '0.1.0' }, tauriConf: { version: '0.1.0' }, cargoToml: '[package]\nname = "app"\n' };
  const found = versionMismatches(releaseOf('v0.1.0'), project);
  assert.equal(found.length, 1);
  assert.match(found[0], /Cargo\.toml/);
});

test('US-013-01 resolveRelease con un push de etiqueta usa la etiqueta', () => {
  const r = resolveRelease({ event: 'push', ref: 'refs/tags/v0.2.0', runNumber: '7', projectVersion: '0.2.0' });
  assert.deepEqual(r, { tag: 'v0.2.0', version: '0.2.0', versionCode: 20099, prerelease: false });
});

test('US-013-01 resolveRelease rechaza un push que no es una etiqueta válida', () => {
  assert.throws(() => resolveRelease({ event: 'push', ref: 'refs/heads/main', runNumber: '1', projectVersion: '0.1.0' }), /etiqueta/i);
  assert.throws(() => resolveRelease({ event: 'push', ref: 'refs/tags/release-1', runNumber: '1', projectVersion: '0.1.0' }), /etiqueta/i);
});

test('US-013-05 resolveRelease en ejecución manual da X.Y.Z-dev.N, previa y sin etiqueta', () => {
  const r = resolveRelease({ event: 'workflow_dispatch', ref: 'refs/heads/main', runNumber: '5', projectVersion: '0.1.0' });
  assert.deepEqual(r, { tag: '', version: '0.1.0-dev.5', versionCode: 10005, prerelease: true });
});

test('US-013-05 en ejecución manual, el número de ejecución grande se limita a 98 (nunca choca con la final)', () => {
  const r = resolveRelease({ event: 'workflow_dispatch', ref: 'refs/heads/main', runNumber: '412', projectVersion: '0.1.0' });
  assert.equal(r.versionCode, 10098);
  assert.ok(r.versionCode < releaseOf('v0.1.0').versionCode);
});

test('US-013-05 resolveRelease rechaza un evento desconocido', () => {
  assert.throws(() => resolveRelease({ event: 'pull_request', ref: 'refs/heads/x', runNumber: '1', projectVersion: '0.1.0' }), /evento/i);
});

// ---- CLI ---------------------------------------------------------------------------------------------
function fixture(versions) {
  const dir = mkdtempSync(join(tmpdir(), 'release-version-'));
  mkdirSync(join(dir, 'src-tauri'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: versions.pkg }));
  writeFileSync(join(dir, 'src-tauri', 'tauri.conf.json'), JSON.stringify({ version: versions.tauri }));
  writeFileSync(join(dir, 'src-tauri', 'Cargo.toml'), CARGO(versions.cargo));
  return dir;
}

function cli(dir, args) {
  const output = join(dir, 'github-output.txt');
  writeFileSync(output, '');
  try {
    execFileSync('node', [script, 'resolve', '--root', dir, ...args], {
      env: { ...process.env, GITHUB_OUTPUT: output },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stderr: '', output: readFileSync(output, 'utf8') };
  } catch (error) {
    return { code: error.status, stderr: String(error.stderr), output: readFileSync(output, 'utf8') };
  }
}

test('US-013-01 el CLI escribe version, version_code, prerelease y tag en GITHUB_OUTPUT', () => {
  const dir = fixture({ pkg: '0.2.0', tauri: '0.2.0', cargo: '0.2.0' });
  try {
    const r = cli(dir, ['--event', 'push', '--ref', 'refs/tags/v0.2.0', '--run-number', '3']);
    assert.equal(r.code, 0);
    assert.match(r.output, /^version=0\.2\.0$/m);
    assert.match(r.output, /^version_code=20099$/m);
    assert.match(r.output, /^prerelease=false$/m);
    assert.match(r.output, /^tag=v0\.2\.0$/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('US-013-04 el CLI falla nombrando el fichero si la etiqueta no coincide con el proyecto', () => {
  const dir = fixture({ pkg: '0.0.0', tauri: '0.1.0', cargo: '0.1.0' });
  try {
    const r = cli(dir, ['--event', 'push', '--ref', 'refs/tags/v0.1.0', '--run-number', '3']);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /package\.json/);
    assert.equal(r.output, '', 'no debe escribir salidas si falla');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('US-013-05 el CLI en ejecución manual usa la versión del proyecto y exige que las tres coincidan', () => {
  const ok = fixture({ pkg: '0.1.0', tauri: '0.1.0', cargo: '0.1.0' });
  const bad = fixture({ pkg: '0.1.0', tauri: '0.1.0', cargo: '0.9.0' });
  try {
    const good = cli(ok, ['--event', 'workflow_dispatch', '--ref', 'refs/heads/main', '--run-number', '5']);
    assert.equal(good.code, 0);
    assert.match(good.output, /^version=0\.1\.0-dev\.5$/m);
    assert.match(good.output, /^version_code=10005$/m);
    assert.match(good.output, /^prerelease=true$/m);
    assert.match(good.output, /^tag=$/m);

    const wrong = cli(bad, ['--event', 'workflow_dispatch', '--ref', 'refs/heads/main', '--run-number', '5']);
    assert.notEqual(wrong.code, 0);
    assert.match(wrong.stderr, /Cargo\.toml/);
  } finally {
    rmSync(ok, { recursive: true, force: true });
    rmSync(bad, { recursive: true, force: true });
  }
});

test('US-013-01 el CLI falla con una etiqueta mal formada', () => {
  const dir = fixture({ pkg: '0.1.0', tauri: '0.1.0', cargo: '0.1.0' });
  try {
    const r = cli(dir, ['--event', 'push', '--ref', 'refs/tags/v1.2', '--run-number', '1']);
    assert.notEqual(r.code, 0);
    assert.match(r.stderr, /etiqueta/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
