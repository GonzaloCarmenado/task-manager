// Verificación REAL (manual) del progreso (spec 008) contra el proyecto Supabase configurado.
// Uso: pnpm verify:progress   (necesita src/environments/environment.ts y las migraciones aplicadas)
// NO corre en CI ni en el pre-commit: crea dos usuarios anónimos reales y tareas de prueba que borra al terminar.
// Solo imprime nombres de comprobación y OK/FALLO. Nunca imprime tokens, claves, URL ni ids.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

const results = [];
function check(name, passed) {
  results.push({ name, passed });
  console.log(`${passed ? 'OK   ' : 'FALLO'} ${name}`);
}

const dayOffset = (offset) => {
  const d = new Date(2026, 5, 15 + offset, 12);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function main() {
  const { url, key } = readEnvironment();
  const { createClient } = await import('@supabase/supabase-js');

  const a = memoryClient(createClient, url, key);
  const b = memoryClient(createClient, url, key);
  const [signA, signB] = await Promise.all([a.auth.signInAnonymously(), b.auth.signInAnonymously()]);
  if (signA.error || signB.error || !signA.data.session || !signB.data.session) {
    console.error('No se pudieron crear las dos sesiones anónimas (¿límite por IP o registro anónimo deshabilitado?).');
    process.exitCode = 1;
    return;
  }

  const progress = async (client, today) => {
    const { data, error } = await client.rpc('get_progress', { p_today: today });
    return error ? null : data;
  };
  const create = async (client, title) => {
    const { data, error } = await client.from('tasks').insert({ title }).select().single();
    if (error) throw new Error('no se pudo crear una tarea de prueba');
    return data.id;
  };
  const complete = (client, id, day) =>
    client
      .from('tasks')
      .update({ completed_at: new Date(2026, 5, 15, 12).toISOString(), completed_day: day })
      .eq('id', id)
      .select()
      .single();
  const uncomplete = (client, id) =>
    client.from('tasks').update({ completed_at: null, completed_day: null }).eq('id', id).select().single();

  const D0 = dayOffset(0);

  try {
    const t1 = await create(a, 'Prueba XP 1');
    const done1 = await complete(a, t1, D0);
    check('Completar da 10 XP a la tarea', !done1.error && done1.data?.xp_awarded === 10);
    let p = await progress(a, D0);
    check('El XP total sube a 10 y el de hoy también', p?.total_xp === 10 && p?.xp_today === 10);
    check('La racha actual es de 1 día y la mejor también', p?.current_streak === 1 && p?.best_streak === 1);

    const undo1 = await uncomplete(a, t1);
    check('Desmarcar quita los XP y el día', !undo1.error && undo1.data?.xp_awarded === 0 && undo1.data?.completed_day === null);
    p = await progress(a, D0);
    check('Tras desmarcar el XP vuelve a 0 y la racha a 0', p?.total_xp === 0 && p?.xp_today === 0 && p?.current_streak === 0);
    check('La mejor racha no baja al desmarcar', p?.best_streak === 1);

    await complete(a, t1, D0);
    p = await progress(a, D0);
    check('Volver a completar da los XP otra vez (sin bucle infinito)', p?.total_xp === 10);
    for (let i = 0; i < 3; i += 1) {
      await uncomplete(a, t1);
      await complete(a, t1, D0);
    }
    p = await progress(a, D0);
    check('Completar y desmarcar en bucle no genera XP', p?.total_xp === 10);

    // Tope diario: 9 tareas más ⇒ 100 XP; la siguiente da 0.
    const ids = [];
    for (let i = 0; i < 9; i += 1) {
      const id = await create(a, `Prueba tope ${i}`);
      ids.push(id);
      await complete(a, id, D0);
    }
    p = await progress(a, D0);
    check('Diez tareas en el día suman 100 XP', p?.total_xp === 100 && p?.xp_today === 100);
    const extra = await create(a, 'Prueba tope extra');
    const extraDone = await complete(a, extra, D0);
    check('Pasado el tope la tarea se completa pero da 0 XP', !extraDone.error && extraDone.data?.xp_awarded === 0);
    p = await progress(a, D0);
    check('El XP del día no pasa de 100', p?.xp_today === 100 && p?.total_xp === 100);
    await uncomplete(a, extra);
    p = await progress(a, D0);
    check('Desmarcar una tarea sin XP quita 0', p?.total_xp === 100);

    // El XP se quita en el día en que se concedió.
    await uncomplete(a, ids[0]);
    p = await progress(a, D0);
    check('Desmarcar una con XP resta 10 de ese día', p?.total_xp === 90 && p?.xp_today === 90);

    // Racha de 3 días y rotura al desmarcar el único de un día.
    const dPrev = await create(a, 'Prueba racha ayer');
    const dPrev2 = await create(a, 'Prueba racha anteayer');
    await complete(a, dPrev, dayOffset(-1));
    await complete(a, dPrev2, dayOffset(-2));
    p = await progress(a, D0);
    check('Tres días seguidos dan racha 3 y mejor racha 3', p?.current_streak === 3 && p?.best_streak >= 3);
    await uncomplete(a, dPrev);
    p = await progress(a, D0);
    check('Desmarcar el único de un día rompe la racha', p?.current_streak === 1);
    check('La mejor racha no baja', p?.best_streak >= 3);
    const alive = await progress(a, dayOffset(1));
    check('Si hoy aún no hay tareas, la racha de ayer sigue viva', alive?.current_streak === 1);

    // Borrar conserva el XP.
    const before = (await progress(a, D0))?.total_xp;
    await a.from('tasks').delete().eq('id', ids[1]);
    check('Borrar una tarea completada no quita XP', (await progress(a, D0))?.total_xp === before);

    // Aislamiento y escrituras denegadas.
    const pb = await progress(b, D0);
    check('B no ve el progreso de A (empieza de cero)', pb?.total_xp === 0 && pb?.current_streak === 0);
    const statsB = await b.from('player_stats').select('user_id');
    check('B no lee las estadísticas de A', !statsB.error && statsB.data?.length === 0);
    const eventsB = await b.from('xp_events').select('id');
    check('B no lee el libro de XP de A', !eventsB.error && eventsB.data?.length === 0);
    const writeStats = await a.from('player_stats').update({ total_xp: 99999 }).eq('user_id', signA.data.session.user.id);
    check('El cliente no puede escribir en player_stats', writeStats.error !== null);
    const insertStats = await a.from('player_stats').insert({ total_xp: 99999 });
    check('El cliente no puede crear filas en player_stats', insertStats.error !== null);
    const writeEvents = await a.from('xp_events').insert({ day: D0, delta: 100 });
    check('El cliente no puede escribir en xp_events', writeEvents.error !== null);
    const forged = await a.from('tasks').update({ xp_awarded: 10 }).eq('id', extra).select().single();
    check('El cliente no puede falsear xp_awarded', !forged.error && forged.data?.xp_awarded === 0);
    const direct = await a.rpc('streak_ending', { p_user: signA.data.session.user.id, p_day: D0 });
    check('Las funciones internas no se pueden llamar desde el cliente', direct.error !== null);
  } finally {
    await a.from('tasks').delete().not('id', 'is', null);
    const left = await a.from('tasks').select('id');
    check('Limpieza: no quedan tareas de prueba', !left.error && left.data?.length === 0);
  }

  const failed = results.filter((r) => !r.passed).length;
  console.log(failed === 0 ? `\nProgreso correcto (${results.length} comprobaciones).` : `\n${failed} comprobación(es) fallida(s).`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`verify:progress falló: ${error?.name ?? 'error'}`);
  process.exitCode = 1;
});
