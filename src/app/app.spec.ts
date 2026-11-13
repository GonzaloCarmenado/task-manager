import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthErrorReason, AuthStatus } from './core/models/auth-status';
import { AuthAccessService } from './core/services/auth.access.service';
import { App } from './app';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup(initial: AuthStatus, options: { path?: string } = {}) {
  const status = signal<AuthStatus>(initial);
  const errorReason = signal<AuthErrorReason | null>(null);
  const autoRetryPending = signal(false);
  const retry = vi.fn();
  const auth = { status, errorReason, autoRetryPending, retry, initialize: vi.fn() };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [App],
    providers: [
      provideRouter([]),
      { provide: AuthAccessService, useValue: auth },
      { provide: Location, useValue: { path: () => options.path ?? '/' } },
    ],
  });
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, status, errorReason, autoRetryPending, retry };
}

describe('App', () => {
  it('US-003-01 crea la app', () => {
    const { fixture } = setup('ready');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('US-003-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((App as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
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
