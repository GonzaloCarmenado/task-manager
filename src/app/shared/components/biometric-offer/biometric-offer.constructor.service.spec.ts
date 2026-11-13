import { TestBed } from '@angular/core/testing';
import { BiometricOfferConstructorService } from './biometric-offer.constructor.service';

const FORBIDDEN =
  /\bXP\b|racha|nivel|misi[óo]n|cifrad|encript|a salvo|seguridad|segur[oa]\b|\d+\s*(segundos|ms)|menos de un segundo|biometr|token|plugin|android|simulador/i;

describe('BiometricOfferConstructorService', () => {
  let service: BiometricOfferConstructorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BiometricOfferConstructorService);
  });

  it('US-004-01 define la pregunta, la explicación veraz y las tres acciones', () => {
    expect(service.title).toBe('¿Proteger la app con tu huella?');
    expect(service.description).toBe('Así nadie verá tus tareas si coge tu móvil.');
    expect(service.actions).toEqual({
      accept: 'Activar',
      later: 'Preguntarme más tarde',
      never: 'No volver a preguntar',
    });
  });

  it('US-004-01 ningún texto afirma cifrado ni seguridad fuerte, ni menciona XP, rachas o tiempos', () => {
    const texts = [service.title, service.description, ...Object.values(service.actions)];
    for (const text of texts) {
      expect(text, text).not.toMatch(FORBIDDEN);
    }
  });
});
