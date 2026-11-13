import { isDevMode } from '@angular/core';
import { buildRoutes, routes } from './app.routes';
import { Home } from './features/home/home';
import { SessionStatusPreview } from './features/dev/session-status-preview';

const DEV_PATH = '__dev/session-status/:state';

describe('app.routes', () => {
  it('US-001-01 la ruta "" carga Home de forma lazy', async () => {
    const route = routes.find((r) => r.path === '');
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(route?.component).toBeUndefined();

    const loaded = await route?.loadComponent?.();
    expect(loaded).toBe(Home);
  });

  it('US-003-06 en producción no se registra ninguna ruta de desarrollo', () => {
    const production = buildRoutes(false);
    expect(production.some((r) => r.path?.startsWith('__dev'))).toBe(false);
    expect(production.map((r) => r.path)).toEqual(['']);
  });

  it('US-003-06 en desarrollo existe la ruta de vista previa y se carga de forma lazy', async () => {
    const development = buildRoutes(true);
    const route = development.find((r) => r.path === DEV_PATH);

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(await route?.loadComponent?.()).toBe(SessionStatusPreview);
  });

  it('US-003-06 las rutas de la app dependen de isDevMode()', () => {
    expect(routes.some((r) => r.path === DEV_PATH)).toBe(isDevMode());
  });

  it('US-003-06 la ruta de desarrollo no sustituye a la ruta principal', () => {
    expect(buildRoutes(true).find((r) => r.path === '')).toBeDefined();
  });
});
