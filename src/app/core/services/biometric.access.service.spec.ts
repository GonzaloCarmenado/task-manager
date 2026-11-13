import { TestBed } from '@angular/core/testing';
import { BiometricAccessService, classifyBiometricError } from './biometric.access.service';
import { PlatformService } from './platform.service';

const plugin = vi.hoisted(() => ({
  loaded: vi.fn(),
  authenticate: vi.fn(),
  checkStatus: vi.fn(),
}));

vi.mock('@choochmeque/tauri-plugin-biometry-api', () => {
  plugin.loaded();
  return { authenticate: plugin.authenticate, checkStatus: plugin.checkStatus };
});

function setup(supported: boolean): BiometricAccessService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: PlatformService, useValue: { isTauriAndroid: () => supported } }],
  });
  return TestBed.inject(BiometricAccessService);
}

describe('BiometricAccessService · fuera de Android', () => {
  beforeEach(() => vi.clearAllMocks());

  // Debe ir el primero del fichero: comprueba que el módulo del plugin nunca llega a cargarse.
  it('US-004-04 fuera de Android no se importa el módulo del plugin', async () => {
    const service = setup(false);

    await service.isAvailable();
    await service.confirm();
    await service.unlock();

    expect(plugin.loaded).not.toHaveBeenCalled();
    expect(plugin.checkStatus).not.toHaveBeenCalled();
    expect(plugin.authenticate).not.toHaveBeenCalled();
  });

  it('US-004-04 fuera de Android no está soportado, no está disponible y no se puede autenticar', async () => {
    const service = setup(false);

    expect(service.isSupported()).toBe(false);
    expect(await service.isAvailable()).toBe(false);
    expect(await service.confirm()).toEqual({ ok: false, reason: 'unavailable' });
    expect(await service.unlock()).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('BiometricAccessService · Android', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plugin.authenticate.mockResolvedValue(undefined);
    plugin.checkStatus.mockResolvedValue({ isAvailable: true, biometryType: 1 });
  });

  it('US-004-01 isSupported() es verdadero y isAvailable() refleja checkStatus', async () => {
    const service = setup(true);
    expect(service.isSupported()).toBe(true);
    expect(await service.isAvailable()).toBe(true);

    plugin.checkStatus.mockResolvedValue({ isAvailable: false, biometryType: 0 });
    expect(await service.isAvailable()).toBe(false);
  });

  it('US-004-03 si checkStatus lanza, no está disponible y no se propaga el error', async () => {
    plugin.checkStatus.mockRejectedValue(new Error('boom'));
    expect(await setup(true).isAvailable()).toBe(false);
  });

  it('US-004-01 confirm(): solo biometría, con título, subtítulo y «Cancelar» en español', async () => {
    const result = await setup(true).confirm();

    expect(result).toEqual({ ok: true });
    expect(plugin.authenticate).toHaveBeenCalledTimes(1);
    const [reason, options] = plugin.authenticate.mock.calls[0];
    expect(typeof reason).toBe('string');
    expect(options).toMatchObject({
      allowDeviceCredential: false,
      cancelTitle: 'Cancelar',
      confirmationRequired: false,
    });
    expect(options.title).toBeTruthy();
    expect(options.subtitle).toBeTruthy();
  });

  it('US-004-02 unlock(): permite el método del móvil y usa título y subtítulo en español', async () => {
    const result = await setup(true).unlock();

    expect(result).toEqual({ ok: true });
    const [, options] = plugin.authenticate.mock.calls[0];
    expect(options).toMatchObject({ allowDeviceCredential: true, confirmationRequired: false });
    expect(options.title).toBeTruthy();
    expect(options.subtitle).toBeTruthy();
    // con la credencial del móvil permitida Android no admite botón de cancelar propio
    expect(options.cancelTitle).toBeUndefined();
  });

  it('US-004-02 los textos que se pasan al plugin están en español (no los de por defecto en inglés)', async () => {
    const service = setup(true);
    await service.confirm();
    await service.unlock();

    for (const [reason, options] of plugin.authenticate.mock.calls) {
      const text = [reason, options.title, options.subtitle, options.cancelTitle]
        .filter(Boolean)
        .join(' | ');
      expect(text).not.toMatch(/authenticat|fingerprint|cancel\b|verify|identity|biometric/i);
    }
  });

  it('US-004-03 un fallo del plugin se devuelve clasificado, sin lanzar', async () => {
    const service = setup(true);
    const cases: Array<[unknown, string]> = [
      ['userCancel', 'cancelled'],
      [{ message: 'Authentication canceled by user' }, 'cancelled'],
      ['biometryLockout', 'lockout'],
      [new Error('Too many attempts. Try again later'), 'lockout'],
      [{ errorCode: 'biometryNotEnrolled' }, 'unavailable'],
      ['passcodeNotSet', 'unavailable'],
      ['authenticationFailed', 'failed'],
      [undefined, 'failed'],
    ];
    for (const [error, expected] of cases) {
      plugin.authenticate.mockRejectedValueOnce(error);
      expect(await service.unlock(), String(expected)).toEqual({ ok: false, reason: expected });
    }
  });

  it('US-004-03 nunca escribe resultados ni errores del plugin en consola', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );
    const service = setup(true);
    plugin.authenticate.mockRejectedValueOnce(new Error('detalle interno del plugin'));
    plugin.checkStatus.mockRejectedValueOnce(new Error('otro detalle'));

    await service.unlock();
    await service.isAvailable();
    await service.confirm();

    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe('classifyBiometricError', () => {
  it('US-004-03 clasifica por patrones, de más específico a menos, con failed por defecto', () => {
    expect(classifyBiometricError('USER_CANCEL')).toBe('cancelled');
    expect(classifyBiometricError('systemCancel')).toBe('cancelled');
    expect(classifyBiometricError('Dismissed')).toBe('cancelled');
    expect(classifyBiometricError('negative button pressed')).toBe('cancelled');
    expect(classifyBiometricError('Lockout')).toBe('lockout');
    expect(classifyBiometricError('none enrolled')).toBe('unavailable');
    expect(classifyBiometricError('no hardware')).toBe('unavailable');
    expect(classifyBiometricError('biometryNotAvailable')).toBe('unavailable');
    expect(classifyBiometricError('cualquier otra cosa')).toBe('failed');
  });

  it('US-004-03 admite cadenas y objetos con message, code o errorCode, y valores raros', () => {
    expect(classifyBiometricError({ code: 'userCancel' })).toBe('cancelled');
    expect(classifyBiometricError({ errorCode: 'biometryLockout' })).toBe('lockout');
    expect(classifyBiometricError({ message: 'passcodeNotSet' })).toBe('unavailable');
    for (const value of [null, undefined, 42, {}, [], Symbol('x')]) {
      expect(classifyBiometricError(value)).toBe('failed');
    }
  });
});
