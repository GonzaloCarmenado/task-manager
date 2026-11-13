#!/usr/bin/env node
// Revisión cruzada con DeepSeek: un segundo modelo, con contexto limpio y sin acceso al repo
// (el script le manda el contexto), revisa el trabajo antes de seguir. Modos:
//   node scripts/cross-review.mjs spec <specs/NNN-nombre>   revisa spec.md + clarify.md
//   node scripts/cross-review.mjs diff [baseRef]            revisa el diff de la rama (por defecto origin/main)
//   node scripts/cross-review.mjs accept                    acepta los hallazgos del HEAD actual (permite el push)
//   node scripts/cross-review.mjs hook-clarify | hook-push  los llaman los hooks de Claude Code (leen stdin)
// Informes en reports/cross-review/ (ignorada por git). CROSS_REVIEW=0 lo desactiva.
// Proveedor: `opencode run` con el agente de solo lectura .opencode/agents/reviewer.md (lee el repo él
// mismo) o, si no hay opencode (o CROSS_REVIEW_PROVIDER=api), la API de DeepSeek con el contexto en el
// prompt. Ambos usan DEEPSEEK_API_KEY del entorno (nunca en el repo). Opcionales: CROSS_REVIEW_MODEL
// (opencode, `deepseek/deepseek-v4-pro`), CROSS_REVIEW_API_MODEL, DEEPSEEK_BASE_URL, OPENCODE_BIN.
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const OUT_DIR = process.env.CROSS_REVIEW_OUT_DIR ?? join(ROOT, 'reports', 'cross-review');
const SERIOUS = new Set(['alta', 'media']);
const MAX_DIFF_BYTES = 250_000;
const MAX_RUNS_PER_DAY = 20;
const TIMEOUT_MS = 10 * 60 * 1000;
// `CROSS_REVIEW_MODEL` con barra (`proveedor/modelo`) es el modelo de opencode; sin barra es el uso
// antiguo (modelo de la API) y opencode usa el de por defecto.
export function resolveModels(env = process.env) {
  const legacy = env.CROSS_REVIEW_MODEL || '';
  return {
    api:
      env.CROSS_REVIEW_API_MODEL ||
      (legacy && !legacy.includes('/') ? legacy : 'deepseek-reasoner'),
    agent: legacy.includes('/') ? legacy : 'deepseek/deepseek-v4-pro',
  };
}
const { api: API_MODEL, agent: AGENT_MODEL } = resolveModels();
const BASE_URL = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/$/, '');
const MAX_OUTPUT_TOKENS = 16_000;

const SPEC_PROMPT = (
  dir,
  spec,
  clarify
) => `Revisa la especificación de una feature, sin haber visto su implementación.
Tienes aquí abajo ${dir}/spec.md y ${dir}/clarify.md completos; no puedes abrir el repositorio, así que no afirmes nada sobre el código real que no se deduzca de lo que ves (si dudas, dilo como suposición de gravedad baja).
Busca: contradicciones entre spec y clarify, decisiones del clarify que la spec no refleja, criterios P1 que no
se pueden comprobar, casos borde y permisos por rol sin cubrir, y alcance que se escapa a lo que dice «Out of scope».
Devuelve solo hallazgos reales y comprobables con el texto.

===== ${dir}/spec.md =====
${spec}

===== ${dir}/clarify.md =====
${clarify}`;

const DIFF_PROMPT = (
  base,
  files,
  diff
) => `Revisa los cambios de esta rama respecto a ${base} antes de subirlos.
Tienes el diff completo (con contexto ampliado) y la lista de ficheros; no puedes abrir el repositorio, así que limita los hallazgos a lo que se ve en el diff.
Ficheros tocados:
${files}
Busca bugs, fallos de seguridad y permisos, pérdida de datos, reglas de negocio que no se cumplen, migraciones sin
rollback, tests que no prueban lo que dicen o que pasan por casualidad, y código que contradice las reglas de
AGENTS.md. Devuelve solo hallazgos reales y comprobables con el diff.

===== git diff ${base}...HEAD =====
${diff}`;

const AGENT_SPEC_PROMPT = (
  dir
) => `Revisa la especificación de una feature, sin haber visto su implementación.
Lee ${dir}/spec.md y ${dir}/clarify.md (y, si hace falta, el código o los documentos que citen; tienes el repositorio versionado en el directorio actual, en solo lectura).
Busca: contradicciones entre spec y clarify, decisiones del clarify que la spec no refleja, criterios P1 que no
se pueden comprobar, casos borde y permisos por rol sin cubrir, supuestos técnicos falsos respecto al código real,
y alcance que se escapa a lo que dice «Out of scope». Devuelve solo hallazgos reales y comprobados.`;

const AGENT_DIFF_PROMPT = (
  base,
  files
) => `Revisa los cambios de esta rama respecto a ${base} antes de subirlos.
El diff respecto a ${base} está en .review/diff.patch (léelo por partes si es grande) y el repositorio versionado, en solo lectura, en el directorio actual: abre los ficheros completos cuando necesites contexto. No tienes shell ni git.
Ficheros tocados:
${files}
Busca bugs, fallos de seguridad y permisos, pérdida de datos, reglas de negocio que no se cumplen, migraciones sin
rollback, tests que no prueban lo que dicen o que pasan por casualidad, y código que contradice las reglas de
AGENTS.md / CLAUDE.md. Si hay una spec en specs/ para esta rama, comprueba que el código cumple sus criterios P1.
Devuelve solo hallazgos reales y comprobados.`;

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
}

function git(...args) {
  const r = sh('git', args);
  return r.status === 0 ? r.stdout.trim() : null;
}

const pad = (n, len = 2) => String(n).padStart(len, '0');

/** Día en hora local (AAAA-MM-DD); nunca `toISOString()`, que da el día en UTC. */
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayCount() {
  const today = localDay();
  if (!existsSync(OUT_DIR)) return 0;
  return readdirSync(OUT_DIR).filter((f) => f.startsWith(today) && f.endsWith('.json')).length;
}

function stamp() {
  const d = new Date();
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`;
  return `${localDay(d)}T${time}`;
}

function findExisting(label) {
  if (!existsSync(OUT_DIR)) return null;
  const f = readdirSync(OUT_DIR).find(
    (n) => n.includes(label) && n.endsWith('.json') && !n.endsWith('.schema.json')
  );
  if (!f) return null;
  try {
    return {
      result: JSON.parse(readFileSync(join(OUT_DIR, f), 'utf8')),
      file: join(OUT_DIR, f),
      model: 'caché',
    };
  } catch {
    return null;
  }
}

function agentsRules() {
  try {
    return readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
  } catch {
    return '';
  }
}

const OUTPUT_FORMAT = `Responde SOLO con un objeto JSON válido (sin texto antes ni después, sin bloques de código) con esta forma:
{"summary": string, "findings": [{"severity": "alta"|"media"|"baja", "location": string, "title": string, "detail": string}]}
Si no hay nada serio, "findings" va vacío.`;

/** Extrae y valida el JSON de la respuesta del modelo; lanza si no cumple el esquema. */
export function parseReview(text) {
  const raw = String(text ?? '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  const data = JSON.parse(candidate);
  if (typeof data?.summary !== 'string' || !Array.isArray(data.findings))
    throw new Error('faltan summary o findings');
  const findings = data.findings.map((f) => {
    if (!['alta', 'media', 'baja'].includes(f?.severity)) throw new Error('gravedad no válida');
    return {
      severity: f.severity,
      location: String(f.location ?? ''),
      title: String(f.title ?? ''),
      detail: String(f.detail ?? ''),
    };
  });
  return { summary: data.summary, findings };
}

export function opencodeBin(env = process.env, exists = existsSync) {
  if (env.OPENCODE_BIN) return env.OPENCODE_BIN;
  const desktop = join(
    env.LOCALAPPDATA ?? '',
    'Programs',
    'ai.opencode.desktop',
    'resources',
    'opencode-cli.exe'
  );
  return env.LOCALAPPDATA && exists(desktop) ? desktop : 'opencode';
}

/** `opencode` si está disponible y no se fuerza la API; si no, la API de DeepSeek. */
export function pickProvider(env = process.env, available = opencodeAvailable) {
  const forced = env.CROSS_REVIEW_PROVIDER;
  if (forced === 'api' || forced === 'opencode') return forced;
  return available() ? 'opencode' : 'api';
}

function opencodeAvailable() {
  const r = sh(opencodeBin(), ['--version'], { timeout: 30_000 });
  return !r.error && r.status === 0;
}

/** opencode toma su directorio de trabajo de $PWD: hay que fijarlo a la copia temporal. */
export function opencodeEnv(dir, env = process.env) {
  return { ...env, PWD: dir };
}

export function buildOpenCodeArgs(model, promptFile) {
  return [
    'run',
    '--standalone',
    '--agent',
    'reviewer',
    '--model',
    model,
    '--auto',
    `Lee el fichero ${promptFile} y sigue sus instrucciones. Responde solo con el JSON que pide.`,
  ];
}

/** Rutas versionadas que el revisor externo no debe ver (datos de ejemplo, estado local, datos). */
export const SANDBOX_EXCLUDES = ['supabase/.temp', 'supabase/.env', 'supabase/seeds'];
const REVIEW_DIR = '.review';

/**
 * Copia temporal del código para el agente: SOLO lo versionado en HEAD (nada de `src/environments/environment.ts`,
 * `.env`, `reports/`…, que están sin versionar) menos `SANDBOX_EXCLUDES`. El agente trabaja dentro y
 * no tiene shell, así que no puede salir de ahí con una orden ni leer secretos locales.
 * `files` = rutas del árbol de trabajo (aún sin commit) que se copian encima, p. ej. la spec.
 */
export function createSandbox({ files = [], extra = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cross-review-'));
  const archive = sh('git', ['archive', '--format=tar', 'HEAD'], {
    encoding: 'buffer',
    maxBuffer: 512 * 1024 * 1024,
  });
  if (archive.status !== 0) throw new Error('git archive falló');
  const untar = sh('tar', ['-x'], { cwd: dir, input: archive.stdout });
  if (untar.status !== 0) throw new Error(`tar falló: ${untar.stderr}`);
  for (const ex of SANDBOX_EXCLUDES) rmSync(join(dir, ex), { recursive: true, force: true });
  for (const f of files) {
    const src = join(ROOT, f);
    if (!existsSync(src) || !statSync(src).isFile()) continue;
    mkdirSync(join(dir, f, '..'), { recursive: true });
    copyFileSync(src, join(dir, f));
  }
  mkdirSync(join(dir, REVIEW_DIR), { recursive: true });
  for (const [name, content] of Object.entries(extra))
    writeFileSync(join(dir, REVIEW_DIR, name), content);
  const agent = join(ROOT, '.opencode', 'agents', 'reviewer.md');
  mkdirSync(join(dir, '.opencode', 'agents'), { recursive: true });
  copyFileSync(agent, join(dir, '.opencode', 'agents', 'reviewer.md'));
  return dir;
}

function runOpenCode({ prompt, model, label, sandboxFiles = [], extra = {} }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const base = join(OUT_DIR, `${stamp()}-${label}`);
  const outFile = `${base}.json`;
  let dir;
  try {
    dir = createSandbox({
      files: sandboxFiles,
      extra: {
        ...extra,
        'prompt.md': `${prompt}

${OUTPUT_FORMAT}
`,
      },
    });
  } catch (e) {
    return { error: `no se pudo preparar la copia para opencode (${e.message})`, file: outFile };
  }
  try {
    // opencode toma su directorio de trabajo de $PWD (no del cwd real): sin esto vería el repo original
    const r = sh(opencodeBin(), buildOpenCodeArgs(model, `${REVIEW_DIR}/prompt.md`), {
      cwd: dir,
      env: opencodeEnv(dir),
      timeout: TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    });
    if (r.error || r.status !== 0) {
      const why = r.error?.message ?? (r.stderr || r.stdout || '').slice(-600);
      return { error: `opencode no devolvió resultado (${why.trim()})`, file: outFile };
    }
    const result = parseReview(r.stdout);
    writeFileSync(outFile, JSON.stringify(result));
    writeFileSync(`${base}.md`, toMarkdown(label, model, result));
    return { result, file: outFile, model };
  } catch (e) {
    return { error: `Respuesta de opencode no válida: ${e.message}`, file: outFile };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function runDeepSeek({ prompt, model, label }) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { error: 'falta DEEPSEEK_API_KEY en el entorno', file: '' };
  mkdirSync(OUT_DIR, { recursive: true });
  const base = join(OUT_DIR, `${stamp()}-${label}`);
  const outFile = `${base}.json`;
  let content;
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: 'system', content: `${agentsRules()}\n\n${OUTPUT_FORMAT}` },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      return { error: `DeepSeek respondió ${res.status} (${body.trim()})`, file: outFile };
    }
    content = (await res.json()).choices?.[0]?.message?.content;
  } catch (e) {
    return { error: `DeepSeek no devolvió resultado (${e.message})`, file: outFile };
  }
  try {
    const result = parseReview(content);
    writeFileSync(outFile, JSON.stringify(result));
    writeFileSync(`${base}.md`, toMarkdown(label, model, result));
    return { result, file: outFile, model };
  } catch (e) {
    return { error: `Respuesta de DeepSeek no válida: ${e.message}`, file: outFile };
  }
}

function toMarkdown(label, model, { summary, findings }) {
  const lines = [`# Revisión cruzada — ${label}`, '', `Modelo: ${model}`, '', summary, ''];
  for (const f of findings)
    lines.push(`- **[${f.severity}]** ${f.title} — \`${f.location}\`\n  ${f.detail}`);
  if (!findings.length) lines.push('Sin hallazgos.');
  return lines.join('\n');
}

function serious(result) {
  return result.findings.filter((f) => SERIOUS.has(f.severity));
}

function clean(t) {
  return String(t).trim();
}

function render(result, file) {
  const s = serious(result);
  const head = `Revisión cruzada (DeepSeek): ${result.findings.length} hallazgo(s), ${s.length} grave(s) (alta/media).`;
  const body = result.findings
    .map((f) => `- [${f.severity}] ${f.title} (${f.location}): ${clean(f.detail)}`)
    .join('\n');
  return `${head}\n${result.summary}\n${body}\nInforme completo: ${file.replace(/\.json$/, '.md')}`;
}

async function reviewSpec(dir) {
  const spec = join(ROOT, dir, 'spec.md');
  const clarify = join(ROOT, dir, 'clarify.md');
  if (!existsSync(spec) || !existsSync(clarify))
    return { skip: `faltan spec.md o clarify.md en ${dir}` };
  const hash = createHash('sha1')
    .update(readFileSync(spec))
    .update(readFileSync(clarify))
    .digest('hex')
    .slice(0, 10);
  const label = `spec-${dir.split(/[\\/]/).pop()}-${hash}`;
  const cached = findExisting(label);
  if (cached) return cached;
  if (pickProvider() === 'opencode')
    return runOpenCode({
      prompt: AGENT_SPEC_PROMPT(dir),
      model: AGENT_MODEL,
      label,
      sandboxFiles: [`${dir}/spec.md`, `${dir}/clarify.md`],
    });
  return runDeepSeek({
    prompt: SPEC_PROMPT(dir, readFileSync(spec, 'utf8'), readFileSync(clarify, 'utf8')),
    model: API_MODEL,
    label,
  });
}

async function reviewDiff(baseRef = 'origin/main') {
  const head = git('rev-parse', '--short', 'HEAD');
  const files = git('diff', '--name-only', `${baseRef}...HEAD`);
  if (!files) return { skip: 'no hay cambios respecto a ' + baseRef };
  const label = `diff-${head}`;
  const cached = findExisting(label);
  if (cached) return { ...cached, head };
  if (pickProvider() === 'opencode') {
    const patch =
      sh(
        'git',
        [
          'diff',
          '-U15',
          `${baseRef}...HEAD`,
          '--',
          '.',
          ...SANDBOX_EXCLUDES.map((e) => `:(exclude)${e}`),
        ],
        { maxBuffer: 512 * 1024 * 1024 }
      ).stdout ?? '';
    const r = runOpenCode({
      prompt: AGENT_DIFF_PROMPT(baseRef, files),
      model: AGENT_MODEL,
      label,
      extra: { 'diff.patch': patch, 'files.txt': files },
    });
    return { ...r, head };
  }
  const diff =
    sh(
      'git',
      [
        'diff',
        '-U15',
        `${baseRef}...HEAD`,
        '--',
        '.',
        ...SANDBOX_EXCLUDES.map((e) => `:(exclude)${e}`),
      ],
      { maxBuffer: 512 * 1024 * 1024 }
    ).stdout ?? '';
  const size = Buffer.byteLength(diff);
  if (size > MAX_DIFF_BYTES)
    return { skip: `diff demasiado grande (${size} bytes > ${MAX_DIFF_BYTES}); revisa a mano` };
  const r = await runDeepSeek({
    prompt: DIFF_PROMPT(baseRef, files, diff),
    model: API_MODEL,
    label,
  });
  return { ...r, head };
}

function acceptFile(head) {
  return join(OUT_DIR, `accepted-${head}`);
}

function readHook() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function cycleIsSimple(specDir) {
  try {
    return /\*\*Ciclo\*\*:\s*simple/i.test(readFileSync(join(ROOT, specDir, 'spec.md'), 'utf8'));
  } catch {
    return false;
  }
}

function branchSpecDir() {
  const num = (git('branch', '--show-current') ?? '').match(/(?:^|\/)(\d{3})-/)?.[1];
  if (!num) return null;
  const dir = readdirSync(join(ROOT, 'specs')).find((d) => d.startsWith(num + '-'));
  return dir ? 'specs/' + dir : null;
}

function guard() {
  if (process.env.CROSS_REVIEW === '0') return 'CROSS_REVIEW=0';
  if (dayCount() >= MAX_RUNS_PER_DAY)
    return `límite diario de ${MAX_RUNS_PER_DAY} revisiones alcanzado`;
  return null;
}

async function hookClarify() {
  const input = readHook();
  const file = String(input.tool_input?.file_path ?? '').replace(/\\/g, '/');
  const m = file.match(/(specs\/[^/]+)\/clarify\.md$/);
  if (!m || m[1].endsWith('_TEMPLATE') || guard() || cycleIsSimple(m[1])) return;
  if (!/Estado\**:?\**\s*CERRADO/i.test(readFileSync(file, 'utf8'))) return;
  const r = await reviewSpec(m[1]);
  if (r.skip) return;
  if (r.error) {
    emit({ systemMessage: `Revisión cruzada no disponible: ${r.error}` });
    return;
  }
  const s = serious(r.result);
  const text = render(r.result, r.file);
  if (s.length) {
    emit({
      systemMessage: `DeepSeek ha encontrado ${s.length} problema(s) grave(s) en la spec.`,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `${text}\n\nINSTRUCCIÓN: PARA aquí. No continúes con /sdd-plan. Resume estos hallazgos al usuario, di cuáles te parecen válidos y cuáles no, y espera su decisión. Anota lo relevante en el review.md de la spec.`,
      },
    });
  } else {
    emit({
      systemMessage: 'Revisión cruzada de la spec (DeepSeek): sin hallazgos graves.',
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text },
    });
  }
}

async function hookPush() {
  const input = readHook();
  const cmd = String(input.tool_input?.command ?? '');
  if (!/\bgit\s+push\b/.test(cmd) || /--delete|\s:\S+/.test(cmd) || guard()) return;
  const sd = branchSpecDir();
  if (sd && cycleIsSimple(sd)) return;
  const head = git('rev-parse', '--short', 'HEAD');
  if (head && existsSync(acceptFile(head))) return;
  const r = await reviewDiff();
  if (r.skip) return;
  if (r.error) {
    emit({ systemMessage: `Revisión cruzada no disponible (el push sigue): ${r.error}` });
    return;
  }
  const s = serious(r.result);
  if (!s.length) {
    emit({ systemMessage: `Revisión cruzada (DeepSeek, ${r.model}): sin hallazgos graves.` });
    return;
  }
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `${render(r.result, r.file)}\n\nINSTRUCCIÓN: no hagas el push. Resume estos hallazgos al usuario, di cuáles te parecen válidos y espera su decisión. Si decide subir igualmente, ejecuta \`node scripts/cross-review.mjs accept\` y repite el push.`,
    },
  });
}

async function main() {
  const [mode, arg] = process.argv.slice(2);
  if (mode === 'spec' || mode === 'diff') {
    const why = guard();
    if (why) {
      console.log(`Revisión cruzada omitida: ${why}`);
      process.exit(0);
    }
    const r = mode === 'spec' ? await reviewSpec(arg ?? '') : await reviewDiff(arg);
    if (r.skip) console.log(`Revisión cruzada omitida: ${r.skip}`);
    else if (r.error) {
      console.error(r.error);
      process.exit(1);
    } else {
      console.log(render(r.result, r.file));
      process.exit(serious(r.result).length ? 3 : 0);
    }
  } else if (mode === 'accept') {
    mkdirSync(OUT_DIR, { recursive: true });
    const head = git('rev-parse', '--short', 'HEAD');
    writeFileSync(acceptFile(head), new Date().toISOString());
    console.log(`Hallazgos aceptados para ${head}: el push ya no se bloquea.`);
  } else if (mode === 'hook-clarify') await hookClarify();
  else if (mode === 'hook-push') await hookPush();
  else {
    console.error(
      'Uso: cross-review.mjs spec <dir> | diff [base] | accept | hook-clarify | hook-push'
    );
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
