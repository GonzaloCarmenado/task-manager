import { TestBed } from '@angular/core/testing';
import { AuthErrorReason } from '../../../core/models/auth-status';
import { SessionStatusConstructorService } from './session-status.constructor.service';

const REASONS: readonly AuthErrorReason[] = [
  'network',
  'rate_limited',
  'disabled',
  'timeout',
  'service_unavailable',
  'unknown',
];

/** Cosas que el diseño de Stitch traía y que son inexactas o técnicas (spec 003, D1 a D5). */
const FORBIDDEN =
  /dispositivo|a salvo|\bXP\b|racha|nivel|%|\d+\s*segundos|token|jwt|http|código|exception|supabase|\b(4|5)\d\d\b/i;

describe('SessionStatusConstructorService', () => {
  let service: SessionStatusConstructorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionStatusConstructorService);
  });

  it('US-003-06 cada motivo se corresponde con su variante del diseño', () => {
    expect(service.errorCopy('network')).toMatchObject({ title: 'Sin conexión', icon: 'wifi-off' });
    expect(service.errorCopy('rate_limited')).toMatchObject({
      title: 'Demasiados intentos',
      icon: 'hourglass',
    });
    expect(service.errorCopy('timeout')).toMatchObject({
      title: 'Tarda más de lo normal',
      icon: 'clock',
    });
    expect(service.errorCopy('service_unavailable')).toMatchObject({
      title: 'Servicio no disponible',
      icon: 'server',
    });
    expect(service.errorCopy('unknown')).toMatchObject({
      title: 'Error inesperado',
      icon: 'alert',
    });
  });

  it('US-003-06 disabled usa la variante «Servicio no disponible» (no expone la configuración)', () => {
    expect(service.errorCopy('disabled')).toEqual(service.errorCopy('service_unavailable'));
  });

  it('US-003-06 los 6 motivos producen exactamente 5 variantes distintas', () => {
    const titles = new Set(REASONS.map((reason) => service.errorCopy(reason).title));
    expect(titles.size).toBe(5);
  });

  it('US-003-06 ningún texto contiene términos técnicos ni afirmaciones inexactas', () => {
    const texts: string[] = [
      service.loading.title,
      service.loading.description,
      service.retryLabel,
      service.autoRetryNotice,
      service.autoRetryHint,
      service.manualRetryHint,
    ];
    for (const reason of REASONS) {
      const copy = service.errorCopy(reason);
      texts.push(copy.title, copy.description, copy.pill);
    }
    for (const text of texts) {
      expect(text.trim(), text).not.toBe('');
      expect(text, text).not.toMatch(FORBIDDEN);
    }
  });

  it('US-003-06 la carga no promete tiempos ni muestra cifras', () => {
    expect(service.loading.title).not.toMatch(/\d/);
    expect(service.loading.description).not.toMatch(/\d/);
  });

  it('US-003-06 la acción principal es «Reintentar»', () => {
    expect(service.retryLabel).toBe('Reintentar');
  });

  it('US-003-06 el aviso de reintento automático es el acordado', () => {
    expect(service.autoRetryNotice).toBe('Comprobando la conexión automáticamente…');
  });
});
