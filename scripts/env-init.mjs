// Crea src/environments/environment.ts desde el ejemplo si no existe (el fichero está ignorado por git).
import { copyFileSync, existsSync } from 'node:fs';

const target = 'src/environments/environment.ts';
if (!existsSync(target)) {
  copyFileSync('src/environments/environment.example.ts', target);
  console.log(`env:init → creado ${target} desde el ejemplo. Edítalo con tus valores.`);
}
