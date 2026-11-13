import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import {
  SANDBOX_EXCLUDES,
  buildOpenCodeArgs,
  createSandbox,
  resolveModels,
  opencodeBin,
  opencodeEnv,
  parseReview,
  pickProvider,
} from './cross-review.mjs';

const GOOD = {
  summary: 'Resumen',
  findings: [{ severity: 'alta', location: 'a.ts:1', title: 'T', detail: 'D' }],
};

test('parseReview acepta JSON limpio y JSON dentro de un bloque de código', () => {
  assert.deepEqual(parseReview(JSON.stringify(GOOD)), GOOD);
  assert.deepEqual(parseReview('```json\n' + JSON.stringify(GOOD) + '\n```'), GOOD);
  assert.deepEqual(parseReview('Aquí va:\n' + JSON.stringify(GOOD) + '\nfin'), GOOD);
});

test('parseReview rechaza lo que no cumple el esquema', () => {
  assert.throws(() => parseReview('no es json'));
  assert.throws(() => parseReview('{"summary":"x"}'), /summary|findings/);
  assert.throws(() => parseReview('{"summary":"x","findings":[{"severity":"grave"}]}'), /gravedad/);
});

const runCli = (args, env) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/cross-review.mjs', ...args], {
      env: { ...process.env, ...env },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => resolve({ code, out, err }));
  });

const withServer = async (handler, fn) => {
  const server = createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
};

test('sin DEEPSEEK_API_KEY avisa y no llama a nadie', async () => {
  const out = mkdtempSync(join(tmpdir(), 'cross-out-'));
  const r = await runCli(['spec', 'specs/_TEMPLATE'], {
    CROSS_REVIEW_PROVIDER: 'api',
    CROSS_REVIEW_API_MODEL: '',
    DEEPSEEK_API_KEY: '',
    CROSS_REVIEW_OUT_DIR: out,
  });
  assert.equal(r.code, 1);
  assert.match(r.err, /DEEPSEEK_API_KEY/);
});

test('con la API simulada: manda clave, modelo y contexto, y devuelve el informe con hallazgos graves', async () => {
  const out = mkdtempSync(join(tmpdir(), 'cross-out-'));
  let request;
  await withServer(
    (req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        request = { auth: req.headers.authorization, url: req.url, body: JSON.parse(body) };
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            choices: [{ message: { content: '```json\n' + JSON.stringify(GOOD) + '\n```' } }],
          })
        );
      });
    },
    async (base) => {
      const r = await runCli(['spec', 'specs/_TEMPLATE'], {
        CROSS_REVIEW_PROVIDER: 'api',
        CROSS_REVIEW_API_MODEL: '',
        DEEPSEEK_API_KEY: 'clave-de-prueba', // secrets:allow (valor ficticio de test)
        DEEPSEEK_BASE_URL: base,
        CROSS_REVIEW_OUT_DIR: out,
      });
      assert.equal(r.code, 3, r.err);
      assert.match(r.out, /1 grave/);
      assert.match(r.out, /\[alta\] T/);
    }
  );
  assert.equal(request.url, '/chat/completions');
  assert.equal(request.auth, 'Bearer clave-de-prueba');
  assert.equal(request.body.model, 'deepseek-reasoner');
  assert.equal(request.body.messages[0].role, 'system');
  assert.match(request.body.messages[1].content, /spec\.md/);
  assert.ok(readdirSync(out).some((f) => f.endsWith('.md')));
});

test('un error HTTP de la API se informa sin romper', async () => {
  const out = mkdtempSync(join(tmpdir(), 'cross-out-'));
  await withServer(
    (_req, res) => {
      res.statusCode = 401;
      res.end('Authentication Fails');
    },
    async (base) => {
      const r = await runCli(['spec', 'specs/_TEMPLATE'], {
        CROSS_REVIEW_PROVIDER: 'api',
        CROSS_REVIEW_API_MODEL: '',
        DEEPSEEK_API_KEY: 'mala', // secrets:allow (valor ficticio de test)
        DEEPSEEK_BASE_URL: base,
        CROSS_REVIEW_OUT_DIR: out,
      });
      assert.equal(r.code, 1);
      assert.match(r.err, /401/);
    }
  );
});

test('una respuesta que no es JSON válido se informa como no válida', async () => {
  const out = mkdtempSync(join(tmpdir(), 'cross-out-'));
  await withServer(
    (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: 'lo siento' } }] }));
    },
    async (base) => {
      const r = await runCli(['spec', 'specs/_TEMPLATE'], {
        CROSS_REVIEW_PROVIDER: 'api',
        CROSS_REVIEW_API_MODEL: '',
        DEEPSEEK_API_KEY: 'k', // secrets:allow (valor ficticio de test)
        DEEPSEEK_BASE_URL: base,
        CROSS_REVIEW_OUT_DIR: out,
      });
      assert.equal(r.code, 1);
      assert.match(r.err, /no válida/);
    }
  );
});

test('pickProvider: opencode si está disponible, API si no, y CROSS_REVIEW_PROVIDER manda', () => {
  assert.equal(
    pickProvider({}, () => true),
    'opencode'
  );
  assert.equal(
    pickProvider({}, () => false),
    'api'
  );
  assert.equal(
    pickProvider({ CROSS_REVIEW_PROVIDER: 'api' }, () => true),
    'api'
  );
  assert.equal(
    pickProvider({ CROSS_REVIEW_PROVIDER: 'opencode' }, () => false),
    'opencode'
  );
  assert.equal(
    pickProvider({ CROSS_REVIEW_PROVIDER: 'otro' }, () => true),
    'opencode'
  );
});

test('opencodeBin: OPENCODE_BIN, el CLI de la app de escritorio o `opencode`', () => {
  assert.equal(
    opencodeBin({ OPENCODE_BIN: 'x' }, () => false),
    'x'
  );
  assert.match(
    opencodeBin({ LOCALAPPDATA: 'C:/L' }, () => true),
    /opencode-cli\.exe$/
  );
  assert.equal(
    opencodeBin({ LOCALAPPDATA: 'C:/L' }, () => false),
    'opencode'
  );
  assert.equal(
    opencodeBin({}, () => true),
    'opencode'
  );
});

test('buildOpenCodeArgs: agente de solo lectura, modo autónomo y el prompt por fichero', () => {
  const args = buildOpenCodeArgs('deepseek/deepseek-v4-pro', 'reports/x.prompt.md');
  assert.deepEqual(args.slice(0, 7), [
    'run',
    '--standalone',
    '--agent',
    'reviewer',
    '--model',
    'deepseek/deepseek-v4-pro',
    '--auto',
  ]);
  assert.match(args[7], /reports\/x\.prompt\.md/);
});

test('createSandbox: solo lo versionado, sin rutas sensibles, con el agente y los ficheros extra', () => {
  const dir = createSandbox({ extra: { 'diff.patch': 'parche' } });
  try {
    assert.ok(existsSync(join(dir, 'package.json')));
    assert.ok(existsSync(join(dir, 'AGENTS.md')));
    // sin versionar o excluido: nunca entra
    assert.equal(existsSync(join(dir, 'src', 'environments', 'environment.ts')), false);
    assert.equal(existsSync(join(dir, 'reports')), false);
    for (const ex of SANDBOX_EXCLUDES) assert.equal(existsSync(join(dir, ex)), false, ex);
    assert.equal(readFileSync(join(dir, '.review', 'diff.patch'), 'utf8'), 'parche');
    const agent = readFileSync(join(dir, '.opencode', 'agents', 'reviewer.md'), 'utf8');
    assert.match(agent, /effect: deny/);
    assert.doesNotMatch(agent, /action: shell/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('createSandbox: ignora directorios en files y copia los ficheros sin versionar pedidos', () => {
  const dir = createSandbox({
    files: ['specs/002-supabase-setup', 'specs/002-supabase-setup/spec.md', 'no/existe.md'],
  });
  try {
    assert.ok(existsSync(join(dir, 'specs', '002-supabase-setup', 'spec.md')));
    assert.equal(existsSync(join(dir, 'no')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('resolveModels: formato proveedor/modelo para opencode; sin barra es el uso antiguo de la API', () => {
  assert.deepEqual(resolveModels({}), {
    api: 'deepseek-reasoner',
    agent: 'deepseek/deepseek-v4-pro',
  });
  assert.deepEqual(resolveModels({ CROSS_REVIEW_MODEL: 'deepseek/deepseek-flash' }), {
    api: 'deepseek-reasoner',
    agent: 'deepseek/deepseek-flash',
  });
  assert.deepEqual(resolveModels({ CROSS_REVIEW_MODEL: 'deepseek-chat' }), {
    api: 'deepseek-chat',
    agent: 'deepseek/deepseek-v4-pro',
  });
  assert.equal(
    resolveModels({ CROSS_REVIEW_MODEL: 'deepseek-chat', CROSS_REVIEW_API_MODEL: 'x' }).api,
    'x'
  );
});

test('opencodeEnv fija PWD a la copia temporal (si no, opencode leería el repo original)', () => {
  const env = opencodeEnv('/tmp/copia', { PWD: '/repo/real', OTRA: 'x' });
  assert.equal(env.PWD, '/tmp/copia');
  assert.equal(env.OTRA, 'x');
});

test('hook-clarify ignora las plantillas (specs/_TEMPLATE) y no lanza ninguna revisión', async () => {
  const child = spawn(process.execPath, ['scripts/cross-review.mjs', 'hook-clarify'], {
    env: { ...process.env, CROSS_REVIEW_PROVIDER: 'api', DEEPSEEK_API_KEY: '' },
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stdin.end(JSON.stringify({ tool_input: { file_path: 'specs/_TEMPLATE/clarify.md' } }));
  await new Promise((r) => child.on('close', r));
  assert.equal(out, '');
});

test('localDay usa el día local (no UTC), aunque la hora local ya sea otro día en UTC', async () => {
  const { localDay } = await import('./cross-review.mjs');
  assert.equal(typeof localDay, 'function');
  // 00:30 hora local del 5 de enero: en zonas UTC+ sigue siendo el día 4 en UTC
  assert.equal(localDay(new Date(2026, 0, 5, 0, 30)), '2026-01-05');
  assert.equal(localDay(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  assert.equal(localDay(new Date(2026, 8, 3, 12, 0)), '2026-09-03');
});
