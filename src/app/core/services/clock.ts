import { InjectionToken } from '@angular/core';

/** Reloj inyectable para poder simular la hora en los tests. */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});
