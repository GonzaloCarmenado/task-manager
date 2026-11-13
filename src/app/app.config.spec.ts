import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { AuthAccessService } from './core/services/auth.access.service';

describe('appConfig', () => {
  it('US-003-01 inicializa la identidad una vez, antes del primer renderizado', async () => {
    const initialize = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, { provide: AuthAccessService, useValue: { initialize } }],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
