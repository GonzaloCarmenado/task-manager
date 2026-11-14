import { AccountErrorReason } from '../models/account';
import { AuthErrorReason } from '../models/auth-status';

interface AuthErrorLike {
  readonly name?: unknown;
  readonly status?: unknown;
  readonly code?: unknown;
  readonly message?: unknown;
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

const NETWORK_TEXT = /failed to fetch|network|load failed|fetch failed/i;

/**
 * Clasifica un error de una operación de cuenta (registro, inicio de sesión, cambios y borrado).
 * Nunca devuelve ni filtra el mensaje original: la interfaz solo ve el motivo.
 */
export function mapAccountError(error: unknown): AccountErrorReason {
  const e = asAuthErrorLike(error);
  if (!e) return 'unknown';

  const status = typeof e.status === 'number' ? e.status : undefined;
  const code = typeof e.code === 'string' ? e.code : undefined;
  const name = typeof e.name === 'string' ? e.name : undefined;
  const message = typeof e.message === 'string' ? e.message : '';

  if (name === 'AbortError') return 'timeout';
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    status === 429
  ) {
    return 'rate-limited';
  }
  if (code === 'invalid_credentials') return 'invalid-credentials';
  if (code === 'user_already_exists' || code === 'email_exists') return 'username-taken';
  if (code === 'weak_password' || name === 'AuthWeakPasswordError') return 'weak-password';
  if (code === 'same_password') return 'same-password';
  if (code === 'session_not_found' || code === '42501' || status === 401 || status === 403) {
    return 'unauthorized';
  }
  if (name === 'AuthRetryableFetchError') {
    return status !== undefined && status >= 500 ? 'unknown' : 'network';
  }
  if (name === 'TypeError' || NETWORK_TEXT.test(message)) return 'network';
  return 'unknown';
}
