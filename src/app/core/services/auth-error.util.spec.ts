import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from '@supabase/supabase-js';
import { mapAuthError } from './auth-error.util';

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
