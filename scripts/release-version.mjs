// Spec 013: de una etiqueta `vMAYOR.MENOR.PARCHE[-sufijo]` saca la versión de la app y comprueba que el proyecto coincide.
//
// Uso en el flujo de publicación:
//   node scripts/release-version.mjs resolve --event push|workflow_dispatch --ref <ref> --run-number <n> [--root <dir>]
// Escribe `version`, `version_code`, `prerelease` y `tag` en $GITHUB_OUTPUT (o en la salida estándar si no existe).
// Falla (código 1, mensaje en la salida de errores) si la etiqueta no es válida o si `package.json`,
// `src-tauri/tauri.conf.json` y `src-tauri/Cargo.toml` no coinciden. No escribe nada si falla.
import { appendFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX = 99;
const FINAL_STAGE = 99;
const MAX_PRERELEASE_STAGE = 98;

/** @typedef {{ major: number, minor: number, patch: number, pre: string | null }} Tag */
/** @typedef {{ tag: string, version: string, versionCode: number, prerelease: boolean }} Release */

/**
 * `v0.3.0` o `v0.3.0-rc.1` → partes. Lanza si no es vMAYOR.MENOR.PARCHE[-sufijo] o si algún número supera 99.
 * @param {string} tag
 * @returns {Tag}
 */
export function parseTag(tag) {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?$/.exec(tag);
  if (!match) {
    throw new Error(`La etiqueta «${tag}» no tiene la forma vMAYOR.MENOR.PARCHE[-sufijo] (por ejemplo v0.2.0 o v0.3.0-rc.1).`);
  }
  const [major, minor, patch] = [match[1], match[2], match[3]].map(Number);
  for (const [name, value] of [['MAYOR', major], ['MENOR', minor], ['PARCHE', patch]]) {
    if (value > MAX) throw new Error(`La etiqueta «${tag}» no es válida: ${name} no puede pasar de ${MAX} (versionCode de Android).`);
  }
  return { major, minor, patch, pre: match[4] ?? null };
}

const base = ({ major, minor, patch }) => major * 10000 + minor * 100 + patch;

/**
 * Etapa dentro del número de versión: 99 para la final; el número de «-rc.N» (1 a 98) para una previa;
 * 0 si el sufijo no termina en número. Así `0.3.0-rc.1` < `0.3.0` < `0.3.1`.
 * @param {string | null} pre
 */
function stageOf(pre) {
  if (pre === null) return FINAL_STAGE;
  const number = /(\d+)$/.exec(pre);
  if (!number) return 0;
  const n = Number(number[1]);
  if (n > MAX_PRERELEASE_STAGE) {
    throw new Error(`El número del sufijo «${pre}» no puede pasar de ${MAX_PRERELEASE_STAGE} (chocaría con la versión final).`);
  }
  return n;
}

/**
 * versionName = etiqueta sin la «v»; versionCode = (MAYOR*10000 + MENOR*100 + PARCHE)*100 + etapa.
 * @param {string} tag
 * @returns {Release}
 */
export function releaseOf(tag) {
  const parts = parseTag(tag);
  return {
    tag,
    version: tag.slice(1),
    versionCode: base(parts) * 100 + stageOf(parts.pre),
    prerelease: parts.pre !== null,
  };
}

/** «0.3.0» de un `package.json`/`tauri.conf.json`/`Cargo.toml` (solo la parte MAYOR.MENOR.PARCHE). */
const core = (version) => String(version ?? '').split(/[-+]/)[0];

/** Primera `version = "…"` de la sección `[package]` de un Cargo.toml. */
export function cargoVersion(cargoToml) {
  const section = /\[package\]([\s\S]*?)(?:\n\[|$)/.exec(cargoToml)?.[1] ?? '';
  return /^\s*version\s*=\s*"([^"]*)"/m.exec(section)?.[1] ?? null;
}

/**
 * Diferencias (vacío = coherente) entre la versión de la etiqueta y las tres del proyecto. Se compara MAYOR.MENOR.PARCHE.
 * @param {{ version: string }} release
 * @param {{ packageJson: { version?: string }, tauriConf: { version?: string }, cargoToml: string }} project
 * @returns {string[]}
 */
export function versionMismatches(release, project) {
  const expected = core(release.version);
  const found = [];
  const check = (file, actual) => {
    if (core(actual) !== expected) {
      found.push(`${file}: versión ${actual ?? '(sin versión)'}, pero la etiqueta es ${expected}.`);
    }
  };
  check('package.json', project.packageJson?.version);
  check('src-tauri/tauri.conf.json', project.tauriConf?.version);
  check('src-tauri/Cargo.toml', cargoVersion(project.cargoToml ?? ''));
  return found;
}

/**
 * Qué versión se publica según el evento: un push de etiqueta usa la etiqueta; la ejecución manual usa
 * `X.Y.Z-dev.N` (siempre menor que la final y marcada como previa, sin etiqueta).
 * @param {{ event: string, ref: string, runNumber: string | number, projectVersion: string }} input
 * @returns {Release}
 */
export function resolveRelease({ event, ref, runNumber, projectVersion }) {
  if (event === 'push') {
    const match = /^refs\/tags\/(.+)$/.exec(ref);
    if (!match) throw new Error(`La referencia «${ref}» no es una etiqueta: la publicación solo se lanza al crear una etiqueta vX.Y.Z.`);
    return releaseOf(match[1]);
  }
  if (event === 'workflow_dispatch') {
    const final = releaseOf(`v${core(projectVersion)}`);
    const stage = Math.min(Math.max(Number(runNumber) || 0, 0), MAX_PRERELEASE_STAGE);
    return {
      tag: '',
      version: `${core(projectVersion)}-dev.${Number(runNumber) || 0}`,
      versionCode: final.versionCode - FINAL_STAGE + stage,
      prerelease: true,
    };
  }
  throw new Error(`Evento «${event}» no admitido: solo push de etiqueta o ejecución manual.`);
}

function readProject(root) {
  const json = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
  return {
    packageJson: json('package.json'),
    tauriConf: json('src-tauri/tauri.conf.json'),
    cargoToml: readFileSync(join(root, 'src-tauri/Cargo.toml'), 'utf8'),
  };
}

function option(args, name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function main(args) {
  if (args[0] !== 'resolve') throw new Error('Uso: release-version.mjs resolve --event <evento> --ref <ref> --run-number <n> [--root <dir>]');
  const root = resolve(option(args, 'root') ?? join(import.meta.dirname, '..'));
  const project = readProject(root);
  const release = resolveRelease({
    event: option(args, 'event') ?? '',
    ref: option(args, 'ref') ?? '',
    runNumber: option(args, 'run-number') ?? '0',
    projectVersion: project.packageJson.version ?? '',
  });
  const problems = versionMismatches(release, project);
  if (problems.length > 0) {
    throw new Error(`Las versiones del proyecto no coinciden con ${release.tag || release.version}:\n- ${problems.join('\n- ')}`);
  }
  const lines = [
    `version=${release.version}`,
    `version_code=${release.versionCode}`,
    `prerelease=${release.prerelease}`,
    `tag=${release.tag}`,
  ].join('\n');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
  else console.log(lines);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Error desconocido');
    process.exitCode = 1;
  }
}
