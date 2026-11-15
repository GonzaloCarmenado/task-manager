// Spec 013: comprueba que los secretos del flujo de publicación existen. Nombra los que faltan y NUNCA imprime valores.
// Uso: node scripts/release-ci.mjs require NOMBRE [NOMBRE…]   (lee las variables del entorno)
import { pathToFileURL } from 'node:url';

/**
 * Nombres de las variables ausentes, vacías o solo con espacios (nunca sus valores).
 * @param {Record<string, string | undefined>} env
 * @param {readonly string[]} names
 * @returns {string[]}
 */
export function missing(env, names) {
  return names.filter((name) => typeof env[name] !== 'string' || env[name].trim() === '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...names] = process.argv.slice(2);
  if (command !== 'require' || names.length === 0) {
    console.error('Uso: node scripts/release-ci.mjs require NOMBRE [NOMBRE…]');
    process.exitCode = 1;
  } else {
    const absent = missing(process.env, names);
    if (absent.length > 0) {
      console.error(`Faltan secretos o variables del flujo de publicación: ${absent.join(', ')}. Créalos en Settings → Secrets and variables → Actions (ver docs/release.md).`);
      process.exitCode = 1;
    } else {
      console.log(`Secretos presentes: ${names.length} (valores no mostrados).`);
    }
  }
}
