import { isDevMode } from '@angular/core';
import { buildRoutes, routes } from './app.routes';
import { TaskForm } from './features/tasks/task-form/task-form';
import { TasksList } from './features/tasks/tasks-list/tasks-list';
import { SessionStatusPreview } from './features/dev/session-status-preview';

import { BiometricPreview } from './features/dev/biometric-preview';

const DEV_PATH = '__dev/session-status/:state';
const BIOMETRIC_DEV_PATH = '__dev/biometric/:state';

describe('app.routes', () => {
  it('US-005-02 la ruta "" carga la lista de tareas de forma lazy', async () => {
    const route = routes.find((r) => r.path === '');
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(route?.component).toBeUndefined();

    const loaded = await route?.loadComponent?.();
    expect(loaded).toBe(TasksList);
  });

  it('US-005-01 las rutas nueva y :id cargan el formulario de forma lazy, con nueva antes que :id', async () => {
    const paths = routes.map((r) => r.path);
    expect(paths.indexOf('nueva')).toBeGreaterThan(-1);
    expect(paths.indexOf('nueva')).toBeLessThan(paths.indexOf(':id'));
    for (const path of ['nueva', ':id']) {
      const route = routes.find((r) => r.path === path);
      expect(route?.loadComponent, path).toBeTypeOf('function');
      expect(route?.component, path).toBeUndefined();
      expect(await route?.loadComponent?.(), path).toBe(TaskForm);
    }
  });

  it('US-005-01 ya no existe la pantalla de bienvenida provisional', () => {
    expect(routes.some((r) => r.path === 'home')).toBe(false);
  });

  it('US-003-06 en producción no se registra ninguna ruta de desarrollo', () => {
    const production = buildRoutes(false);
    expect(production.some((r) => r.path?.startsWith('__dev'))).toBe(false);
    expect(production.map((r) => r.path)).toEqual(['', 'nueva', ':id']);
  });

  it('US-003-06 en desarrollo existe la ruta de vista previa y se carga de forma lazy', async () => {
    const development = buildRoutes(true);
    const route = development.find((r) => r.path === DEV_PATH);

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(await route?.loadComponent?.()).toBe(SessionStatusPreview);
  });

  it('US-004-01 en desarrollo existe la ruta de vista previa del bloqueo, lazy, y no en producción', async () => {
    const route = buildRoutes(true).find((r) => r.path === BIOMETRIC_DEV_PATH);

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(await route?.loadComponent?.()).toBe(BiometricPreview);
    expect(buildRoutes(false).some((r) => r.path === BIOMETRIC_DEV_PATH)).toBe(false);
  });

  it('US-003-06 las rutas de la app dependen de isDevMode()', () => {
    expect(routes.some((r) => r.path === DEV_PATH)).toBe(isDevMode());
    expect(routes.some((r) => r.path === BIOMETRIC_DEV_PATH)).toBe(isDevMode());
  });

  it('US-003-06 la ruta de desarrollo no sustituye a la ruta principal', () => {
    expect(buildRoutes(true).find((r) => r.path === '')).toBeDefined();
  });
});
