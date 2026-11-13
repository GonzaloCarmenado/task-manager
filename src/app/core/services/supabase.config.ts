import { InjectionToken } from '@angular/core';

export interface SupabaseConfig {
  readonly url: string;
  readonly key: string;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG');
