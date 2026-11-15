import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthAccessService } from './core/services/auth.access.service';
import { BiometricLockService } from './core/services/biometric-lock.service';
import { SUPABASE_CONFIG } from './core/services/supabase.config';
import { AlarmsAccessService } from './features/tasks/alarms/alarms.access.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Cada navegación empieza arriba: el WebView conserva el desplazamiento del documento entre rutas.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    {
      provide: SUPABASE_CONFIG,
      useValue: { url: environment.supabaseUrl, key: environment.supabaseKey },
    },
    // El bloqueo va primero: con la huella activa la app arranca ya tapada, sin esperar a nada.
    provideAppInitializer(() => inject(BiometricLockService).initialize()),
    // Decide el estado inicial de la identidad (síncrono, sin esperar a la red) antes del primer render.
    provideAppInitializer(() => inject(AuthAccessService).initialize()),
    // Las alarmas reconcilian los avisos con las tareas; solo en Android y sin esperar a la red.
    provideAppInitializer(() => inject(AlarmsAccessService).initialize()),
  ],
};
