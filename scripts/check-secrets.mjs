// Escanea los ficheros versionados y pendientes de versionar en busca de secretos.
// Uso: pnpm secrets:check  (también se ejecuta en el pre-commit)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const IGNORED = ['pnpm-lock.yaml', 'scripts/check-secrets.mjs'];

const CONTENT_RULES = [
  ['JWT / clave anon o service_role', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['token de acceso de Supabase', /sbp_[A-Za-z0-9]{10,}/],
  ['clave secreta de Supabase', /sb_secret_[A-Za-z0-9_-]{8,}/],
  ['cadena de conexión con contraseña', /postgres(ql)?:\/\/[^\s:@]+:[^\s@]+@/i],
  ['clave privada', /BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY/],
  ['token de GitHub', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['clave de AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token de Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['contraseña o api key literal', /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i],
];

const FILE_RULES = [
  [/(^|\/)\.env(\..+)?$/, /\.env\.example$/],
  [/\.(pem|key|p12|pfx|jks|keystore)$/],
  [/(^|\/)(google-services\.json|local\.properties|credentials\.json|environment\.ts)$/, /environment\.example\.ts$/],
];

const files = execSync('git ls-files -co --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((f) => !IGNORED.includes(f));

const findings = [];

for (const file of files) {
  for (const [pattern, allow] of FILE_RULES) {
    if (pattern.test(file) && !(allow && allow.test(file))) {
      findings.push(`${file}: fichero sensible que no debe versionarse`);
    }
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0')) continue;
  text.split('\n').forEach((line, i) => {
    for (const [label, re] of CONTENT_RULES) {
      if (re.test(line)) findings.push(`${file}:${i + 1}: posible ${label}`);
    }
  });
}

if (findings.length > 0) {
  console.error('\nSecretos detectados (no se muestran los valores):\n');
  findings.forEach((f) => console.error(`  - ${f}`));
  console.error('\nQuítalos del repo, usa variables de entorno / ficheros ignorados y rota la credencial si llegó a publicarse.');
  process.exit(1);
}
console.log(`secrets:check OK (${files.length} ficheros revisados)`);
