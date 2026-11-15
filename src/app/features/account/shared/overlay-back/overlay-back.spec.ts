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

describe('OverlayBack · cierre controlado', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-011-04 close() retrocede una vez y espera a que el historial se asiente', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const fixture = TestBed.createComponent(Host);
    const closed = fixture.componentInstance.closed;

    await fixture.componentInstance.back.close();

    expect(back).toHaveBeenCalledTimes(1);
    expect(closed).not.toHaveBeenCalled(); // cerrar por código no se confunde con el botón atrás
  });

  it('US-011-04 tras close(), destruir el componente no vuelve a retroceder', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.componentInstance.back.close();
    fixture.destroy();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('US-011-04 si el historial no responde, close() no se queda colgado', async () => {
    vi.useFakeTimers();
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);

    const pending = fixture.componentInstance.back.close();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(pending).resolves.toBeUndefined();
  });

  it('US-011-04 si el usuario ya retrocedió, close() no retrocede otra vez', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Host);
    window.dispatchEvent(new PopStateEvent('popstate'));

    await fixture.componentInstance.back.close();

    expect(back).not.toHaveBeenCalled();
  });
});
