import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';

/**
 * Rutas de la app. `nueva` va antes que `:id` para que no se interprete como identificador.
 * Las rutas de desarrollo (vista previa de estados) solo se registran fuera de producción.
 */
export function buildRoutes(devMode: boolean): Routes {
  return [
    {
      path: '',
      loadComponent: () =>
        import('./features/tasks/tasks-list/tasks-list').then((m) => m.TasksList),
    },
    {
      path: 'nueva',
      loadComponent: () => import('./features/tasks/task-form/task-form').then((m) => m.TaskForm),
    },
    {
      path: ':id',
      loadComponent: () => import('./features/tasks/task-form/task-form').then((m) => m.TaskForm),
    },
    ...(devMode
      ? [
          {
            path: '__dev/session-status/:state',
            loadComponent: () =>
              import('./features/dev/session-status-preview').then((m) => m.SessionStatusPreview),
          },
          {
            path: '__dev/biometric/:state',
            loadComponent: () =>
              import('./features/dev/biometric-preview').then((m) => m.BiometricPreview),
          },
        ]
      : []),
  ];
}

export const routes: Routes = buildRoutes(isDevMode());
