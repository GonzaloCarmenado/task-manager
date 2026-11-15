import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OverlayBack } from './overlay-back';

@Component({ selector: 'app-host', template: '' })
class Host {
  readonly closed = vi.fn();
  readonly back = inject(OverlayBack).register(() => this.closed());
}

describe('OverlayBack', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('US-011-03 al abrir añade una entrada al historial que absorbe el botón atrás de Android', () => {
    const push = vi.spyOn(window.history, 'pushState');
    TestBed.createComponent(Host);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('US-011-03 el botón atrás (popstate) cierra la capa', () => {
    const fixture = TestBed.createComponent(Host);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(fixture.componentInstance.closed).toHaveBeenCalledTimes(1);
  });

  it('US-011-03 si se cierra sin haber retrocedido, retrocede para no dejar la entrada', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    fixture.destroy();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('US-011-03 si ya retrocedió el usuario, al destruirse no retrocede otra vez', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    window.dispatchEvent(new PopStateEvent('popstate'));
    fixture.destroy();
    expect(back).not.toHaveBeenCalled();
  });

  it('US-011-03 tras destruirse deja de escuchar el botón atrás', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    const closed = fixture.componentInstance.closed;
    fixture.destroy();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(closed).not.toHaveBeenCalled();
  });
});
