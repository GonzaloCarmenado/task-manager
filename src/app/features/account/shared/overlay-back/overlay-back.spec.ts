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

@Component({ selector: 'app-stack-host', template: '' })
class StackHost {
  readonly closedA = vi.fn();
  readonly closedB = vi.fn();
  readonly service = inject(OverlayBack);
  readonly a = this.service.register(() => this.closedA());
  readonly b = this.service.register(() => this.closedB());
}

describe('OverlayBack · capas superpuestas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-011-02 el botón atrás cierra solo la capa de arriba', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(StackHost);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(fixture.componentInstance.closedB).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.closedA).not.toHaveBeenCalled();
  });

  it('US-011-02 al cerrarse la de arriba, el siguiente atrás cierra la de debajo', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(StackHost);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(fixture.componentInstance.closedA).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.closedB).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 closeAll retrocede todas las entradas de una vez y espera al historial', async () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const fixture = TestBed.createComponent(StackHost);

    await fixture.componentInstance.service.closeAll();

    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith(-2);
    expect(fixture.componentInstance.closedA).not.toHaveBeenCalled();
    expect(fixture.componentInstance.closedB).not.toHaveBeenCalled();
  });

  it('US-011-02 tras closeAll, destruir los componentes no vuelve a retroceder', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    vi.spyOn(window.history, 'go').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const fixture = TestBed.createComponent(StackHost);
    await fixture.componentInstance.service.closeAll();
    fixture.destroy();
    expect(back).not.toHaveBeenCalled();
  });

  it('US-011-02 sin capas abiertas closeAll no toca el historial', async () => {
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);
    await TestBed.inject(OverlayBack).closeAll();
    expect(go).not.toHaveBeenCalled();
  });

  it('US-011-02 si el historial no responde, closeAll no se queda colgado', async () => {
    vi.useFakeTimers();
    vi.spyOn(window.history, 'go').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(StackHost);
    const pending = fixture.componentInstance.service.closeAll();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBeUndefined();
  });
});

describe('OverlayBack · retrocesos propios', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-011-02 una capa retirada por código no cierra la de debajo con su propio retroceso', async () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const fixture = TestBed.createComponent(StackHost);
    const { closedA, closedB } = fixture.componentInstance;

    // La de arriba se retira por código (no es el botón atrás del usuario)
    await fixture.componentInstance.b.close();
    await Promise.resolve();

    expect(closedA).not.toHaveBeenCalled();
    expect(closedB).not.toHaveBeenCalled();
  });

  it('US-011-02 destruir una capa por código tampoco cierra la de debajo', async () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const top = TestBed.createComponent(Host);
    const below = TestBed.createComponent(Host);
    below.destroy(); // la más reciente se retira primero
    await new Promise((r) => setTimeout(r, 0));
    expect(top.componentInstance.closed).not.toHaveBeenCalled();
  });

  it('US-011-02 un retroceso del usuario posterior sí cierra la capa que queda', async () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const fixture = TestBed.createComponent(StackHost);
    await fixture.componentInstance.b.close();
    await new Promise((r) => setTimeout(r, 0));

    window.dispatchEvent(new PopStateEvent('popstate')); // ahora sí, el usuario
    expect(fixture.componentInstance.closedA).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 si el historial no respondió a un retroceso propio, no se traga el atrás del usuario', async () => {
    vi.useFakeTimers();
    vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(StackHost);
    const pending = fixture.componentInstance.b.close();
    await vi.advanceTimersByTimeAsync(5000);
    await pending;

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(fixture.componentInstance.closedA).toHaveBeenCalledTimes(1);
  });
});

describe('OverlayBack · el router procesa su popstate antes de seguir', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('US-011-02 closeAll y close resuelven tras la macrotarea que el router usa para su popstate', async () => {
    const order: string[] = [];
    // El router de Angular atiende el popstate dentro de un setTimeout(0)
    const routerLike = () => setTimeout(() => order.push('router'), 0);
    window.addEventListener('popstate', routerLike);
    vi.spyOn(window.history, 'go').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });

    const all = TestBed.createComponent(StackHost);
    await all.componentInstance.service.closeAll();
    order.push('despues-de-closeAll');

    const single = TestBed.createComponent(Host);
    await single.componentInstance.back.close();
    order.push('despues-de-close');

    window.removeEventListener('popstate', routerLike);
    expect(order).toEqual(['router', 'despues-de-closeAll', 'router', 'despues-de-close']);
  });
});
