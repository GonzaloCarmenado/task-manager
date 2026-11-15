// Verificación REAL (manual) de la RLS de la tabla `tasks` contra el proyecto Supabase configurado.
// Uso: pnpm verify:rls   (necesita src/environments/environment.ts con la clave publishable y la migración aplicada)
// NO corre en CI ni en el pre-commit: crea dos usuarios anónimos reales y una tarea de prueba que borra al terminar.
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

async function main() {
  const { url, key } = readEnvironment();
  const { createClient } = await import('@supabase/supabase-js');

  const a = memoryClient(createClient, url, key);
  const b = memoryClient(createClient, url, key);
  const anon = memoryClient(createClient, url, key);

  const [signA, signB] = await Promise.all([a.auth.signInAnonymously(), b.auth.signInAnonymously()]);
  if (signA.error || signB.error || !signA.data.session || !signB.data.session) {
    console.error('No se pudieron crear las dos sesiones anónimas (¿límite por IP o registro anónimo deshabilitado?).');
    process.exitCode = 1;
    return;
  }
  const idA = signA.data.session.user.id;

  try {
    const inserted = await a
      .from('tasks')
      .insert({ title: 'Tarea de prueba RLS', due_date: '2026-11-13', due_time: '10:00' })
      .select()
      .single();
    const rowId = inserted.data?.id;
    check('A puede crear una tarea (user_id lo pone la base de datos)', !inserted.error && inserted.data?.user_id === idA);

    const readA = await a.from('tasks').select('id');
    check('A ve su tarea', !readA.error && readA.data?.some((r) => r.id === rowId) === true);

    const readB = await b.from('tasks').select('id');
    check('B NO ve la tarea de A', !readB.error && readB.data?.length === 0);

    const updB = await b.from('tasks').update({ title: 'Secuestrada' }).eq('id', rowId).select();
    check('B NO puede editar la tarea de A', !updB.error && updB.data?.length === 0);

    const delB = await b.from('tasks').delete().eq('id', rowId).select();
    check('B NO puede borrar la tarea de A', !delB.error && delB.data?.length === 0);

    const stillA = await a.from('tasks').select('title').eq('id', rowId).single();
    check('La tarea de A sigue intacta', !stillA.error && stillA.data?.title === 'Tarea de prueba RLS');

    const forged = await b.from('tasks').insert({ title: 'A nombre de otro', user_id: idA }).select();
    check('B NO puede crear tareas a nombre de A', forged.error !== null);

    const reassign = await a.from('tasks').update({ user_id: signB.data.session.user.id }).eq('id', rowId).select();
    check('A NO puede regalar su tarea a otro usuario', reassign.error !== null || reassign.data?.length === 0);

    const noSession = await anon.from('tasks').select('id');
    check('Sin sesión no se lee nada', noSession.error !== null || noSession.data?.length === 0);
    const noSessionInsert = await anon.from('tasks').insert({ title: 'Anónima sin sesión' });
    check('Sin sesión no se puede crear', noSessionInsert.error !== null);

    const tooLong = await a.from('tasks').insert({ title: 'a'.repeat(121) });
    check('El título de 121 caracteres se rechaza', tooLong.error !== null);
    const untrimmed = await a.from('tasks').insert({ title: ' con espacios ' });
    check('El título con espacios en los extremos se rechaza', untrimmed.error !== null);
    const empty = await a.from('tasks').insert({ title: '' });
    check('El título vacío se rechaza', empty.error !== null);
    const timeNoDate = await a.from('tasks').insert({ title: 'Hora sin fecha', due_time: '09:00' });
    check('La hora sin fecha se rechaza', timeNoDate.error !== null);
    const negative = await a.from('tasks').insert({ title: 'Pospuesta negativa', postponed_count: -1 });
    check('El contador de pospuestas no admite negativos (spec 007)', negative.error !== null);
  } finally {
    // Limpieza: A borra lo suyo (y comprueba que no queda nada).
    await a.from('tasks').delete().not('id', 'is', null);
    const left = await a.from('tasks').select('id');
    check('Limpieza: no quedan tareas de prueba', !left.error && left.data?.length === 0);
  }

  const failed = results.filter((r) => !r.passed).length;
  console.log(failed === 0 ? `\nRLS correcta (${results.length} comprobaciones).` : `\n${failed} comprobación(es) fallida(s).`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`verify:rls falló: ${error?.name ?? 'error'}`);
  process.exitCode = 1;
});
