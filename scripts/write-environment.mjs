// Spec 013: genera `src/environments/environment.ts` en el flujo de publicación desde dos secretos de GitHub.
// Uso: SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… node scripts/write-environment.mjs [--target <ruta>]
// Valida antes de escribir y NUNCA imprime los valores (los errores nombran la variable, no su contenido).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL_VARIABLE = 'SUPABASE_URL';
const KEY_VARIABLE = 'SUPABASE_PUBLISHABLE_KEY';

/** Caracteres que romperían el literal de TypeScript o esconderían código en el fichero generado. */
// Comilla simple, doble e invertida, barra, dólar, retorno de carro, salto de línea y los separadores Unicode de línea.
const UNSAFE_CHARS = String.fromCharCode(39, 34, 96, 92, 36, 13, 10, 0x2028, 0x2029).split('');
const isUnsafe = (value) => UNSAFE_CHARS.some((char) => value.includes(char));

const fail = (variable, reason) => {
  throw new Error(`${variable}: ${reason}`);
};

function requireValue(env, variable) {
  const value = env[variable];
  if (typeof value !== 'string' || value.trim() === '') fail(variable, 'falta o está vacío.');
  if (isUnsafe(value)) fail(variable, 'contiene caracteres no permitidos (comillas, barras o saltos de línea).');
  return value.trim();
}

function validUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(URL_VARIABLE, 'no es una URL válida.');
  }
  if (url.protocol !== 'https:') fail(URL_VARIABLE, 'debe empezar por https://.');
  if (url.hostname === '') fail(URL_VARIABLE, 'no tiene dominio.');
  if (url.username !== '' || url.password !== '') fail(URL_VARIABLE, 'no debe llevar usuario ni contraseña.');
  return raw.replace(/\/+$/, '');
}

/** Rol del payload de un JWT (`anon`, `service_role`…) o `null` si no es un JWT legible. */
function jwtRole(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function validKey(raw) {
  if (raw.startsWith('sb_secret_')) fail(KEY_VARIABLE, 'es una clave secreta: aquí solo va la clave publishable.');
  if (raw.startsWith('sb_publishable_')) return raw;
  const role = jwtRole(raw);
  if (role === 'anon') return raw;
  if (role === 'service_role') fail(KEY_VARIABLE, 'es una clave service_role: aquí solo va la clave publishable (anon).');
  fail(KEY_VARIABLE, 'no parece una clave publishable (debe empezar por sb_publishable_ o ser un JWT con rol anon).');
}

/**
 * Contenido de environment.ts. Lanza Error (que nombra la variable, nunca su valor) si algo falta o no es válido.
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function buildEnvironment(env) {
  const url = validUrl(requireValue(env, URL_VARIABLE));
  const key = validKey(requireValue(env, KEY_VARIABLE));
  return `// Generado por el flujo de publicación (spec 013). Ignorado por git: no se versiona.
export const environment = {
  supabaseUrl: '${url}',
  supabaseKey: '${key}',
};
`;
}

/**
 * Valida y escribe el fichero; si la validación falla, no escribe nada.
 * @param {Record<string, string | undefined>} env
 * @param {string} target
 */
export function writeEnvironment(env, target) {
  const content = buildEnvironment(env);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const index = args.indexOf('--target');
  const target = resolve(index >= 0 ? args[index + 1] : join(import.meta.dirname, '..', 'src', 'environments', 'environment.ts'));
  try {
    writeEnvironment(process.env, target);
    console.log('environment.ts generado desde los secretos (valores no mostrados).');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Error desconocido');
    process.exitCode = 1;
  }
}
