// Escanea los ficheros versionados y pendientes de versionar en busca de secretos y de datos
// personales que no deben publicarse (el repo es público): tokens, contraseñas, claves,
// rutas locales del disco del usuario y correos personales.
// Uso: pnpm secrets:check  (también se ejecuta en el pre-commit)
// Una línea con el marcador `secrets:allow` se omite (solo para valores ficticios de ejemplo).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const IGNORED = [
  'pnpm-lock.yaml',
  'scripts/check-secrets.mjs',
  // contiene a propósito ejemplos falsos de rutas, correos y tokens para probar el escáner
  'scripts/check-secrets.test.mjs',
];

const WIN_ROOTS = 'Users|Program Files|Program Files \\(x86\\)|Windows|Android|Git|Documents|Desktop|Downloads|AppData';
const EMAIL_ALLOWED_DOMAINS = [
  'email.com',
  'example.com',
  'example.org',
  'example.net',
  'users.noreply.github.com',
];
const EMAIL_ALLOWED_ADDRESSES = ['noreply@anthropic.com'];
const FILE_LIKE_TLDS = /\.(png|jpe?g|gif|svg|webp|ico|css|scss|js|mjs|ts|json|map|woff2?)$/i;

/** Cada regla: [etiqueta, regex, (coincidencia) => bool que la exime]. */
const CONTENT_RULES = [
  ['JWT / clave anon o service_role', /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/],
  ['token de acceso de Supabase', /sbp_[A-Za-z0-9]{10,}/],
  ['clave secreta de Supabase', /sb_secret_[A-Za-z0-9_-]{8,}/],
  ['cadena de conexión con contraseña', /postgres(ql)?:\/\/[^\s:@]+:[^\s@]+@/i],
  ['clave privada', /BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY/],
  ['token de GitHub', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['clave de AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token de Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  [
    'contraseña o api key literal',
    /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"](?!env\()[^'"\s]{8,}['"]/i,
  ],
  [
    'ruta local del equipo del usuario',
    new RegExp(
      [
        `\\b[A-Za-z]:[\\\\/](?:${WIN_ROOTS})\\b`, // C:\Users, D:/Android...
        `\\b[A-Za-z]:\\\\[^\\\\\\s"'\`]+\\\\[^\\\\\\s"'\`]+`, // E:\Datos\carpeta
        `(?:^|[\\s"'\`(=])/[a-z]/(?:${WIN_ROOTS})\\b`, // /c/Users, /d/Git (git-bash)
        `(?:^|[\\s"'\`(=])/(?:home|Users)/[A-Za-z0-9._-]+/`, // /home/usuario/, /Users/usuario/
      ].join('|')
    ),
  ],
  [
    'correo personal',
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
    (email) => {
      const lower = email.toLowerCase();
      if (EMAIL_ALLOWED_ADDRESSES.includes(lower)) return true;
      if (FILE_LIKE_TLDS.test(lower)) return true; // p. ej. icon@2x.png
      const domain = lower.split('@')[1];
      return EMAIL_ALLOWED_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
    },
  ],
];

const FILE_RULES = [
  [/(^|\/)\.env(\..+)?$/, /\.env\.example$/],
  [/\.(pem|key|p12|pfx|jks|keystore)$/],
  [
    /(^|\/)(google-services\.json|local\.properties|credentials\.json|environment\.ts)$/,
    /environment\.example\.ts$/,
  ],
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
    if (line.includes('secrets:allow')) return; // valor ficticio marcado a propósito
    for (const [label, re, allow] of CONTENT_RULES) {
      const matches = re.global ? [...line.matchAll(re)].map((m) => m[0]) : line.match(re) ? [line] : [];
      if (matches.some((m) => !(allow && allow(m)))) findings.push(`${file}:${i + 1}: posible ${label}`);
    }
  });
}

if (findings.length > 0) {
  console.error('\nDatos sensibles detectados (no se muestran los valores):\n');
  findings.forEach((f) => console.error(`  - ${f}`));
  console.error(
    '\nQuítalos del repo: usa variables de entorno / ficheros ignorados y placeholders (<ruta del SDK>). Si es una credencial que llegó a publicarse, rótala.'
  );
  process.exit(1);
}
console.log(`secrets:check OK (${files.length} ficheros revisados)`);
