import { TestBed } from '@angular/core/testing';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { AuthAccessService, AUTH_STORAGE } from './auth.access.service';
import { AUTH_STORAGE_KEY, SupabaseService } from './supabase';

type Listener = (event: string, session: unknown) => void;

const UID = '11111111-1111-1111-1111-111111111111';
const SECRET_ACCESS = 'access-token-ficticio-AAA';
const SECRET_REFRESH = 'refresh-token-ficticio-BBB';

function storedSession(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    access_token: SECRET_ACCESS,
    refresh_token: SECRET_REFRESH,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: UID, is_anonymous: true },
    ...overrides,
  });
}

function anonymousSession(id = UID) {
  return {
    access_token: SECRET_ACCESS,
    refresh_token: SECRET_REFRESH,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id, is_anonymous: true },
  };
}

function setup(options: { stored?: string | null; storageThrows?: boolean } = {}) {
  const listeners: Listener[] = [];
  const unsubscribe = vi.fn();
  const signInAnonymously = vi.fn();
  const getSession = vi.fn();
  const auth = {
    signInAnonymously,
    getSession,
    onAuthStateChange: vi.fn((callback: Listener) => {
      listeners.push(callback);
      return { data: { subscription: { unsubscribe } } };
    }),
  };
  const storage = {
    getItem: vi.fn((key: string) => {
      if (options.storageThrows) throw new Error('storage no disponible');
      return key === AUTH_STORAGE_KEY ? (options.stored ?? null) : null;
    }),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SupabaseService, useValue: { client: { auth } } },
      { provide: AUTH_STORAGE, useValue: storage },
    ],
  });
  const service = TestBed.inject(AuthAccessService);
  const emit = (event: string, session: unknown = null) =>
    listeners.forEach((listener) => listener(event, session));
  return { service, signInAnonymously, getSession, storage, emit, unsubscribe, auth };
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('AuthAccessService · estado inicial y primer intento', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-003-01 idle nunca se expone tras initialize()', () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockReturnValue(new Promise(() => undefined));
    expect(service.status()).toBe('idle');

    service.initialize();

    expect(service.status()).not.toBe('idle');
  });

  it('US-003-02 con sesión guardada lee el almacenamiento y pasa a ready sin getSession ni signInAnonymously', () => {
    const { service, getSession, signInAnonymously, storage } = setup({ stored: storedSession() });

    service.initialize();

    expect(storage.getItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(UID);
    expect(getSession).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('US-003-02 con el token caducado y sin red también pasa a ready al instante', () => {
    const { service } = setup({ stored: storedSession({ expires_at: 1 }) });

    service.initialize();

    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(UID);
  });

  it('US-003-02 una sesión guardada con forma inválida se ignora y se trata como sin sesión', () => {
    const invalid = [
      'no es json',
      '{}',
      JSON.stringify({ refresh_token: 'x' }),
      JSON.stringify({ user: { id: UID } }),
      JSON.stringify({ refresh_token: '', user: { id: UID } }),
      JSON.stringify({ refresh_token: 'x', user: { id: '' } }),
      'null',
      '[]',
    ];
    for (const stored of invalid) {
      const { service, signInAnonymously } = setup({ stored });
      signInAnonymously.mockReturnValue(new Promise(() => undefined));

      service.initialize();

      expect(service.status(), stored).toBe('loading');
      expect(signInAnonymously, stored).toHaveBeenCalledTimes(1);
    }
  });

  it('US-003-02 si el almacenamiento lanza, se trata como sin sesión', () => {
    const { service, signInAnonymously } = setup({ storageThrows: true });
    signInAnonymously.mockReturnValue(new Promise(() => undefined));

    service.initialize();

    expect(service.status()).toBe('loading');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-01 sin sesión guardada llama una sola vez a signInAnonymously y pasa a ready', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue({ data: { session: anonymousSession() }, error: null });

    service.initialize();
    expect(service.status()).toBe('loading');
    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(UID);
    expect(service.errorReason()).toBeNull();
  });

  it('US-003-01 initialize() es idempotente', async () => {
    const { service, signInAnonymously, auth } = setup();
    signInAnonymously.mockResolvedValue({ data: { session: anonymousSession() }, error: null });

    service.initialize();
    service.initialize();
    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('US-003-01 las señales son de solo lectura', () => {
    const { service } = setup();
    for (const signal of [
      service.status,
      service.session,
      service.userId,
      service.errorReason,
      service.autoRetryPending,
    ]) {
      expect('set' in signal).toBe(false);
      expect('update' in signal).toBe(false);
    }
  });

  it('US-003-01 la sesión expuesta no contiene tokens', async () => {
    const { service } = setup({ stored: storedSession() });
    service.initialize();

    const exposed = JSON.stringify(service.session());

    expect(exposed).toContain(UID);
    expect(exposed).not.toContain(SECRET_ACCESS);
    expect(exposed).not.toContain(SECRET_REFRESH);
  });

  it('US-003-04 un fallo de la llamada pasa a error con el motivo clasificado', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });

    service.initialize();
    await flush();

    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');
    expect(service.userId()).toBeNull();
  });

  it('US-003-04 una llamada rechazada (excepción) también se clasifica', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockRejectedValue(new AuthRetryableFetchError('Failed to fetch', 0));

    service.initialize();
    await flush();

    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');
  });

  it('US-003-01 errorReason solo es distinto de null cuando status es error', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue({ data: { session: anonymousSession() }, error: null });
    expect(service.errorReason()).toBeNull();

    service.initialize();
    expect(service.errorReason()).toBeNull();
    await flush();
    expect(service.status()).toBe('ready');
    expect(service.errorReason()).toBeNull();
  });
});

describe('AuthAccessService · plazo y un solo intento', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function pending() {
    let resolve!: (value: unknown) => void;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
  }

  it('US-003-01 al agotar el plazo de 10 s pasa a error con timeout sin cancelar la llamada', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockReturnValue(pending().promise);

    service.initialize();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(service.status()).toBe('loading');
    await vi.advanceTimersByTimeAsync(1);

    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('timeout');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-01 si la llamada acaba antes del plazo, el plazo no hace nada', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue({ data: { session: anonymousSession() }, error: null });

    service.initialize();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(service.status()).toBe('ready');
    expect(service.errorReason()).toBeNull();
  });

  it('US-003-01 si la llamada original resuelve con éxito tras el timeout, se usa su sesión', async () => {
    const { service, signInAnonymously } = setup();
    const call = pending();
    signInAnonymously.mockReturnValue(call.promise);

    service.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(service.status()).toBe('error');

    call.resolve({ data: { session: anonymousSession() }, error: null });
    await flush();

    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(UID);
    expect(service.errorReason()).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-04 si la llamada original resuelve con error tras el timeout, se aplica ese error', async () => {
    const { service, signInAnonymously } = setup();
    const call = pending();
    signInAnonymously.mockReturnValue(call.promise);

    service.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    call.resolve({
      data: { session: null },
      error: Object.assign(new Error('Too many requests'), { name: 'AuthApiError', status: 429 }),
    });
    await flush();

    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('rate_limited');
  });

  it('US-003-04 retry() con una llamada en vuelo se une a ella y no lanza otra', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockReturnValue(pending().promise);

    service.initialize();
    service.retry();
    service.retry();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('loading');
  });

  it('US-003-04 tras un timeout, retry() se une a la llamada pendiente, no lanza otra y reinicia el plazo', async () => {
    const { service, signInAnonymously } = setup();
    const call = pending();
    signInAnonymously.mockReturnValue(call.promise);

    service.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(service.errorReason()).toBe('timeout');

    service.retry();
    expect(service.status()).toBe('loading');
    expect(service.errorReason()).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(service.status()).toBe('loading');
    await vi.advanceTimersByTimeAsync(1);
    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('timeout');

    call.resolve({ data: { session: anonymousSession() }, error: null });
    await flush();
    expect(service.status()).toBe('ready');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-04 retry() tras un fallo ya terminado lanza una llamada nueva', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously
      .mockResolvedValueOnce({
        data: { session: null },
        error: Object.assign(new Error('x'), { name: 'AuthApiError', status: 429 }),
      })
      .mockResolvedValueOnce({ data: { session: anonymousSession() }, error: null });

    service.initialize();
    await flush();
    expect(service.errorReason()).toBe('rate_limited');

    service.retry();
    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(2);
    expect(service.status()).toBe('ready');
  });
});

describe('AuthAccessService · reintentos automáticos y reconexión', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  const networkError = () => ({
    data: { session: null },
    error: new AuthRetryableFetchError('Failed to fetch', 0),
  });
  const apiError = (status: number, code?: string) => ({
    data: { session: null },
    error: Object.assign(new Error('x'), { name: 'AuthApiError', status, code }),
  });
  const visibility = (state: 'visible' | 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('US-003-04 reintenta con espera creciente (2, 5, 15 y 30 s) y después cada 60 s, sin ráfagas', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());

    service.initialize();
    await flush();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.autoRetryPending()).toBe(true);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(5);

    // sondeo lento: el evento online no es fiable en el WebView de Android (comprobado en emulador)
    expect(service.autoRetryPending()).toBe(true);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(signInAnonymously).toHaveBeenCalledTimes(5);
    await vi.advanceTimersByTimeAsync(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(6);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(7);

    // nunca más de una llamada por minuto, aunque pase mucho tiempo
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(17);
    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');
  });

  it('US-003-04 el sondeo lento recupera la sesión cuando vuelve la red aunque no llegue ningún evento', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());
    service.initialize();
    await flush();
    await vi.advanceTimersByTimeAsync(2_000 + 5_000 + 15_000 + 30_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(5);

    signInAnonymously.mockResolvedValue({ data: { session: anonymousSession() }, error: null });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(UID);
    expect(service.autoRetryPending()).toBe(false);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(6);
  });

  it('US-003-04 el sondeo lento se pausa con la app en segundo plano y se reanuda al volver', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());
    service.initialize();
    await flush();
    await vi.advanceTimersByTimeAsync(2_000 + 5_000 + 15_000 + 30_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(5);

    visibility('hidden');
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(5);
    expect(service.autoRetryPending()).toBe(false);

    visibility('visible');
    await flush();
    expect(signInAnonymously).toHaveBeenCalledTimes(6);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(7);
  });

  it('US-003-04 el sondeo lento no se aplica a motivos no reintentables', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(apiError(429));
    service.initialize();
    await flush();

    await vi.advanceTimersByTimeAsync(10 * 60_000);

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.autoRetryPending()).toBe(false);
  });

  it('US-003-04 un reintento con éxito pasa a ready y deja de reintentar', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously
      .mockResolvedValueOnce(networkError())
      .mockResolvedValueOnce({ data: { session: anonymousSession() }, error: null });

    service.initialize();
    await flush();
    await vi.advanceTimersByTimeAsync(2_000);

    expect(service.status()).toBe('ready');
    expect(service.errorReason()).toBeNull();
    expect(service.autoRetryPending()).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('US-003-04 service_unavailable se reintenta solo', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Service unavailable', 503),
    });

    service.initialize();
    await flush();
    expect(service.errorReason()).toBe('service_unavailable');
    expect(service.autoRetryPending()).toBe(true);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('US-003-04 timeout se reintenta solo, uniéndose a la llamada pendiente', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockReturnValue(new Promise(() => undefined));

    service.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(service.errorReason()).toBe('timeout');
    expect(service.autoRetryPending()).toBe(true);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(service.status()).toBe('loading');
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-04 rate_limited, disabled y unknown no se reintentan solos y esperan al retry()', async () => {
    for (const failure of [
      apiError(429),
      apiError(422, 'anonymous_provider_disabled'),
      apiError(400, 'bad_json'),
    ]) {
      const { service, signInAnonymously } = setup();
      signInAnonymously.mockResolvedValue(failure);

      service.initialize();
      await flush();
      await vi.advanceTimersByTimeAsync(10 * 60_000);

      expect(signInAnonymously, String(failure.error)).toHaveBeenCalledTimes(1);
      expect(service.status()).toBe('error');
      expect(service.autoRetryPending()).toBe(false);
    }
  });

  it('US-003-04 un retry() manual cancela el reintento programado y reinicia el tope', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());

    service.initialize();
    await flush();
    expect(service.autoRetryPending()).toBe(true);

    service.retry();
    await flush();
    expect(signInAnonymously).toHaveBeenCalledTimes(2);

    // el temporizador antiguo (2 s) no dispara una llamada extra: solo el nuevo (2 s tras el fallo)
    await vi.advanceTimersByTimeAsync(1_999);
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(3);
  });

  it('US-003-04 el evento online dispara un reintento inmediato con un motivo reintentable', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());

    service.initialize();
    await flush();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('online'));
    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('US-003-04 la vuelta a primer plano dispara un reintento y pasar a segundo plano no', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());

    service.initialize();
    await flush();
    visibility('hidden');
    await flush();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);

    visibility('visible');
    await flush();
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it('US-003-04 online y primer plano no hacen nada con motivos no reintentables', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(apiError(429));

    service.initialize();
    await flush();
    window.dispatchEvent(new Event('online'));
    visibility('visible');
    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-04 online no lanza otra llamada si hay una en vuelo (tras un timeout)', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockReturnValue(new Promise(() => undefined));

    service.initialize();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(service.errorReason()).toBe('timeout');

    window.dispatchEvent(new Event('online'));
    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('error');
  });

  it('US-003-04 online no hace nada si ya está ready o cargando', async () => {
    const ready = setup({ stored: storedSession() });
    ready.service.initialize();
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(ready.signInAnonymously).not.toHaveBeenCalled();

    const loading = setup();
    loading.signInAnonymously.mockReturnValue(new Promise(() => undefined));
    loading.service.initialize();
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(loading.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('US-003-04 al destruir el servicio dejan de escucharse los eventos', async () => {
    const { service, signInAnonymously } = setup();
    signInAnonymously.mockResolvedValue(networkError());
    service.initialize();
    await flush();

    TestBed.resetTestingModule();
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });
});

describe('AuthAccessService · eventos de supabase-js, cambio de identidad y logs', () => {
  const NEW_UID = '22222222-2222-2222-2222-222222222222';
  const LEVELS = ['log', 'info', 'warn', 'error', 'debug'] as const;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function spyConsole() {
    return LEVELS.map((level) => vi.spyOn(console, level).mockImplementation(() => undefined));
  }
  const logged = (spies: ReturnType<typeof spyConsole>) =>
    JSON.stringify(spies.flatMap((spy) => spy.mock.calls));

  it('US-003-02 TOKEN_REFRESHED actualiza la caducidad sin exponer tokens', () => {
    const { service, emit } = setup({ stored: storedSession({ expires_at: 1 }) });
    service.initialize();
    expect(service.session()?.expiresAt).toBe(1);

    emit('TOKEN_REFRESHED', { ...anonymousSession(), expires_at: 9_999_999_999 });

    expect(service.session()?.expiresAt).toBe(9_999_999_999);
    expect(service.userId()).toBe(UID);
    expect(JSON.stringify(service.session())).not.toContain(SECRET_ACCESS);
  });

  it('US-003-02 INITIAL_SESSION y SIGNED_IN no cambian el estado', () => {
    const { service, emit, signInAnonymously } = setup({ stored: storedSession() });
    service.initialize();

    emit('INITIAL_SESSION', null);
    emit('SIGNED_IN', anonymousSession(NEW_UID));

    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(UID);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('US-003-02 un SIGNED_OUT pasa por loading, crea una sesión nueva y publica un userId distinto', async () => {
    const spies = spyConsole();
    const { service, emit, signInAnonymously } = setup({ stored: storedSession() });
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_UID) },
      error: null,
    });
    service.initialize();
    expect(service.userId()).toBe(UID);

    emit('SIGNED_OUT', null);

    expect(service.status()).toBe('loading');
    expect(service.session()).toBeNull();
    expect(service.userId()).toBeNull();

    await flush();
    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(NEW_UID);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    spies.forEach((spy) => spy.mockRestore());
  });

  it('US-003-02 un SIGNED_OUT sin sesión (ya se está obteniendo una) se ignora', () => {
    const { service, emit, signInAnonymously } = setup();
    signInAnonymously.mockReturnValue(new Promise(() => undefined));
    service.initialize();

    emit('SIGNED_OUT', null);

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('loading');
  });

  it('US-003-02 si la nueva sesión falla, pasa a error con su motivo y puede reintentar', async () => {
    const { service, emit, signInAnonymously } = setup({ stored: storedSession() });
    signInAnonymously
      .mockResolvedValueOnce({
        data: { session: null },
        error: new AuthRetryableFetchError('Failed to fetch', 0),
      })
      .mockResolvedValueOnce({ data: { session: anonymousSession(NEW_UID) }, error: null });
    service.initialize();

    emit('SIGNED_OUT', null);
    await flush();
    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');

    await vi.advanceTimersByTimeAsync(2_000);
    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(NEW_UID);
  });

  it('US-003-02 el cambio de identidad deja constancia en logs sin incluir tokens', async () => {
    const spies = spyConsole();
    const { service, emit, signInAnonymously } = setup({ stored: storedSession() });
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_UID) },
      error: null,
    });
    service.initialize();

    emit('SIGNED_OUT', null);
    await flush();

    const output = logged(spies);
    expect(output).not.toBe('[]');
    expect(output).not.toContain(SECRET_ACCESS);
    expect(output).not.toContain(SECRET_REFRESH);
    expect(output).not.toContain(UID);
    expect(output).not.toContain(NEW_UID);
  });

  it('US-003-02 ningún flujo escribe tokens en consola', async () => {
    const spies = spyConsole();

    // 1) primer inicio anónimo con éxito
    const first = setup();
    first.signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession() },
      error: null,
    });
    first.service.initialize();
    await flush();

    // 2) sesión guardada + refresco en segundo plano
    const refreshed = setup({ stored: storedSession() });
    refreshed.service.initialize();
    refreshed.emit('TOKEN_REFRESHED', anonymousSession());

    // 3) error y reintento
    const failing = setup();
    failing.signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError(`Failed ${SECRET_ACCESS}`, 0),
    });
    failing.service.initialize();
    await flush();
    await vi.advanceTimersByTimeAsync(60_000);

    // 4) sesión guardada inválida con tokens dentro
    const invalid = setup({ stored: storedSession({ user: null }) });
    invalid.signInAnonymously.mockReturnValue(new Promise(() => undefined));
    invalid.service.initialize();

    const output = logged(spies);
    expect(output).not.toContain(SECRET_ACCESS);
    expect(output).not.toContain(SECRET_REFRESH);
  });
});
