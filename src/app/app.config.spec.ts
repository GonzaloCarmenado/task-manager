import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { AuthAccessService } from './core/services/auth.access.service';
import { BiometricLockService } from './core/services/biometric-lock.service';

function setup(order: string[] = []) {
  const initialize = vi.fn(() => order.push('auth'));
  const initializeLock = vi.fn(() => order.push('lock'));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      { provide: AuthAccessService, useValue: { initialize } },
      { provide: BiometricLockService, useValue: { initialize: initializeLock } },
    ],
  });
  return { initialize, initializeLock, order };
}

describe('appConfig', () => {
  it('US-003-01 inicializa la identidad una vez, antes del primer renderizado', async () => {
    const { initialize } = setup();

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 arranca el bloqueo una vez, antes del primer renderizado y sin esperar a la red', async () => {
    const { initializeLock } = setup();

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(initializeLock).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 el bloqueo se inicializa antes que la identidad', async () => {
    const { order } = setup();

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(order).toEqual(['lock', 'auth']);
  });
});
