import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthErrorReason, AuthStatus } from './core/models/auth-status';
import { LockPhase } from './core/models/biometric';
import { AuthAccessService } from './core/services/auth.access.service';
import { BiometricLockService } from './core/services/biometric-lock.service';
import { AccountAccessService } from './features/account/account.access.service';
import { AccountToastService } from './features/account/shared/account-toast/account-toast.service';
import { App } from './app';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup(initial: AuthStatus, options: { path?: string } = {}) {
  const status = signal<AuthStatus>(initial);
  const errorReason = signal<AuthErrorReason | null>(null);
  const autoRetryPending = signal(false);
  const retry = vi.fn();
  const auth = { status, errorReason, autoRetryPending, retry, initialize: vi.fn() };
  const resumeTransfer = vi.fn(async () => undefined);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      { provide: AuthAccessService, useValue: auth },
      { provide: AccountAccessService, useValue: { resumePendingTransfer: resumeTransfer } },
      { provide: Location, useValue: { path: () => options.path ?? '/' } },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, status, errorReason, autoRetryPending, retry, resumeTransfer };
}

describe('App', () => {
  it('US-003-01 crea la app', () => {
    const { fixture } = setup('ready');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('US-003-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((App as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });

  it('US-011-01 monta el aviso de la cuenta una sola vez, y publica avisos sobre cualquier pantalla', () => {
    const { el, fixture } = setup('ready');
    expect(el.querySelectorAll('app-account-toast')).toHaveLength(1);
    TestBed.inject(AccountToastService).show('Sesión cerrada');
    fixture.detectChanges();
    expect(el.querySelector('app-account-toast [role="status"]')?.textContent).toContain(
      'Sesión cerrada'
    );
  });

  it('US-011-02 reanuda un traspaso de tareas a medias al tener identidad lista, y no antes', () => {
    const loading = setup('loading');
    expect(loading.resumeTransfer).not.toHaveBeenCalled();
    loading.status.set('ready');
    loading.fixture.detectChanges();
    expect(loading.resumeTransfer).toHaveBeenCalledTimes(1);

    const ready = setup('ready');
    expect(ready.resumeTransfer).toHaveBeenCalledTimes(1);
  });

  it('US-003-01 con ready pinta el router-outlet y no la pantalla de estado', () => {
    const { el } = setup('ready');
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('app-session-status')).toBeNull();
  });

  it('US-003-01 no pinta contenido hasta ready: loading muestra la carga y no el router-outlet', () => {
    const { el } = setup('loading');
    expect(el.querySelector('router-outlet')).toBeNull();
    expect(el.querySelector('app-session-status [data-testid="spinner"]')).not.toBeNull();
  });

  it('US-003-01 idle tampoco pinta contenido: muestra la carga', () => {
    const { el } = setup('idle');
    expect(el.querySelector('router-outlet')).toBeNull();
    expect(el.querySelector('app-session-status')).not.toBeNull();
  });

  it('US-003-06 con error muestra la pantalla de error con el motivo y sin contenido', () => {
    const { el, errorReason, status, fixture } = setup('loading');
    errorReason.set('network');
    status.set('error');
    fixture.detectChanges();

    expect(el.querySelector('router-outlet')).toBeNull();
    expect(el.textContent).toContain('Sin conexión');
  });

  it('US-003-06 Reintentar llama a retry() del servicio', () => {
    const { el, errorReason, status, fixture, retry } = setup('loading');
    errorReason.set('timeout');
    status.set('error');
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('button.retry')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('US-003-06 el aviso de reintento automático sigue a autoRetryPending', () => {
    const { el, errorReason, status, autoRetryPending, fixture } = setup('loading');
    errorReason.set('network');
    status.set('error');
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Comprobando la conexión');

    autoRetryPending.set(true);
    fixture.detectChanges();
    expect(el.textContent).toContain('Comprobando la conexión');
  });

  it('US-003-06 al pasar a ready desaparece la pantalla de estado y aparece el contenido', () => {
    const { el, status, fixture } = setup('loading');
    expect(el.querySelector('app-session-status')).not.toBeNull();

    status.set('ready');
    fixture.detectChanges();

    expect(el.querySelector('app-session-status')).toBeNull();
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });

  it('US-003-01 con sesión guardada (ready desde el inicio) no se llega a ver la carga', () => {
    const { el } = setup('ready');
    expect(el.querySelector('app-session-status')).toBeNull();
  });

  it('US-003-06 solo en desarrollo, la vista previa de estados no queda tapada por la pantalla de sesión', () => {
    const { el } = setup('loading', { path: '/__dev/session-status/network' });
    expect(el.querySelector('router-outlet')).not.toBeNull();
    expect(el.querySelector('app-session-status')).toBeNull();
  });

  it('US-003-06 una ruta normal no se salta la pantalla de sesión', () => {
    const { el } = setup('loading', { path: '/tareas' });
    expect(el.querySelector('router-outlet')).toBeNull();
  });
});

function setupLock(authStatus: AuthStatus = 'ready') {
  const lock = {
    overlayVisible: signal(false),
    phase: signal<LockPhase>('prompting'),
    noticeVisible: signal(false),
    offerVisible: signal(false),
    activating: signal(false),
    unlock: vi.fn(),
    acceptOffer: vi.fn(),
    later: vi.fn(),
    never: vi.fn(),
    acknowledgeNotice: vi.fn(),
  };
  const auth = {
    status: signal<AuthStatus>(authStatus),
    errorReason: signal<AuthErrorReason | null>(null),
    autoRetryPending: signal(false),
    retry: vi.fn(),
    initialize: vi.fn(),
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      { provide: AuthAccessService, useValue: auth },
      { provide: AccountAccessService, useValue: { resumePendingTransfer: async () => undefined } },
      { provide: BiometricLockService, useValue: lock },
      { provide: Location, useValue: { path: () => '/' } },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const content = () => el.querySelector<HTMLElement>('[data-testid="app-content"]');
  return { fixture, el, lock, auth, content };
}

describe('App · bloqueo con huella', () => {
  it('US-004-02 sin bloqueo no hay superposiciones y el contenido es interactivo', () => {
    const { el, content } = setupLock();
    expect(el.querySelector('app-biometric-lock-screen')).toBeNull();
    expect(el.querySelector('app-biometric-notice')).toBeNull();
    expect(el.querySelector('app-biometric-offer')).toBeNull();
    expect(content()?.hasAttribute('inert')).toBe(false);
    expect(content()?.getAttribute('aria-hidden')).toBeNull();
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });

  it('US-004-02 con el bloqueo pinta la pantalla encima, deja el contenido inerte y oculto', () => {
    const { fixture, el, lock, content } = setupLock();
    lock.phase.set('cancelled');
    lock.overlayVisible.set(true);
    fixture.detectChanges();

    expect(el.querySelector('app-biometric-lock-screen')).not.toBeNull();
    expect(el.querySelector('app-biometric-lock-screen [data-phase="cancelled"]')).not.toBeNull();
    expect(content()?.hasAttribute('inert')).toBe(true);
    expect(content()?.getAttribute('aria-hidden')).toBe('true');
    // el contenido sigue montado: conserva su estado al desbloquear
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });

  it('US-004-02 «Desbloquear con huella» llama a unlock() del servicio', () => {
    const { fixture, el, lock } = setupLock();
    lock.phase.set('cancelled');
    lock.overlayVisible.set(true);
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('app-biometric-lock-screen button')?.click();

    expect(lock.unlock).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 al desbloquear desaparece la superposición y el contenido vuelve a ser interactivo', () => {
    const { fixture, el, lock, content } = setupLock();
    lock.overlayVisible.set(true);
    fixture.detectChanges();
    lock.overlayVisible.set(false);
    fixture.detectChanges();

    expect(el.querySelector('app-biometric-lock-screen')).toBeNull();
    expect(content()?.hasAttribute('inert')).toBe(false);
  });

  it('US-004-02 la precedencia es bloqueo > aviso > oferta (solo una a la vez)', () => {
    const { fixture, el, lock } = setupLock();
    lock.offerVisible.set(true);
    lock.noticeVisible.set(true);
    lock.overlayVisible.set(true);
    fixture.detectChanges();
    expect(el.querySelector('app-biometric-lock-screen')).not.toBeNull();
    expect(el.querySelector('app-biometric-notice')).toBeNull();
    expect(el.querySelector('app-biometric-offer')).toBeNull();

    lock.overlayVisible.set(false);
    fixture.detectChanges();
    expect(el.querySelector('app-biometric-notice')).not.toBeNull();
    expect(el.querySelector('app-biometric-offer')).toBeNull();

    lock.noticeVisible.set(false);
    fixture.detectChanges();
    expect(el.querySelector('app-biometric-offer')).not.toBeNull();
  });

  it('US-004-01 la oferta emite sus tres respuestas al servicio y bloquea las acciones al activar', () => {
    const { fixture, el, lock } = setupLock();
    lock.offerVisible.set(true);
    fixture.detectChanges();

    const buttons = Array.from(
      el.querySelectorAll<HTMLButtonElement>('app-biometric-offer button')
    );
    buttons[0].click();
    buttons[1].click();
    buttons[2].click();
    expect(lock.acceptOffer).toHaveBeenCalledTimes(1);
    expect(lock.later).toHaveBeenCalledTimes(1);
    expect(lock.never).toHaveBeenCalledTimes(1);

    lock.activating.set(true);
    fixture.detectChanges();
    buttons.forEach((b) => expect(b.disabled).toBe(true));
  });

  it('US-004-03 el aviso se cierra con «Entendido» llamando a acknowledgeNotice()', () => {
    const { fixture, el, lock } = setupLock();
    lock.noticeVisible.set(true);
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>('app-biometric-notice button')?.click();

    expect(lock.acknowledgeNotice).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 el bloqueo también tapa la pantalla de sesión mientras carga', () => {
    const { fixture, el, lock, content } = setupLock('loading');
    lock.overlayVisible.set(true);
    fixture.detectChanges();

    expect(el.querySelector('app-biometric-lock-screen')).not.toBeNull();
    expect(content()?.hasAttribute('inert')).toBe(true);
  });
});
