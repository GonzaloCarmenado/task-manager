import { TestBed } from '@angular/core/testing';
import { BiometricNoticeConstructorService } from './biometric-notice.constructor.service';

const FORBIDDEN =
  /\bXP\b|racha|nivel|misi[óo]n|cifrad|encript|a salvo|seguridad|segur[oa]\b|ajustes del tel[ée]fono|biometr|token|plugin|android/i;

describe('BiometricNoticeConstructorService', () => {
  let service: BiometricNoticeConstructorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BiometricNoticeConstructorService);
  });

  it('US-004-03 explica el desactivado, promete volver a proponerlo y tiene un único botón', () => {
    expect(service.title).toBeTruthy();
    expect(service.description).toContain('ya no hay huellas registradas en tu móvil');
    expect(service.description).toContain('Te lo volveremos a proponer');
    expect(service.acknowledgeLabel).toBe('Entendido');
  });

  it('US-004-03 ningún texto menciona datos de la app, cifrado ni los ajustes del teléfono', () => {
    for (const text of [service.title, service.description, service.acknowledgeLabel]) {
      expect(text, text).not.toMatch(FORBIDDEN);
    }
  });
});
