import { routes } from './app.routes';
import { Home } from './features/home/home';

describe('app.routes', () => {
  it('US-001-01 la ruta "" carga Home de forma lazy', async () => {
    const route = routes.find((r) => r.path === '');
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(route?.component).toBeUndefined();

    const loaded = await route?.loadComponent?.();
    expect(loaded).toBe(Home);
  });
});
