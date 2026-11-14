import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { AuthAccessService } from './core/services/auth.access.service';
import { BiometricLockService } from './core/services/biometric-lock.service';
import { AlarmsAccessService } from './features/tasks/alarms/alarms.access.service';

function setup(order: string[] = []) {
  const initialize = vi.fn(() => order.push('auth'));
  const initializeLock = vi.fn(() => order.push('lock'));
  const initializeAlarms = vi.fn(() => order.push('alarms'));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ...appConfig.providers,
      { provide: AuthAccessService, useValue: { initialize } },
      { provide: BiometricLockService, useValue: { initialize: initializeLock } },
      { provide: AlarmsAccessService, useValue: { initialize: initializeAlarms } },
    ],
  });
  return { initialize, initializeLock, initializeAlarms, order };
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

    expect(order.indexOf('lock')).toBeLessThan(order.indexOf('auth'));
  });

  it('US-006-01 arranca las alarmas una vez, sin esperar a la red y después de la identidad', async () => {
    const { initializeAlarms, order } = setup();

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(initializeAlarms).toHaveBeenCalledTimes(1);
    expect(order.indexOf('alarms')).toBeGreaterThan(order.indexOf('auth'));
  });
});
