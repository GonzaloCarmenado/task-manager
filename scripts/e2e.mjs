// Lanza la app con la configuración `e2e` (entorno ficticio, puerto 4300) y ejecuta Cypress contra ella.
// Uso: pnpm e2e [-- --spec cypress/e2e/tareas.cy.ts]   ·   pnpm e2e:open para el modo interactivo.
// No toca ningún Supabase real: la red se simula en cypress/support/backend.ts.
import { spawn, spawnSync } from 'node:child_process';

const PORT = 4300;
const open = process.argv.includes('--open');
const extra = process.argv.slice(2).filter((a) => a !== '--open');
const shell = process.platform === 'win32';

const server = spawn('pnpm', ['exec', 'ng', 'serve', '--configuration', 'e2e', '--port', String(PORT)], {
  stdio: 'ignore',
  shell,
});

function stopServer() {
  if (server.pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    server.kill('SIGTERM');
  }
}

async function waitForServer() {
  for (let i = 0; i < 180; i += 1) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return;
    } catch {
      /* aún no está listo */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('El servidor de la app no arrancó a tiempo.');
}

let code = 1;
try {
  await waitForServer();
  const result = spawnSync('pnpm', ['exec', 'cypress', open ? 'open' : 'run', '--e2e', ...extra], {
    stdio: 'inherit',
    shell,
  });
  code = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'e2e falló');
} finally {
  stopServer();
}
process.exit(code);
