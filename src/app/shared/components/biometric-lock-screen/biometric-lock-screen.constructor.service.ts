import { Injectable } from '@angular/core';
import { LockPhase } from '../../../core/models/biometric';

export interface LockPhaseCopy {
  readonly message: string;
  /** Esperando a que el usuario use la huella en el aviso del sistema. */
  readonly waiting: boolean;
  /** `error` solo para fallos reales: cancelar es neutro. */
  readonly tone: 'neutral' | 'error';
}

const PHASES: Record<LockPhase, LockPhaseCopy> = {
  prompting: {
    message: 'Usa tu huella para entrar.',
    waiting: true,
    tone: 'neutral',
  },
  cancelled: {
    message: 'Cuando quieras, vuelve a intentarlo para entrar.',
    waiting: false,
    tone: 'neutral',
  },
  failed: {
    message: 'No hemos podido reconocerte. Inténtalo de nuevo.',
    waiting: false,
    tone: 'error',
  },
  lockout: {
    message: 'Has hecho demasiados intentos. Espera un momento y vuelve a probar.',
    waiting: false,
    tone: 'error',
  },
};

/** Textos estáticos de la pantalla de bloqueo. Sin datos de la app ni promesas de seguridad. */
@Injectable({ providedIn: 'root' })
export class BiometricLockScreenConstructorService {
  readonly title = 'Tu app está protegida';
  readonly unlockLabel = 'Desbloquear con huella';

  phaseCopy(phase: LockPhase): LockPhaseCopy {
    return PHASES[phase];
  }
}
