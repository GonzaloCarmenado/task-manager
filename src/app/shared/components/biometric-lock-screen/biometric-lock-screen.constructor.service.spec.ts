import { TestBed } from '@angular/core/testing';
import { LockPhase } from '../../../core/models/biometric';
import { BiometricLockScreenConstructorService } from './biometric-lock-screen.constructor.service';

const PHASES: readonly LockPhase[] = ['prompting', 'cancelled', 'failed', 'lockout'];

/** Datos de la app, promesas de seguridad y términos técnicos que no deben aparecer (spec 004, D1 a D3). */
const FORBIDDEN_COPY =
  /\bXP\b|racha|nivel|misi[óo]n|cifrad|encript|a salvo|seguridad|segur[oa]\b|\d+\s*(segundos|ms)|biometr|token|plugin|android|simulador|\bPIN\b/i;

describe('BiometricLockScreenConstructorService', () => {
  let service: BiometricLockScreenConstructorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BiometricLockScreenConstructorService);
  });

  it('US-004-02 define título, botón y un mensaje distinto por cada fase', () => {
    expect(service.title).toBe('Tu app está protegida');
    expect(service.unlockLabel).toBe('Desbloquear con huella');
    const messages = PHASES.map((phase) => service.phaseCopy(phase).message);
    messages.forEach((m) => expect(m.length).toBeGreaterThan(10));
    expect(new Set(messages).size).toBe(PHASES.length);
  });

  it('US-004-02 solo la fase de espera es un estado de carga; las demás muestran el botón', () => {
    expect(service.phaseCopy('prompting').waiting).toBe(true);
    for (const phase of ['cancelled', 'failed', 'lockout'] as const) {
      expect(service.phaseCopy(phase).waiting).toBe(false);
    }
  });

  it('US-004-02 cancelar no es un error; fallar y el bloqueo por intentos sí se señalan', () => {
    expect(service.phaseCopy('cancelled').tone).toBe('neutral');
    expect(service.phaseCopy('failed').tone).toBe('error');
    expect(service.phaseCopy('lockout').tone).toBe('error');
  });

  it('US-004-02 ningún texto afirma cifrado ni seguridad fuerte ni muestra datos de la app', () => {
    const texts = [
      service.title,
      service.unlockLabel,
      ...PHASES.flatMap((p) => [service.phaseCopy(p).message]),
    ];
    for (const text of texts) {
      expect(text, text).not.toMatch(FORBIDDEN_COPY);
    }
  });
});
