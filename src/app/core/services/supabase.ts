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
  private readonly create = inject(SUPABASE_CLIENT_FACTORY);
  private readonly config = inject(SUPABASE_CONFIG);

  constructor() {
    const { url, key } = this.config;
    const create = this.create;
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

  /**
   * Cliente de un solo uso para **comprobar credenciales sin tocar la sesión real**: no guarda nada
   * (almacenamiento en memoria), no refresca tokens y no comparte clave de almacenamiento con el
   * principal. Lo usa `AuthAccessService` para el inicio de sesión en dos fases y para re-autenticar.
   */
  createProbeClient(): SupabaseClient {
    const memory = new Map<string, string>();
    return this.create(this.config.url, this.config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: `${AUTH_STORAGE_KEY}-probe`,
        storage: {
          getItem: (k: string) => memory.get(k) ?? null,
          setItem: (k: string, v: string) => void memory.set(k, v),
          removeItem: (k: string) => void memory.delete(k),
        },
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
