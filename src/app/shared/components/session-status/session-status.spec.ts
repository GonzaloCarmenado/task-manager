import { TestBed } from '@angular/core/testing';
import { AuthErrorReason, AuthStatus } from '../../../core/models/auth-status';
import { SessionStatus } from './session-status';
import { SessionStatusConstructorService } from './session-status.constructor.service';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const REASONS: readonly AuthErrorReason[] = [
  'network',
  'rate_limited',
  'disabled',
  'timeout',
  'service_unavailable',
  'unknown',
];

const PROTOTYPE_TEXT =
  /simulador|modo oscuro|modo claro|herramienta de prueba|system recovery|modo r[áa]pido|simular fallo/i;
const INEXACT_TEXT = /dispositivo|a salvo|\bXP\b|racha|nivel|%|\d+\s*segundos/i;

describe('SessionStatus', () => {
  let copy: SessionStatusConstructorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SessionStatus] }).compileComponents();
    copy = TestBed.inject(SessionStatusConstructorService);
  });

  function render(
    status: AuthStatus,
    reason: AuthErrorReason | null = null,
    autoRetryPending = false
  ) {
    const fixture = TestBed.createComponent(SessionStatus);
    fixture.componentRef.setInput('status', status);
    fixture.componentRef.setInput('reason', reason);
    fixture.componentRef.setInput('autoRetryPending', autoRetryPending);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-003-06 loading muestra la pantalla de carga con su mensaje y sin acciones', () => {
    const { el, text } = render('loading');

    expect(text()).toContain(copy.loading.title);
    expect(text()).toContain(copy.loading.description);
    expect(el.querySelector('[data-testid="spinner"]')).not.toBeNull();
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });

  it('US-003-06 idle se trata como loading', () => {
    const { text, el } = render('idle');
    expect(text()).toContain(copy.loading.title);
    expect(el.querySelector('button')).toBeNull();
  });

  it('US-003-06 la carga es indeterminada: sin porcentaje, pasos, XP, racha ni nivel', () => {
    const { el, text } = render('loading');

    expect(text()).not.toMatch(INEXACT_TEXT);
    expect(el.querySelector('[role="progressbar"]')).toBeNull();
    expect(el.querySelector('progress')).toBeNull();
    expect(el.querySelector('[aria-valuenow]')).toBeNull();
  });

  it('US-003-06 ready no pinta nada', () => {
    const { el } = render('ready');
    expect(el.textContent?.trim()).toBe('');
    expect(el.querySelector('button')).toBeNull();
  });

  it('US-003-06 cada motivo de error muestra su título y su descripción', () => {
    for (const reason of REASONS) {
      const { text } = render('error', reason);
      const expected = copy.errorCopy(reason);
      expect(text(), reason).toContain(expected.title);
      expect(text(), reason).toContain(expected.description);
    }
  });

  it('US-003-06 los 6 motivos se agrupan en 5 variantes (disabled como servicio no disponible)', () => {
    const variant = (reason: AuthErrorReason) =>
      render('error', reason).el.querySelector('[data-variant]')?.getAttribute('data-variant');

    expect(variant('disabled')).toBe(variant('service_unavailable'));
    const variants = new Set(REASONS.map((reason) => variant(reason)));
    expect(variants.size).toBe(5);
  });

  it('US-003-06 un error sin motivo cae en la variante de error inesperado', () => {
    const { text } = render('error', null);
    expect(text()).toContain(copy.errorCopy('unknown').title);
  });

  it('US-003-06 el error se anuncia como alerta y lleva un icono decorativo', () => {
    const { el } = render('error', 'network');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('app-icon svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('US-003-06 Reintentar emite retry', () => {
    const { fixture, el } = render('error', 'network');
    const emitted = vi.fn();
    fixture.componentInstance.retry.subscribe(emitted);

    const button = el.querySelector('button');
    expect(button?.textContent).toContain(copy.retryLabel);
    expect(button?.getAttribute('type')).toBe('button');
    button?.click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('US-003-06 el aviso de comprobación automática solo aparece con reintentos pendientes', () => {
    const pending = render('error', 'network', true);
    expect(pending.text()).toContain(copy.autoRetryNotice);
    expect(pending.text()).toContain(copy.autoRetryHint);
    expect(pending.text()).not.toContain(copy.manualRetryHint);

    const idle = render('error', 'network', false);
    expect(idle.text()).not.toContain(copy.autoRetryNotice);
    expect(idle.text()).toContain(copy.manualRetryHint);

    const rateLimited = render('error', 'rate_limited', false);
    expect(rateLimited.text()).not.toContain(copy.autoRetryNotice);
  });

  it('US-003-06 ningún texto es inexacto ni de prototipo', () => {
    const states: Array<[AuthStatus, AuthErrorReason | null, boolean]> = [
      ['loading', null, false],
      ...REASONS.flatMap((reason): Array<[AuthStatus, AuthErrorReason | null, boolean]> => [
        ['error', reason, true],
        ['error', reason, false],
      ]),
    ];
    for (const [status, reason, pending] of states) {
      const { text } = render(status, reason, pending);
      expect(text(), `${status}/${reason}`).not.toMatch(PROTOTYPE_TEXT);
      expect(text(), `${status}/${reason}`).not.toMatch(INEXACT_TEXT);
    }
  });

  it('US-003-06 no hay elementos de prototipo: sin simulador, selector de tema, formularios ni barra de volver', () => {
    for (const reason of REASONS) {
      const { el } = render('error', reason, true);
      expect(el.querySelector('[role="tablist"]')).toBeNull();
      expect(el.querySelector('input, select, textarea, a, nav, header')).toBeNull();
      expect(el.querySelectorAll('button').length).toBe(1);
    }
  });

  it('US-003-06 usa ChangeDetectionStrategy.OnPush', () => {
    expect((SessionStatus as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
