import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase.config';

const PLACEHOLDER_MARK = 'YOUR_';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    const { url, key } = inject(SUPABASE_CONFIG);
    this.assertConfigured('url', url);
    this.assertConfigured('key', key);

    this.client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
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
