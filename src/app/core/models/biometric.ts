export type BiometricFailure =
  /** El usuario cierra el aviso: no es un error. */
  | 'cancelled'
  /** Demasiados intentos con la huella. */
  | 'lockout'
  /** Sin hardware, sin huellas registradas o sin bloqueo de pantalla. */
  | 'unavailable'
  /** Cualquier otro error: se trata como «inténtalo de nuevo». */
  | 'failed';

export type BiometricResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: BiometricFailure };

/** Fase visible de la pantalla de bloqueo. */
export type LockPhase = 'prompting' | 'cancelled' | 'failed' | 'lockout';

/** Preferencias locales al dispositivo. No contienen nada sensible. */
export interface BiometricLockPrefs {
  readonly enabled: boolean;
  readonly offerAnswer: 'pending' | 'never';
  /** «Ahora no» pulsados; al llegar a 3 equivale a «never». */
  readonly laterCount: number;
  /** Hay un aviso de «bloqueo desactivado» sin leer. */
  readonly disabledNotice: boolean;
}

export const DEFAULT_BIOMETRIC_PREFS: BiometricLockPrefs = {
  enabled: false,
  offerAnswer: 'pending',
  laterCount: 0,
  disabledNotice: false,
};

/** Máximo de respuestas «Ahora no» antes de dejar de ofrecer. */
export const MAX_LATER_ANSWERS = 3;

/** Segundos en segundo plano a partir de los cuales se vuelve a pedir la huella. */
export const BACKGROUND_LOCK_MS = 30_000;

export const BIOMETRIC_PREFS_KEY = 'task-manager-biometric-lock';
