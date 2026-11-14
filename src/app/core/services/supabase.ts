import { Injectable, InjectionToken, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.config';

/** Constructor del cliente; se inyecta para poder sustituirlo en los tests sin simular el módulo. */
export const SUPABASE_CLIENT_FACTORY = new InjectionToken<typeof createClient>(
  'SUPABASE_CLIENT_FACTORY',
  { providedIn: 'root', factory: () => createClient }
);

const PLACEHOLDER_MARK = 'YOUR_';

/**
 * Clave fija del almacenamiento de la sesión. Es explícita para poder leer la sesión guardada sin
 * pasar por `getSession()` (que sin red y con el token caducado tarda ~25 s y devuelve `null`).
 */
export const AUTH_STORAGE_KEY = 'task-manager-auth';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    const { url, key } = inject(SUPABASE_CONFIG);
    const create = inject(SUPABASE_CLIENT_FACTORY);
    this.assertConfigured('url', url);
    this.assertConfigured('key', key);

    this.client = create(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY,
      },
    });
  }

  private assertConfigured(name: 'url' | 'key', value: string): void {
    if (!value.trim()) {
      throw new Error(`Supabase ${name} vacía: revisa src/environments/environment.ts`);
    }
    if (value.includes(PLACEHOLDER_MARK)) {
      throw new Error(
        `Supabase ${name} sin configurar: sustituye el placeholder en src/environments/environment.ts`
      );
    }
  }
}
