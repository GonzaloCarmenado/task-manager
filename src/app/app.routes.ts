import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';

/** Las rutas de desarrollo (vista previa de estados) solo se registran fuera de producción. */
export function buildRoutes(devMode: boolean): Routes {
  return [
    {
      path: '',
      loadComponent: () => import('./features/home/home').then((m) => m.Home),
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
