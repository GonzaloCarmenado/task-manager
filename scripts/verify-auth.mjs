// Verificación REAL (manual) de la sesión anónima contra el proyecto Supabase configurado.
// Uso: pnpm verify:auth   (necesita src/environments/environment.ts con la clave publishable)
// NO corre en CI ni en el pre-commit: crea un usuario anónimo real en el proyecto y gasta límite por IP.
// Solo imprime booleanos. Nunca imprime el token, la clave ni la URL.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Claim `role` de un JWT, decodificado en local. `null` ante cualquier cosa que no sea un JWT válido. */
export function decodeJwtRole(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function readEnvironment() {
  const file = resolve(import.meta.dirname, '..', 'src', 'environments', 'environment.ts');
  const text = readFileSync(file, 'utf8');
  const url = text.match(/supabaseUrl:\s*'([^']*)'/)?.[1] ?? '';
  const key = text.match(/supabaseKey:\s*'([^']*)'/)?.[1] ?? '';
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) {
    throw new Error('src/environments/environment.ts no está configurado (placeholders o vacío).');
  }
  return { url, key };
}

async function main() {
  const { url, key } = readEnvironment();
  const { createClient } = await import('@supabase/supabase-js');
  const store = new Map();
  const client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
      },
    },
  });

  const { data: signIn, error } = await client.auth.signInAnonymously();
  if (error || !signIn.session) {
    console.error(`signInAnonymously falló: ${error?.name ?? 'sin sesión'} (${error?.code ?? error?.status ?? 'sin código'})`);
    console.error('¿Está habilitado el inicio de sesión anónimo en el proyecto? Ver docs/supabase.md.');
    process.exitCode = 1; // sin process.exit(): en Windows deja a Node con un fallo de libuv al cerrar
    return;
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  const sameUid = !userError && userData.user?.id === signIn.session.user.id;
  const isAnonymous = !userError && userData.user?.is_anonymous === true;
  const role = decodeJwtRole(signIn.session.access_token);

  const checks = {
    'el uid de getUser() coincide con el de la sesión': sameUid,
    'is_anonymous = true': isAnonymous,
    'el claim role del access_token es authenticated': role === 'authenticated',
  };
  for (const [label, ok] of Object.entries(checks)) console.log(`${ok ? 'OK ' : 'FALLO'}  ${label}`);
  process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
