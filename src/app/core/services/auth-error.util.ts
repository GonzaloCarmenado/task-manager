import { AuthErrorReason } from '../models/auth-status';

interface AuthErrorLike {
  readonly name?: unknown;
  readonly status?: unknown;
  readonly code?: unknown;
}

function asAuthErrorLike(error: unknown): AuthErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as AuthErrorLike) : null;
}

/**
 * Clasifica un error de autenticación sin importar `supabase-js` (solo `SupabaseService` puede):
 * los errores de la librería llevan `name`, `status` y `code` como propiedades de datos.
 */
export function mapAuthError(error: unknown): AuthErrorReason {
  const e = asAuthErrorLike(error);
  if (!e) return 'unknown';

  const status = typeof e.status === 'number' ? e.status : undefined;

  if (e.code === 'anonymous_provider_disabled') return 'disabled';
  if (e.code === 'over_request_rate_limit' || status === 429) return 'rate_limited';

  if (e.name === 'AuthRetryableFetchError') {
    return status !== undefined && status >= 500 ? 'service_unavailable' : 'network';
  }
  if (e.name === 'AuthApiError' && status !== undefined && status >= 500) {
    return 'service_unavailable';
  }

  return 'unknown';
}
