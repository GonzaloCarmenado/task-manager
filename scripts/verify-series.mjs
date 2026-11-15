// Verificación REAL (manual) de las tareas repetitivas (spec 012) contra el proyecto Supabase configurado.
// Uso: pnpm verify:series   (necesita src/environments/environment.ts con la clave publishable y la migración aplicada)
// NO corre en CI ni en el pre-commit: crea dos usuarios anónimos reales, una serie y sus ocurrencias de prueba, y lo
// borra todo al terminar. Solo imprime nombres de comprobación y OK/FALLO. Nunca imprime tokens, claves, URL ni ids.
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

const SERIES = {
  title: 'Serie de prueba',
  kind: 'weekly',
  interval_n: 1,
  weekdays: [1, 4],
  month_day: null,
  start_date: '2026-11-09',
  until_date: null,
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
  const idA = signA.data.session.user.id;
  let seriesId;

  try {
    const created = await a.from('task_series').insert(SERIES).select().single();
    seriesId = created.data?.id;
    check('A puede crear una serie (user_id lo pone la base de datos)', !created.error && created.data?.user_id === idA);

    const readB = await b.from('task_series').select('id');
    check('B NO ve la serie de A', !readB.error && readB.data?.length === 0);

    const updB = await b.from('task_series').update({ title: 'Secuestrada' }).eq('id', seriesId).select();
    check('B NO puede editar la serie de A', !updB.error && updB.data?.length === 0);

    const delB = await b.from('task_series').delete().eq('id', seriesId).select();
    check('B NO puede borrar la serie de A', !delB.error && delB.data?.length === 0);

    const bad = await a.from('task_series').insert({ ...SERIES, weekdays: [] });
    check('Una serie semanal sin días se rechaza', bad.error !== null);
    const badMonth = await a.from('task_series').insert({ ...SERIES, kind: 'monthly', weekdays: [], month_day: 32 });
    check('Un día del mes fuera de 1 a 31 se rechaza', badMonth.error !== null);
    const badUntil = await a.from('task_series').insert({ ...SERIES, until_date: '2026-11-01' });
    check('Una fecha de fin anterior al inicio se rechaza', badUntil.error !== null);

    const first = await a
      .from('tasks')
      .insert({ title: 'Ocurrencia 1', due_date: '2026-11-16', series_id: seriesId, series_date: '2026-11-16' })
      .select()
      .single();
    check('A crea la primera ocurrencia de la serie', !first.error && first.data?.series_id === seriesId);

    const dup = await a
      .from('tasks')
      .insert({ title: 'Ocurrencia 2', due_date: '2026-11-19', series_id: seriesId, series_date: '2026-11-19' });
    check('Una segunda ocurrencia pendiente de la misma serie se rechaza (índice único)', dup.error?.code === '23505');

    const noDate = await a
      .from('tasks')
      .insert({ title: 'Sin fecha', series_id: seriesId, series_date: '2026-11-19' });
    check('Una ocurrencia sin fecha se rechaza', noDate.error !== null);

    const future = await a
      .from('tasks')
      .update({ completed_at: new Date().toISOString(), completed_day: '2026-11-15' })
      .eq('id', first.data?.id)
      .select();
    check('No se puede completar una ocurrencia con fecha posterior al día local', future.error !== null);

    const ok = await a
      .from('tasks')
      .update({ completed_at: new Date().toISOString(), completed_day: '2026-11-16' })
      .eq('id', first.data?.id)
      .select();
    check('Se completa el mismo día de su fecha', !ok.error && ok.data?.length === 1);

    const next = await a
      .from('tasks')
      .insert({ title: 'Ocurrencia 2', due_date: '2026-11-19', series_id: seriesId, series_date: '2026-11-19' })
      .select()
      .single();
    check('Completada la primera, se puede crear la siguiente', !next.error);

    const undo = await a
      .from('tasks')
      .update({ completed_at: null, completed_day: null })
      .eq('id', first.data?.id)
      .select();
    check('Desmarcar la primera funciona (aunque exista otra pendiente)', !undo.error && undo.data?.length === 1);
    const pending = await a.from('tasks').select('id').eq('series_id', seriesId).is('completed_at', null);
    check('Tras desmarcar queda una sola pendiente (la generada después se borra)', !pending.error && pending.data?.length === 1);

    const delSeries = await a.from('task_series').delete().eq('id', seriesId).select();
    check('Borrar la serie funciona', !delSeries.error && delSeries.data?.length === 1);
    const loose = await a.from('tasks').select('series_id').eq('id', first.data?.id).single();
    check('La ocurrencia queda como tarea suelta (series_id nulo)', !loose.error && loose.data?.series_id === null);
    seriesId = undefined;
  } finally {
    // Limpieza: nunca se deja nada de la prueba.
    if (seriesId) await a.from('task_series').delete().eq('id', seriesId);
    await a.from('tasks').delete().in('title', ['Ocurrencia 1', 'Ocurrencia 2', 'Sin fecha']);
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('Error en la verificación:', error instanceof Error ? error.message : 'desconocido');
  process.exitCode = 1;
});
