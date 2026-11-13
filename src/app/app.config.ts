import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { SUPABASE_CONFIG } from './core/services/supabase.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: SUPABASE_CONFIG,
      useValue: { url: environment.supabaseUrl, key: environment.supabaseKey },
    },
  ],
};
