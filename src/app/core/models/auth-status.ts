export type AuthStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AuthErrorReason =
  'network' | 'rate_limited' | 'disabled' | 'timeout' | 'service_unavailable' | 'unknown';

/** Motivos que se reintentan solos; el resto espera al retry() manual. */
export const AUTO_RETRY_REASONS: readonly AuthErrorReason[] = [
  'network',
  'timeout',
  'service_unavailable',
];

/** Plazo máximo de cada intento de crear la sesión; solo cambia lo que ve el usuario. */
export const ATTEMPT_TIMEOUT_MS = 10_000;

/** Esperas crecientes de los primeros reintentos automáticos. */
export const AUTO_RETRY_DELAYS_MS: readonly number[] = [2_000, 5_000, 15_000, 30_000];

/** Tras la espera creciente, intervalo del sondeo lento mientras haya un error reintentable. */
export const SLOW_RETRY_INTERVAL_MS = 60_000;
