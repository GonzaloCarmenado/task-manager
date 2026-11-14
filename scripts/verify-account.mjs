// Verificación REAL (manual) de la cuenta de usuario contra el proyecto Supabase configurado (spec 011).
// Uso: pnpm verify:account   (necesita environment.ts y la migración `account` aplicada)
// NO corre en CI ni en el pre-commit: crea y borra una cuenta de prueba real con nombre aleatorio.
// Solo imprime booleanos. Nunca imprime tokens, claves, URL, nombres ni contraseñas.
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DOMAIN = 'cuenta.invalid';

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

function memoryClient(createClient, url, key) {
  const store = new Map();
  return createClient(url, key, {
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
}

async function main() {
  const { url, key } = readEnvironment();
  const { createClient } = await import('@supabase/supabase-js');
  const suffix = randomBytes(4).toString('hex');
  const name = `verif_${suffix}`;
  const renamed = `verif_${suffix}_b`;
  const password = `P${randomBytes(9).toString('hex')}`;
  const newPassword = `N${randomBytes(9).toString('hex')}`;
  const checks = {};
  const record = (label, ok) => {
    checks[label] = ok === true;
    console.log(`${ok === true ? 'OK ' : 'FALLO'}  ${label}`);
  };

  const phone = memoryClient(createClient, url, key);
  const { data: anon, error: anonError } = await phone.auth.signInAnonymously();
  if (anonError || !anon.session) {
    console.error('signInAnonymously falló: ¿está habilitado el inicio anónimo?');
    process.exitCode = 1;
    return;
  }
  const uid = anon.session.user.id;

  const link = await phone.auth.updateUser({ email: `${name}@${DOMAIN}`, password });
  record('vincular la sesión anónima con un identificador interno sin verificar', !link.error && link.data.user?.is_anonymous === false);
  record('el identificador queda confirmado (sin cambio pendiente)', link.data?.user?.email === `${name}@${DOMAIN}` && !link.data.user.new_email);
  record('el user_id se conserva al vincular', link.data?.user?.id === uid);
  if (!link.data?.user || link.error) {
    console.error('No se pudo vincular: revisa en el panel que «Confirm email» esté desactivado.');
    process.exitCode = 1;
    return;
  }

  const other = memoryClient(createClient, url, key);
  const login = await other.auth.signInWithPassword({ email: `${name}@${DOMAIN}`, password });
  record('iniciar sesión en otro móvil con usuario y contraseña', !login.error && login.data.user?.id === uid);

  const dup = await memoryClient(createClient, url, key).auth.signUp({ email: `${name}@${DOMAIN}`, password });
  record('un nombre ya usado no se puede registrar de nuevo', Boolean(dup.error) || dup.data?.user?.identities?.length === 0);

  const rename = await phone.auth.updateUser({ email: `${renamed}@${DOMAIN}` });
  record('cambiar el nombre de usuario sin verificación', !rename.error && rename.data.user?.email === `${renamed}@${DOMAIN}` && !rename.data.user.new_email);

  const change = await phone.auth.updateUser({ password: newPassword });
  record('cambiar la contraseña', !change.error);

  const stale = await memoryClient(createClient, url, key).auth.signInWithPassword({ email: `${renamed}@${DOMAIN}`, password });
  record('la contraseña antigua deja de valer', Boolean(stale.error));
  const fresh = await memoryClient(createClient, url, key).auth.signInWithPassword({ email: `${renamed}@${DOMAIN}`, password: newPassword });
  record('la nueva contraseña con el nuevo nombre entra', !fresh.error && fresh.data.user?.id === uid);

  const del = await phone.rpc('delete_my_account');
  record('delete_my_account borra la cuenta', !del.error);
  const gone = await memoryClient(createClient, url, key).auth.signInWithPassword({ email: `${renamed}@${DOMAIN}`, password: newPassword });
  record('la cuenta borrada ya no entra', Boolean(gone.error));

  const anonCaller = memoryClient(createClient, url, key);
  await anonCaller.auth.signInAnonymously();
  const denied = await anonCaller.rpc('delete_my_account');
  record('una sesión anónima no puede borrar cuentas', Boolean(denied.error));

  process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
