import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from '@supabase/supabase-js';
import { AuthWeakPasswordError } from '@supabase/supabase-js';
import { mapAccountError, mapAuthError } from './auth-error.util';

describe('mapAuthError', () => {
  it('US-003-04 sin red (error reintentable con status 0) → network', () => {
    expect(mapAuthError(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
  });

  it('US-003-04 error reintentable sin status → network', () => {
    const error = new AuthRetryableFetchError('Failed to fetch', 0);
    Object.assign(error, { status: undefined });
    expect(mapAuthError(error)).toBe('network');
  });

  it('US-003-04 respuestas 502, 503 y 504 reintentables → service_unavailable', () => {
    for (const status of [502, 503, 504]) {
      expect(mapAuthError(new AuthRetryableFetchError('Bad gateway', status))).toBe(
        'service_unavailable'
      );
    }
  });

  it('US-003-04 error de API 5xx → service_unavailable', () => {
    expect(mapAuthError(new AuthApiError('Internal error', 500, 'unexpected_failure'))).toBe(
      'service_unavailable'
    );
  });

  it('US-003-04 estado 429 → rate_limited', () => {
    expect(mapAuthError(new AuthApiError('Too many requests', 429, undefined))).toBe(
      'rate_limited'
    );
  });

  it('US-003-04 código over_request_rate_limit → rate_limited aunque el estado sea otro', () => {
    expect(mapAuthError(new AuthApiError('Rate limit', 400, 'over_request_rate_limit'))).toBe(
      'rate_limited'
    );
  });

  it('US-003-04 registro anónimo desactivado → disabled', () => {
    expect(
      mapAuthError(
        new AuthApiError('Anonymous sign-ins are disabled', 422, 'anonymous_provider_disabled')
      )
    ).toBe('disabled');
  });

  it('US-003-04 errores no reconocidos → unknown', () => {
    expect(mapAuthError(new AuthApiError('Algo raro', 400, 'bad_json'))).toBe('unknown');
    expect(mapAuthError(new AuthUnknownError('???', new Error('x')))).toBe('unknown');
    expect(mapAuthError(new Error('boom'))).toBe('unknown');
  });

  it('US-003-04 valores que no son errores → unknown, sin lanzar', () => {
    for (const value of [null, undefined, 'texto', 42, {}, []]) {
      expect(mapAuthError(value)).toBe('unknown');
    }
  });

  it('US-003-04 el código tiene prioridad sobre el estado', () => {
    expect(mapAuthError(new AuthApiError('Disabled', 500, 'anonymous_provider_disabled'))).toBe(
      'disabled'
    );
  });
});

describe('mapAccountError', () => {
  it('US-011-02 credenciales incorrectas → invalid-credentials', () => {
    expect(
      mapAccountError(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))
    ).toBe('invalid-credentials');
  });

  it('US-011-01 nombre de usuario ya existente (user_already_exists o email_exists) → username-taken', () => {
    expect(
      mapAccountError(new AuthApiError('User already registered', 422, 'user_already_exists'))
    ).toBe('username-taken');
    expect(mapAccountError(new AuthApiError('Email exists', 422, 'email_exists'))).toBe(
      'username-taken'
    );
  });

  it('US-011-01 contraseña rechazada por el servicio → weak-password', () => {
    expect(mapAccountError(new AuthApiError('Weak password', 422, 'weak_password'))).toBe(
      'weak-password'
    );
    expect(mapAccountError(new AuthWeakPasswordError('Weak', 422, ['length']))).toBe(
      'weak-password'
    );
  });

  it('US-011-05 contraseña nueva igual a la actual → same-password', () => {
    expect(mapAccountError(new AuthApiError('Same', 422, 'same_password'))).toBe('same-password');
  });

  it('US-011-02 límite de intentos (429 u over_request_rate_limit) → rate-limited', () => {
    expect(mapAccountError(new AuthApiError('Too many', 429, undefined))).toBe('rate-limited');
    expect(mapAccountError(new AuthApiError('Rate', 400, 'over_request_rate_limit'))).toBe(
      'rate-limited'
    );
    expect(mapAccountError(new AuthApiError('Rate', 400, 'over_email_send_rate_limit'))).toBe(
      'rate-limited'
    );
  });

  it('US-011-01 sin red (error reintentable o fallo de fetch) → network', () => {
    expect(mapAccountError(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
    expect(mapAccountError(new TypeError('Failed to fetch'))).toBe('network');
    expect(mapAccountError({ message: 'NetworkError when attempting to fetch resource' })).toBe(
      'network'
    );
  });

  it('US-011-01 llamada cancelada por plazo → timeout', () => {
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';
    expect(mapAccountError(abort)).toBe('timeout');
  });

  it('US-011-06 sesión no válida o sin permiso (401, 403, sesión no encontrada, 42501) → unauthorized', () => {
    expect(mapAccountError(new AuthApiError('Unauthorized', 401, undefined))).toBe('unauthorized');
    expect(mapAccountError(new AuthApiError('Session not found', 403, 'session_not_found'))).toBe(
      'unauthorized'
    );
    expect(mapAccountError({ code: '42501', message: 'permission denied' })).toBe('unauthorized');
  });

  it('US-011-01 errores de servidor 5xx y no reconocidos → unknown, sin filtrar el mensaje', () => {
    expect(mapAccountError(new AuthApiError('Internal', 500, 'unexpected_failure'))).toBe(
      'unknown'
    );
    expect(mapAccountError(new AuthApiError('Algo raro', 400, 'bad_json'))).toBe('unknown');
    expect(mapAccountError(null)).toBe('unknown');
    expect(mapAccountError('texto')).toBe('unknown');
  });
});
