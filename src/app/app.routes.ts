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
      path: 'progreso',
      loadComponent: () =>
        import('./features/progress/progress-screen/progress-screen').then((m) => m.ProgressScreen),
    },
    {
      path: 'nivel/:level',
      loadComponent: () => import('./features/progress/level-up/level-up').then((m) => m.LevelUp),
    },
    {
      path: 'cuenta',
      loadComponent: () =>
        import('./features/account/account-screen/account-screen').then((m) => m.AccountScreen),
    },
    {
      path: 'cuenta/crear',
      loadComponent: () =>
        import('./features/account/create-account/create-account').then((m) => m.CreateAccount),
    },
    {
      path: 'cuenta/entrar',
      loadComponent: () => import('./features/account/sign-in/sign-in').then((m) => m.SignIn),
    },
    {
      path: 'cuenta/contrasena',
      loadComponent: () =>
        import('./features/account/change-password/change-password').then((m) => m.ChangePassword),
    },
    {
      path: 'cuenta/borrar',
      loadComponent: () =>
        import('./features/account/delete-account/delete-account').then((m) => m.DeleteAccount),
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
            path: '__dev/alarms/:state',
            loadComponent: () =>
              import('./features/dev/alarms-preview').then((m) => m.AlarmsPreview),
          },
          {
            path: '__dev/postpone/:state',
            loadComponent: () =>
              import('./features/dev/postpone-preview').then((m) => m.PostponePreview),
          },
          {
            path: '__dev/progress/:state',
            loadComponent: () =>
              import('./features/dev/progress-preview').then((m) => m.ProgressPreview),
          },
          {
            path: '__dev/account/:screen/:state',
            loadComponent: () =>
              import('./features/dev/account-preview').then((m) => m.AccountPreview),
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
