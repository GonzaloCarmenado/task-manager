import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BiometricFailure, BiometricResult, BIOMETRIC_PREFS_KEY } from '../models/biometric';
import { AuthStatus } from '../models/auth-status';
import { AuthAccessService } from './auth.access.service';
import { BiometricAccessService } from './biometric.access.service';
import { BIOMETRIC_STORAGE, BiometricLockService } from './biometric-lock.service';

const OK: BiometricResult = { ok: true };
const fail = (reason: BiometricFailure): BiometricResult => ({ ok: false, reason });

interface Options {
  supported?: boolean;
  available?: boolean;
  prefs?: unknown;
  rawPrefs?: string;
  storageThrows?: boolean;
  authStatus?: AuthStatus;
}

function setup(options: Options = {}) {
  const { supported = true, available = true, authStatus = 'ready' } = options;
  const store = new Map<string, string>();
  if (options.rawPrefs !== undefined) store.set(BIOMETRIC_PREFS_KEY, options.rawPrefs);
  else if (options.prefs !== undefined)
    store.set(BIOMETRIC_PREFS_KEY, JSON.stringify(options.prefs));

  const storage = {
    getItem: vi.fn((key: string) => {
      if (options.storageThrows) throw new Error('storage no disponible');
      return store.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (options.storageThrows) throw new Error('storage no disponible');
      store.set(key, value);
    }),
  };
  const access = {
    isSupported: vi.fn(() => supported),
    isAvailable: vi.fn(async () => available),
    confirm: vi.fn(async (): Promise<BiometricResult> => OK),
    unlock: vi.fn(async (): Promise<BiometricResult> => OK),
  };
  const authStatusSignal = signal<AuthStatus>(authStatus);

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: BiometricAccessService, useValue: access },
      { provide: AuthAccessService, useValue: { status: authStatusSignal } },
      { provide: BIOMETRIC_STORAGE, useValue: storage },
    ],
  });
  const service = TestBed.inject(BiometricLockService);
  const saved = () => JSON.parse(store.get(BIOMETRIC_PREFS_KEY) ?? 'null');
  return { service, access, storage, store, saved, authStatusSignal };
}

const enabledPrefs = {
  enabled: true,
  offerAnswer: 'pending',
  laterCount: 0,
  disabledNotice: false,
};

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

const visibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('BiometricLockService · preferencias locales', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-004-01 guarda solo las 4 preferencias no sensibles, con la clave acordada', async () => {
    const { service, saved, storage } = setup();
    service.initialize();
    await flush();

    await service.acceptOffer();

    expect(storage.setItem).toHaveBeenCalledWith(BIOMETRIC_PREFS_KEY, expect.any(String));
    expect(Object.keys(saved()).sort()).toEqual(
      ['disabledNotice', 'enabled', 'laterCount', 'offerAnswer'].sort()
    );
    expect(saved().enabled).toBe(true);
  });

  it('US-004-01 contenido ausente, corrupto o con tipos erróneos → valores por defecto', async () => {
    for (const rawPrefs of [
      'no es json',
      '{}',
      'null',
      '[]',
      '{"enabled":"si","laterCount":"x"}',
    ]) {
      const { service } = setup({ rawPrefs });
      service.initialize();
      await flush();
      expect(service.offerVisible(), rawPrefs).toBe(true);
      expect(service.locked(), rawPrefs).toBe(false);
    }
  });

  it('US-004-01 si el almacenamiento lanza, sigue funcionando con los valores por defecto', async () => {
    const { service } = setup({ storageThrows: true });
    service.initialize();
    await flush();

    expect(service.offerVisible()).toBe(true);
    await expect(service.acceptOffer()).resolves.toBeUndefined();
  });

  it('US-004-01 las señales son de solo lectura', () => {
    const { service } = setup();
    for (const s of [
      service.locked,
      service.covered,
      service.overlayVisible,
      service.phase,
      service.offerVisible,
      service.noticeVisible,
      service.activating,
    ]) {
      expect('set' in s).toBe(false);
      expect('update' in s).toBe(false);
    }
  });
});

describe('BiometricLockService · oferta (US-004-01)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  async function offer(options: Options = {}) {
    const ctx = setup(options);
    ctx.service.initialize();
    await flush();
    return ctx;
  }

  it('US-004-01 se ofrece con Android, biometría disponible, sin decidir y con la sesión lista', async () => {
    expect((await offer()).service.offerVisible()).toBe(true);
  });

  it('US-004-01 no se ofrece fuera de Android', async () => {
    expect((await offer({ supported: false })).service.offerVisible()).toBe(false);
  });

  it('US-004-01 sin biometría o sin bloqueo de pantalla del móvil no se ofrece nada', async () => {
    expect((await offer({ available: false })).service.offerVisible()).toBe(false);
  });

  it('US-004-01 no se ofrece si ya está activado, si dijo «No volver a preguntar» o tras tres «Ahora no»', async () => {
    expect((await offer({ prefs: enabledPrefs })).service.offerVisible()).toBe(false);
    expect(
      (
        await offer({ prefs: { ...enabledPrefs, enabled: false, offerAnswer: 'never' } })
      ).service.offerVisible()
    ).toBe(false);
    expect(
      (
        await offer({ prefs: { ...enabledPrefs, enabled: false, laterCount: 3 } })
      ).service.offerVisible()
    ).toBe(false);
    expect(
      (
        await offer({ prefs: { ...enabledPrefs, enabled: false, laterCount: 2 } })
      ).service.offerVisible()
    ).toBe(true);
  });

  it('US-004-01 solo se ofrece con la sesión lista, nunca durante la carga ni con un error de sesión', async () => {
    for (const authStatus of ['idle', 'loading', 'error'] as const) {
      expect((await offer({ authStatus })).service.offerVisible(), authStatus).toBe(false);
    }
    const ctx = await offer({ authStatus: 'loading' });
    ctx.authStatusSignal.set('ready');
    expect(ctx.service.offerVisible()).toBe(true);
  });

  it('US-004-01 Activar exige autenticar con la huella en ese momento y activa el bloqueo', async () => {
    const { service, access, saved } = await offer();

    await service.acceptOffer();

    expect(access.confirm).toHaveBeenCalledTimes(1);
    expect(saved().enabled).toBe(true);
    expect(service.offerVisible()).toBe(false);
    expect(service.locked()).toBe(false); // acaba de confirmar con la huella: no se bloquea ahora
  });

  it('US-004-01 si el usuario cancela la huella al activar, la oferta se cierra sin activar ni error', async () => {
    const { service, access, saved } = await offer();
    access.confirm.mockResolvedValue(fail('cancelled'));

    await service.acceptOffer();

    expect(service.offerVisible()).toBe(false);
    expect(saved()?.enabled ?? false).toBe(false);
    expect(saved()?.laterCount ?? 0).toBe(0);
    expect(service.phase()).not.toBe('failed');
  });

  it('US-004-01 si no se puede confirmar (no disponible o fallo), no se activa nada', async () => {
    for (const reason of ['unavailable', 'failed', 'lockout'] as const) {
      const { service, access, saved } = await offer();
      access.confirm.mockResolvedValue(fail(reason));
      await service.acceptOffer();
      expect(saved()?.enabled ?? false, reason).toBe(false);
      expect(service.offerVisible(), reason).toBe(false);
    }
  });

  it('US-004-01 activating es verdadero mientras se confirma la huella', async () => {
    const { service, access } = await offer();
    let finish!: (value: BiometricResult) => void;
    access.confirm.mockReturnValue(new Promise<BiometricResult>((r) => (finish = r)));

    const pending = service.acceptOffer();
    expect(service.activating()).toBe(true);
    finish(OK);
    await pending;

    expect(service.activating()).toBe(false);
  });

  it('US-004-01 «Ahora no» cuenta, cierra la oferta y a la tercera equivale a «No volver a preguntar»', async () => {
    const first = await offer();
    first.service.later();
    expect(first.saved().laterCount).toBe(1);
    expect(first.service.offerVisible()).toBe(false);

    const third = await offer({ prefs: { ...enabledPrefs, enabled: false, laterCount: 2 } });
    third.service.later();
    expect(third.saved().laterCount).toBe(3);
    expect(third.saved().offerAnswer).toBe('never');
  });

  it('US-004-01 «No volver a preguntar» queda guardado y se respeta en el siguiente arranque', async () => {
    const { service, saved, store } = await offer();
    service.never();
    expect(saved().offerAnswer).toBe('never');

    const next = setup({ rawPrefs: store.get(BIOMETRIC_PREFS_KEY) });
    next.service.initialize();
    await flush();
    expect(next.service.offerVisible()).toBe(false);
  });
});

describe('BiometricLockService · arranque y desbloqueo (US-004-02)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-004-02 con el bloqueo activo la app arranca bloqueada, sin esperar a nada', () => {
    const { service } = setup({ prefs: enabledPrefs });
    service.initialize();

    expect(service.locked()).toBe(true);
    expect(service.overlayVisible()).toBe(true);
  });

  it('US-004-02 lanza el aviso automático una sola vez y, al acertar, desbloquea', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    service.initialize();
    await flush();

    expect(access.unlock).toHaveBeenCalledTimes(1);
    expect(service.locked()).toBe(false);
    expect(service.overlayVisible()).toBe(false);
  });

  it('US-004-02 mientras espera la huella la fase es prompting', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    access.unlock.mockReturnValue(new Promise<BiometricResult>(() => undefined));
    service.initialize();
    await flush();

    expect(service.locked()).toBe(true);
    expect(service.phase()).toBe('prompting');
  });

  it('US-004-02 cancelar no relanza el aviso solo: queda el botón para repetirlo', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    access.unlock.mockResolvedValue(fail('cancelled'));
    service.initialize();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(service.locked()).toBe(true);
    expect(service.phase()).toBe('cancelled');
    expect(access.unlock).toHaveBeenCalledTimes(1);

    access.unlock.mockResolvedValue(OK);
    await service.unlock();
    expect(access.unlock).toHaveBeenCalledTimes(2);
    expect(service.locked()).toBe(false);
  });

  it('US-004-02 huella no reconocida y demasiados intentos son fases propias, sin desbloquear', async () => {
    const failed = setup({ prefs: enabledPrefs });
    failed.access.unlock.mockResolvedValue(fail('failed'));
    failed.service.initialize();
    await flush();
    expect(failed.service.phase()).toBe('failed');
    expect(failed.service.locked()).toBe(true);

    const lockout = setup({ prefs: enabledPrefs });
    lockout.access.unlock.mockResolvedValue(fail('lockout'));
    lockout.service.initialize();
    await flush();
    expect(lockout.service.phase()).toBe('lockout');
    expect(lockout.service.locked()).toBe(true);
  });

  it('US-004-02 un nuevo intento mientras ya hay un aviso abierto no lanza otro', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    access.unlock.mockReturnValue(new Promise<BiometricResult>(() => undefined));
    service.initialize();
    await flush();

    await service.unlock();
    await service.unlock();

    expect(access.unlock).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 fuera de Android no hace nada: sin bloqueo y sin llamar al plugin', async () => {
    const { service, access } = setup({ supported: false, prefs: enabledPrefs });
    service.initialize();
    await flush();

    expect(service.locked()).toBe(false);
    expect(access.unlock).not.toHaveBeenCalled();
    expect(access.isAvailable).not.toHaveBeenCalled();
  });

  it('US-004-02 initialize() es idempotente', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    service.initialize();
    service.initialize();
    await flush();

    expect(access.unlock).toHaveBeenCalledTimes(1);
  });
});

describe('BiometricLockService · segundo plano (US-004-02)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibility('visible');
  });
  afterEach(() => {
    visibility('visible');
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  async function unlocked() {
    const ctx = setup({ prefs: enabledPrefs });
    ctx.service.initialize();
    await flush();
    expect(ctx.service.locked()).toBe(false);
    return ctx;
  }

  it('US-004-02 al pasar a segundo plano se cubre la app (miniatura de apps recientes) sin pedir nada', async () => {
    const { service, access } = await unlocked();

    visibility('hidden');

    expect(service.covered()).toBe(true);
    expect(service.overlayVisible()).toBe(true);
    expect(access.unlock).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 al volver antes de 30 s se descubre sin pedir la huella', async () => {
    const { service, access } = await unlocked();

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(29_000);
    visibility('visible');
    await flush();

    expect(service.covered()).toBe(false);
    expect(service.locked()).toBe(false);
    expect(access.unlock).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 al volver pasados 30 s se bloquea y se lanza el aviso automático de nuevo', async () => {
    const { service, access } = await unlocked();
    access.unlock.mockResolvedValue(fail('cancelled'));

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(30_001);
    visibility('visible');
    await flush();

    expect(service.locked()).toBe(true);
    expect(access.unlock).toHaveBeenCalledTimes(2);
    expect(service.phase()).toBe('cancelled');
  });

  it('US-004-02 justo en 30 s todavía no se bloquea: hace falta pasar de 30 s', async () => {
    const { service } = await unlocked();

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(30_000);
    visibility('visible');
    await flush();

    expect(service.locked()).toBe(false);
  });

  it('US-004-02 sin el bloqueo activado, pasar a segundo plano no cubre ni bloquea', async () => {
    const { service, access } = setup();
    service.initialize();
    await flush();

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(120_000);
    visibility('visible');
    await flush();

    expect(service.overlayVisible()).toBe(false);
    expect(access.unlock).not.toHaveBeenCalled();
  });

  it('US-004-02 el propio aviso del sistema (que pasa la app a segundo plano) no la vuelve a bloquear', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    let finish!: (value: BiometricResult) => void;
    access.unlock.mockReturnValue(new Promise<BiometricResult>((r) => (finish = r)));
    service.initialize();
    await flush();

    visibility('hidden'); // se abre la hoja del sistema
    await vi.advanceTimersByTimeAsync(45_000); // el usuario tarda más de 30 s
    finish(OK);
    await flush();
    visibility('visible');
    await flush();

    expect(service.locked()).toBe(false);
    expect(service.overlayVisible()).toBe(false);
    expect(access.unlock).toHaveBeenCalledTimes(1);
  });

  it('US-004-02 con la app ya bloqueada, volver de segundo plano no relanza el aviso solo', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    access.unlock.mockResolvedValue(fail('cancelled'));
    service.initialize();
    await flush();

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(60_000);
    visibility('visible');
    await flush();

    expect(access.unlock).toHaveBeenCalledTimes(1);
    expect(service.locked()).toBe(true);
  });

  it('US-004-02 al destruir el servicio dejan de escucharse los eventos', async () => {
    const { service, access } = await unlocked();
    TestBed.resetTestingModule();

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(60_000);
    visibility('visible');
    await flush();

    expect(service.covered()).toBe(false);
    expect(access.unlock).toHaveBeenCalledTimes(1);
  });
});

describe('BiometricLockService · desactivado automático (US-004-03)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    visibility('visible');
  });
  afterEach(() => {
    visibility('visible');
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-004-03 con el bloqueo activo y sin biometría al arrancar, se desactiva solo y deja entrar', async () => {
    const { service, access, saved } = setup({ prefs: enabledPrefs, available: false });
    service.initialize();
    await flush();

    expect(service.locked()).toBe(false);
    expect(service.overlayVisible()).toBe(false);
    expect(access.unlock).not.toHaveBeenCalled();
    expect(saved().enabled).toBe(false);
    expect(service.noticeVisible()).toBe(true);
  });

  it('US-004-03 el aviso queda pendiente hasta que se lee y no pide huella', async () => {
    const { service, access, saved } = setup({ prefs: enabledPrefs, available: false });
    service.initialize();
    await flush();

    service.acknowledgeNotice();

    expect(service.noticeVisible()).toBe(false);
    expect(saved().disabledNotice).toBe(false);
    expect(access.unlock).not.toHaveBeenCalled();
    expect(access.confirm).not.toHaveBeenCalled();
  });

  it('US-004-03 el aviso leído no vuelve a mostrarse en arranques posteriores', async () => {
    const first = setup({ prefs: enabledPrefs, available: false });
    first.service.initialize();
    await flush();
    first.service.acknowledgeNotice();

    const next = setup({ rawPrefs: first.store.get(BIOMETRIC_PREFS_KEY) });
    next.service.initialize();
    await flush();
    expect(next.service.noticeVisible()).toBe(false);
  });

  it('US-004-03 tras desactivarse solo se reinicia la oferta y vuelve a proponerse con biometría', async () => {
    const first = setup({ prefs: { ...enabledPrefs, laterCount: 2 }, available: false });
    first.service.initialize();
    await flush();
    expect(first.saved().laterCount).toBe(0);
    expect(first.saved().offerAnswer).toBe('pending');

    const next = setup({ rawPrefs: first.store.get(BIOMETRIC_PREFS_KEY), available: true });
    next.service.initialize();
    await flush();
    expect(next.service.offerVisible()).toBe(false); // el aviso va antes: se lee primero
    next.service.acknowledgeNotice();
    expect(next.service.offerVisible()).toBe(true);
  });

  it('US-004-03 si el usuario había dicho «No volver a preguntar», eso se conserva al desactivarse solo', async () => {
    const { service, saved } = setup({
      prefs: { ...enabledPrefs, offerAnswer: 'never' },
      available: false,
    });
    service.initialize();
    await flush();

    expect(saved().offerAnswer).toBe('never');
    expect(saved().enabled).toBe(false);
  });

  it('US-004-03 si al desbloquear el sistema informa de que ya no hay biometría, se desactiva solo', async () => {
    const { service, access, saved } = setup({ prefs: enabledPrefs });
    access.unlock.mockResolvedValue(fail('unavailable'));
    service.initialize();
    await flush();

    expect(service.locked()).toBe(false);
    expect(saved().enabled).toBe(false);
    expect(service.noticeVisible()).toBe(true);
  });

  it('US-004-03 al volver tras más de 30 s sin biometría, se desactiva en lugar de bloquear', async () => {
    const { service, access, saved } = setup({ prefs: enabledPrefs });
    service.initialize();
    await flush();
    access.isAvailable.mockResolvedValue(false);

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(40_000);
    visibility('visible');
    await flush();

    expect(service.locked()).toBe(false);
    expect(service.covered()).toBe(false);
    expect(saved().enabled).toBe(false);
    expect(service.noticeVisible()).toBe(true);
    expect(access.unlock).toHaveBeenCalledTimes(1);
  });

  it('US-004-03 la pantalla de bloqueo no puede dejar al usuario fuera si falla el plugin', async () => {
    const { service, access } = setup({ prefs: enabledPrefs });
    access.isAvailable.mockRejectedValue(new Error('el plugin ha fallado'));
    access.unlock.mockResolvedValue(fail('failed'));

    service.initialize();
    await flush();

    // sigue bloqueada, pero con la fase «failed» y el botón para reintentar
    expect(service.locked()).toBe(true);
    expect(service.phase()).toBe('failed');
  });
});

describe('BiometricLockService · independencia y logs', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-004-02 la sesión de la spec 003 sigue su curso: el bloqueo solo lee su estado', async () => {
    const { service, authStatusSignal } = setup({ prefs: enabledPrefs });
    service.initialize();
    authStatusSignal.set('loading');
    await flush();
    authStatusSignal.set('ready');

    expect(service.locked()).toBe(false);
    expect(authStatusSignal()).toBe('ready');
  });

  it('US-004-03 ningún flujo escribe nada en consola', async () => {
    const spies = LEVELS.map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );

    const a = setup({ prefs: enabledPrefs });
    a.access.unlock.mockResolvedValue(fail('cancelled'));
    a.service.initialize();
    await flush();
    await a.service.unlock();

    const b = setup({ prefs: enabledPrefs, available: false });
    b.service.initialize();
    await flush();
    b.service.acknowledgeNotice();

    const c = setup();
    c.service.initialize();
    await flush();
    await c.service.acceptOffer();

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
