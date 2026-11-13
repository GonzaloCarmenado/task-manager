// Verificación MANUAL de los supuestos sobre `supabase-js` en los que se apoya la spec 003.
// Uso: pnpm verify:supabase   (tarda ~30 s; no necesita red ni claves reales; no corre en CI)
// Ejecútala siempre que se actualice `@supabase/supabase-js`: si algún supuesto cambia, la spec
// y `AuthAccessService` deben revisarse. Todo es local: almacenamiento y red simulados.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const constants = createRequire(require.resolve('@supabase/supabase-js'))(
  '@supabase/auth-js/dist/main/lib/constants.js'
);

const results = [];
const check = (label, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'OK   ' : 'FALLO'}  ${label}${detail ? ` — ${detail}` : ''}`);
};

const KEY = 'sb-abcdefghijklmnopqrst-auth-token';
const URL = 'https://abcdefghijklmnopqrst.supabase.co';

function expiredSession() {
  return JSON.stringify({
    access_token: 'aaa.bbb.ccc', // secrets:allow
    refresh_token: 'refresh-ficticio', // secrets:allow
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) - 1000, // caducado
    user: { id: '00000000-0000-0000-0000-000000000001', is_anonymous: true, aud: 'authenticated' },
  });
}

function makeClient(fetchImpl) {
  const store = new Map([[KEY, expiredSession()]]);
  const events = [];
  const client = createClient(URL, 'clave-ficticia', {
    // secrets:allow
    auth: {
      storage: {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => store.set(k, v),
        removeItem: (k) => store.delete(k),
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: { fetch: fetchImpl },
  });
  client.auth.onAuthStateChange((event, session) => events.push({ event, hasSession: !!session }));
  return { client, store, events };
}

// 1) Constantes del refresco automático
check('ciclo de refresco automático = 30 s', constants.AUTO_REFRESH_TICK_DURATION_MS === 30_000);
check('umbral de refresco = 3 ciclos', constants.AUTO_REFRESH_TICK_THRESHOLD === 3);
check('enfriamiento tras un fallo de refresco = 60 s', constants.REFRESH_FAILURE_COOLDOWN_MS === 60_000);

// 2) Un rechazo definitivo retira la sesión y emite SIGNED_OUT
{
  const rejecting = async () =>
    new Response(
      JSON.stringify({ code: 400, error_code: 'refresh_token_not_found', msg: 'Refresh Token Not Found' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  const { client, store, events } = makeClient(rejecting);
  const { data } = await client.auth.getSession();
  await client.auth.stopAutoRefresh();
  check('rechazo definitivo: getSession() devuelve sin sesión', data.session === null);
  check('rechazo definitivo: la librería retira la sesión guardada', !store.has(KEY));
  check('rechazo definitivo: se emite SIGNED_OUT', events.some((e) => e.event === 'SIGNED_OUT'));
}

// 3) Arranque sin red con token caducado: tarda y devuelve null, pero conserva la sesión
{
  let calls = 0;
  const offline = async () => {
    calls++;
    throw new TypeError('Failed to fetch');
  };
  const { client, store } = makeClient(offline);
  const started = Date.now();
  const { data, error } = await client.auth.getSession();
  const seconds = (Date.now() - started) / 1000;
  await client.auth.stopAutoRefresh();
  check('sin red y token caducado: getSession() devuelve sin sesión', data.session === null);
  check('sin red y token caducado: el error es reintentable', error?.name === 'AuthRetryableFetchError');
  check('sin red y token caducado: la sesión guardada se conserva', store.has(KEY));
  check(
    'sin red y token caducado: getSession() NO es instantáneo (por eso se lee el almacenamiento directamente)',
    seconds >= 5,
    `${seconds.toFixed(1)} s, ${calls} intentos de red`
  );
}

const failed = results.filter((ok) => !ok).length;
console.log(failed === 0 ? '\nTodos los supuestos siguen siendo ciertos.' : `\n${failed} supuesto(s) han cambiado: revisar la spec 003 y AuthAccessService.`);
process.exit(failed === 0 ? 0 : 1);
