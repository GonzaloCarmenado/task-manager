import { isDevMode } from '@angular/core';
import { buildRoutes, routes } from './app.routes';
import { TaskForm } from './features/tasks/task-form/task-form';
import { TasksList } from './features/tasks/tasks-list/tasks-list';
import { SessionStatusPreview } from './features/dev/session-status-preview';

import { BiometricPreview } from './features/dev/biometric-preview';
import { AlarmsPreview } from './features/dev/alarms-preview';
import { PostponePreview } from './features/dev/postpone-preview';
import { ProgressPreview } from './features/dev/progress-preview';
import { AccountPreview } from './features/dev/account-preview';
import { AccountScreen } from './features/account/account-screen/account-screen';
import { CreateAccount } from './features/account/create-account/create-account';
import { LevelUp } from './features/progress/level-up/level-up';
import { ProgressScreen } from './features/progress/progress-screen/progress-screen';

const DEV_PATH = '__dev/session-status/:state';
const BIOMETRIC_DEV_PATH = '__dev/biometric/:state';
const ALARMS_DEV_PATH = '__dev/alarms/:state';
const POSTPONE_DEV_PATH = '__dev/postpone/:state';

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
    expect(production.map((r) => r.path)).toEqual([
      '',
      'nueva',
      'progreso',
      'nivel/:level',
      'cuenta',
      'cuenta/crear',
      ':id',
    ]);
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

  it('US-006-02 en desarrollo existe la ruta de vista previa de alarmas, lazy, y no en producción', async () => {
    const route = buildRoutes(true).find((r) => r.path === ALARMS_DEV_PATH);

    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeTypeOf('function');
    expect(await route?.loadComponent?.()).toBe(AlarmsPreview);
    expect(buildRoutes(false).some((r) => r.path === ALARMS_DEV_PATH)).toBe(false);
  });

  it('US-007-01 en desarrollo existe la ruta de vista previa de posponer, lazy, y no en producción', async () => {
    const route = buildRoutes(true).find((r) => r.path === POSTPONE_DEV_PATH);

    expect(route).toBeDefined();
    expect(await route?.loadComponent?.()).toBe(PostponePreview);
    expect(buildRoutes(false).some((r) => r.path === POSTPONE_DEV_PATH)).toBe(false);
  });

  it('US-008-04 en desarrollo existe la vista previa del progreso, lazy, y no en producción', async () => {
    const route = buildRoutes(true).find((r) => r.path === '__dev/progress/:state');
    expect(await route?.loadComponent?.()).toBe(ProgressPreview);
    expect(buildRoutes(false).some((r) => r.path === '__dev/progress/:state')).toBe(false);
  });

  it('US-008-04 progreso y nivel/:level son lazy y van antes que :id', async () => {
    const paths = buildRoutes(false).map((r) => r.path);
    expect(paths.indexOf('progreso')).toBeLessThan(paths.indexOf(':id'));
    expect(paths.indexOf('nivel/:level')).toBeLessThan(paths.indexOf(':id'));

    const progress = buildRoutes(false).find((r) => r.path === 'progreso');
    const level = buildRoutes(false).find((r) => r.path === 'nivel/:level');
    expect(progress?.component).toBeUndefined();
    expect(level?.component).toBeUndefined();
    expect(await progress?.loadComponent?.()).toBe(ProgressScreen);
    expect(await level?.loadComponent?.()).toBe(LevelUp);
  });

  it('US-003-06 las rutas de la app dependen de isDevMode()', () => {
    expect(routes.some((r) => r.path === DEV_PATH)).toBe(isDevMode());
    expect(routes.some((r) => r.path === BIOMETRIC_DEV_PATH)).toBe(isDevMode());
  });

  it('US-003-06 la ruta de desarrollo no sustituye a la ruta principal', () => {
    expect(buildRoutes(true).find((r) => r.path === '')).toBeDefined();
  });
});

describe('rutas de la cuenta', () => {
  it('US-011-01 la ruta cuenta/crear carga Crear cuenta de forma lazy y va antes que :id', async () => {
    const routes = buildRoutes(false);
    const route = routes.find((r) => r.path === 'cuenta/crear');
    expect(route?.component).toBeUndefined();
    expect(await route?.loadComponent?.()).toBe(CreateAccount);
    const paths = routes.map((r) => r.path);
    expect(paths.indexOf('cuenta/crear')).toBeLessThan(paths.indexOf(':id'));
  });

  it('US-011-03 la ruta cuenta carga la pantalla Cuenta de forma lazy y va antes que :id', async () => {
    const routes = buildRoutes(false);
    const route = routes.find((r) => r.path === 'cuenta');
    expect(route?.component).toBeUndefined();
    expect(await route?.loadComponent?.()).toBe(AccountScreen);
    const paths = routes.map((r) => r.path);
    expect(paths.indexOf('cuenta')).toBeLessThan(paths.indexOf(':id'));
  });

  it('US-011-01 en desarrollo existe la vista previa de cuenta, lazy, y no en producción', async () => {
    const path = '__dev/account/:screen/:state';
    const route = buildRoutes(true).find((r) => r.path === path);
    expect(await route?.loadComponent?.()).toBe(AccountPreview);
    expect(buildRoutes(false).some((r) => r.path === path)).toBe(false);
  });
});
