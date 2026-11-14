import { TestBed } from '@angular/core/testing';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { AuthAccessService, AUTH_STORAGE } from './auth.access.service';
import { AUTH_STORAGE_KEY, SupabaseService } from './supabase';

type Listener = (event: string, session: unknown) => void;

const UID = '11111111-1111-1111-1111-111111111111';
const PW_ACCOUNT = 'MiRitmoSeguro2025';
const PW_CURRENT = 'ClaveActual123';
const PW_NEXT = 'ClaveNueva456';
const ACCOUNT_ACCESS = 'acceso-de-la-cuenta-CCC';
const ACCOUNT_REFRESH = 'refresco-de-la-cuenta-DDD';
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
  const rpc = vi.fn();
  const probeAuth = { signInWithPassword: vi.fn() };
  const createProbeClient = vi.fn(() => ({ auth: probeAuth }));
  const storage = {
    getItem: vi.fn((key: string) => {
      if (options.storageThrows) throw new Error('storage no disponible');
      return key === AUTH_STORAGE_KEY ? (options.stored ?? null) : null;
    }),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SupabaseService, useValue: { client: { auth, rpc }, createProbeClient } },
      { provide: AUTH_STORAGE, useValue: storage },
    ],
  });
  const service = TestBed.inject(AuthAccessService);
  const emit = (event: string, session: unknown = null) =>
    listeners.forEach((listener) => listener(event, session));
  return {
    service,
    signInAnonymously,
    getSession,
    storage,
    emit,
    unsubscribe,
    auth,
    probeAuth,
    createProbeClient,
    rpc,
  };
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

describe('AuthAccessService · cuenta: nombre de usuario en la sesión (spec 011)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-011-02 una sesión de cuenta expone el nombre de usuario derivado del identificador interno', () => {
    const { service } = setup({
      stored: storedSession({
        user: { id: UID, is_anonymous: false, email: 'Carlos_Ritmo@cuenta.invalid' },
      }),
    });

    service.initialize();

    expect(service.session()?.user).toEqual({
      id: UID,
      isAnonymous: false,
      username: 'carlos_ritmo',
    });
  });

  it('US-011-02 una sesión anónima no tiene nombre de usuario', () => {
    const { service } = setup({ stored: storedSession() });

    service.initialize();

    expect(service.session()?.user.username).toBeNull();
  });

  it('US-011-02 un correo de otro dominio nunca se expone como nombre de usuario', () => {
    const { service } = setup({
      stored: storedSession({
        user: { id: UID, is_anonymous: false, email: 'alguien@example.com' },
      }),
    });

    service.initialize();

    expect(service.session()?.user.username).toBeNull();
    expect(JSON.stringify(service.session())).not.toContain('example.com');
  });

  it('US-011-01 USER_UPDATED (vincular la cuenta) actualiza la sesión sin cambiar el user_id', () => {
    const { service, emit } = setup({ stored: storedSession() });
    service.initialize();
    expect(service.session()?.user.isAnonymous).toBe(true);

    emit('USER_UPDATED', {
      ...anonymousSession(),
      user: { id: UID, is_anonymous: false, email: 'ana@cuenta.invalid' },
    });

    expect(service.userId()).toBe(UID);
    expect(service.session()?.user).toEqual({ id: UID, isAnonymous: false, username: 'ana' });
    expect(service.status()).toBe('ready');
  });

  it('US-011-01 USER_UPDATED sin sesión válida se ignora', () => {
    const { service, emit } = setup({ stored: storedSession() });
    service.initialize();

    emit('USER_UPDATED', null);

    expect(service.session()?.user.id).toBe(UID);
  });
});

function accountSetup(stored = storedSession()) {
  const base = setup({ stored });
  const updateUser = vi.fn();
  Object.assign(base.auth, { updateUser });
  base.service.initialize();
  return { ...base, updateUser };
}

describe('AuthAccessService · cuenta: vincular (spec 011)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const linked = (over: Record<string, unknown> = {}) => ({
    data: { user: { id: UID, is_anonymous: false, email: 'carlos_ritmo@cuenta.invalid', ...over } },
    error: null,
  });

  it('US-011-01 vincula con el identificador interno y la contraseña, conservando el user_id', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockResolvedValue(linked());

    const result = await service.linkAccount('  Carlos_Ritmo ', 'MiRitmoSeguro2025');

    expect(result).toEqual({ ok: true });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({
      email: 'carlos_ritmo@cuenta.invalid',
      password: PW_ACCOUNT,
    });
    expect(service.userId()).toBe(UID);
    expect(service.session()?.user).toEqual({
      id: UID,
      isAnonymous: false,
      username: 'carlos_ritmo',
    });
    expect(service.status()).toBe('ready');
  });

  it('US-011-01 si el servicio deja la cuenta pendiente de verificar (sigue anónima), no cuenta como éxito', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockResolvedValue(linked({ is_anonymous: true }));

    const result = await service.linkAccount('carlos_ritmo', 'MiRitmoSeguro2025');

    expect(result).toEqual({ ok: false, reason: 'unknown' });
    expect(service.session()?.user.isAnonymous).toBe(true);
  });

  it('US-011-01 nombre de usuario ya existente → username-taken y la sesión no cambia', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('exists'), {
        name: 'AuthApiError',
        status: 422,
        code: 'email_exists',
      }),
    });

    const result = await service.linkAccount('ocupado', 'MiRitmoSeguro2025');

    expect(result).toEqual({ ok: false, reason: 'username-taken' });
    expect(service.session()?.user.isAnonymous).toBe(true);
  });

  it('US-011-01 contraseña débil para el servicio → weak-password', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('weak'), {
        name: 'AuthApiError',
        status: 422,
        code: 'weak_password',
      }),
    });

    expect(await service.linkAccount('carlos', 'corta')).toEqual({
      ok: false,
      reason: 'weak-password',
    });
  });

  it('US-011-01 sin red → network; una excepción de la librería nunca se propaga', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockRejectedValue(new TypeError('Failed to fetch'));

    expect(await service.linkAccount('carlos', 'MiRitmoSeguro2025')).toEqual({
      ok: false,
      reason: 'network',
    });
  });

  it('US-011-01 sin respuesta en el plazo → timeout', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockReturnValue(new Promise(() => undefined));

    const pending = service.linkAccount('carlos', 'MiRitmoSeguro2025');
    await vi.advanceTimersByTimeAsync(20_000);

    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
  });

  it('US-011-01 una cuenta ya vinculada no puede volver a vincularse', async () => {
    const { service, updateUser } = accountSetup(
      storedSession({ user: { id: UID, is_anonymous: false, email: 'ana@cuenta.invalid' } })
    );

    expect(await service.linkAccount('otra', 'MiRitmoSeguro2025')).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('US-011-01 una segunda llamada mientras hay otra en curso se rechaza sin llamar al servidor', async () => {
    const { service, updateUser } = accountSetup();
    updateUser.mockReturnValue(new Promise(() => undefined));

    void service.linkAccount('carlos', 'MiRitmoSeguro2025');
    const second = await service.linkAccount('carlos', 'MiRitmoSeguro2025');

    expect(second).toEqual({ ok: false, reason: 'unknown' });
    expect(updateUser).toHaveBeenCalledTimes(1);
  });

  it('US-011-01 ni la contraseña ni el identificador interno llegan a la consola ni a la sesión', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    const { service, updateUser } = accountSetup();
    updateUser.mockResolvedValue(linked());

    await service.linkAccount('carlos_ritmo', 'MiRitmoSeguro2025');

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    const exposed = JSON.stringify(service.session());
    expect(exposed).not.toContain('MiRitmoSeguro2025');
    expect(exposed).not.toContain('cuenta.invalid');
  });
});

describe('AuthAccessService · cuenta: inicio de sesión en dos fases (spec 011)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const ACCOUNT_ID = '22222222-2222-2222-2222-222222222222';
  const probeSession = {
    access_token: ACCOUNT_ACCESS,
    refresh_token: ACCOUNT_REFRESH,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: ACCOUNT_ID, is_anonymous: false, email: 'ana@cuenta.invalid' },
  };

  function signInSetup() {
    const base = accountSetup();
    const setSession = vi.fn();
    Object.assign(base.auth, { setSession });
    return { ...base, setSession };
  }

  it('US-011-02 checkCredentials usa un cliente sonda con el identificador interno y NO cambia la sesión', async () => {
    const { service, probeAuth, createProbeClient, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });

    const result = await service.checkCredentials('  Ana ', 'MiRitmoSeguro2025');

    expect(result).toEqual({ ok: true });
    expect(createProbeClient).toHaveBeenCalledTimes(1);
    expect(probeAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@cuenta.invalid',
      password: PW_ACCOUNT,
    });
    expect(setSession).not.toHaveBeenCalled();
    expect(service.userId()).toBe(UID); // sigue la sesión anónima
    expect(service.session()?.user.isAnonymous).toBe(true);
  });

  it('US-011-02 credenciales incorrectas → invalid-credentials y nada queda pendiente', async () => {
    const { service, probeAuth } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('bad'), {
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_credentials',
      }),
    });

    expect(await service.checkCredentials('ana', 'mala')).toEqual({
      ok: false,
      reason: 'invalid-credentials',
    });
    expect(await service.completeSignIn()).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('US-011-02 límite de intentos → rate-limited; sin red → network; sin respuesta → timeout', async () => {
    const { service, probeAuth } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: Object.assign(new Error('429'), { name: 'AuthApiError', status: 429 }),
    });
    expect(await service.checkCredentials('ana', 'x')).toEqual({
      ok: false,
      reason: 'rate-limited',
    });

    probeAuth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await service.checkCredentials('ana', 'x')).toEqual({ ok: false, reason: 'network' });

    probeAuth.signInWithPassword.mockReturnValueOnce(new Promise(() => undefined));
    const pending = service.checkCredentials('ana', 'x');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
  });

  it('US-011-02 completeSignIn aplica la sesión comprobada y cambia la identidad', async () => {
    const { service, probeAuth, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });
    setSession.mockResolvedValue({ data: { session: probeSession }, error: null });
    await service.checkCredentials('ana', 'MiRitmoSeguro2025');

    const result = await service.completeSignIn();

    expect(result).toEqual({ ok: true });
    expect(setSession).toHaveBeenCalledWith({
      access_token: ACCOUNT_ACCESS,
      refresh_token: ACCOUNT_REFRESH,
    });
    expect(service.userId()).toBe(ACCOUNT_ID);
    expect(service.session()?.user).toEqual({
      id: ACCOUNT_ID,
      isAnonymous: false,
      username: 'ana',
    });
    expect(service.status()).toBe('ready');
  });

  it('US-011-02 completeSignIn solo vale una vez: la segunda no hace nada', async () => {
    const { service, probeAuth, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });
    setSession.mockResolvedValue({ data: { session: probeSession }, error: null });
    await service.checkCredentials('ana', 'x');
    await service.completeSignIn();

    expect(await service.completeSignIn()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(setSession).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 cancelSignIn descarta lo comprobado y la sesión anónima sigue intacta', async () => {
    const { service, probeAuth, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });
    await service.checkCredentials('ana', 'x');

    service.cancelSignIn();

    expect(await service.completeSignIn()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(setSession).not.toHaveBeenCalled();
    expect(service.userId()).toBe(UID);
    expect(service.session()?.user.isAnonymous).toBe(true);
  });

  it('US-011-02 lo comprobado caduca a los 10 minutos', async () => {
    const { service, probeAuth, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });
    await service.checkCredentials('ana', 'x');

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000 + 1000);

    expect(await service.completeSignIn()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(setSession).not.toHaveBeenCalled();
  });

  it('US-011-02 si falla setSession por red se puede reintentar', async () => {
    const { service, probeAuth, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });
    await service.checkCredentials('ana', 'x');

    setSession.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await service.completeSignIn()).toEqual({ ok: false, reason: 'network' });
    setSession.mockResolvedValueOnce({ data: { session: probeSession }, error: null });
    expect(await service.completeSignIn()).toEqual({ ok: true });
  });

  it('US-011-02 una sesión que ya es de cuenta no puede iniciar otra sin cerrar la actual', async () => {
    const base = accountSetup(
      storedSession({ user: { id: UID, is_anonymous: false, email: 'ana@cuenta.invalid' } })
    );

    expect(await base.service.checkCredentials('otra', 'x')).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
    expect(base.probeAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('US-011-02 los tokens y la contraseña no llegan a la consola ni a la sesión expuesta', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    const { service, probeAuth, setSession } = signInSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: probeSession },
      error: null,
    });
    setSession.mockResolvedValue({ data: { session: probeSession }, error: null });

    await service.checkCredentials('ana', 'MiRitmoSeguro2025');
    await service.completeSignIn();

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    const exposed = JSON.stringify(service.session());
    for (const secret of [
      'acceso-de-la-cuenta-CCC',
      'refresco-de-la-cuenta-DDD',
      'MiRitmoSeguro2025',
      'cuenta.invalid',
    ]) {
      expect(exposed).not.toContain(secret);
    }
  });
});

describe('AuthAccessService · cuenta: cerrar sesión (spec 011)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const ACCOUNT_STORED = () =>
    storedSession({ user: { id: UID, is_anonymous: false, email: 'ana@cuenta.invalid' } });
  const NEW_ID = '33333333-3333-3333-3333-333333333333';

  function signOutSetup() {
    const base = accountSetup(ACCOUNT_STORED());
    const signOut = vi.fn(async () => {
      base.emit('SIGNED_OUT'); // la librería emite el evento antes de resolver
      return { error: null };
    });
    Object.assign(base.auth, { signOut });
    return { ...base, signOut };
  }

  it('US-011-03 cierra solo esta sesión (scope local), no las de otros móviles de la cuenta', async () => {
    const { service, signOut, signInAnonymously } = signOutSetup();
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_ID) },
      error: null,
    });

    await service.signOut();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('US-011-03 deja una sesión anónima nueva y vuelve a estar lista, creándola una sola vez', async () => {
    const { service, signInAnonymously } = signOutSetup();
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_ID) },
      error: null,
    });

    const result = await service.signOut();
    expect(result).toEqual({ ok: true });

    await flush();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(NEW_ID);
    expect(service.session()?.user).toEqual({ id: NEW_ID, isAnonymous: true, username: null });
  });

  it('US-011-03 el cierre esperado no se registra como «sesión rechazada por el servidor»', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, signInAnonymously } = signOutSetup();
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_ID) },
      error: null,
    });

    await service.signOut();
    await flush();

    expect(warn).not.toHaveBeenCalled();
  });

  it('US-011-03 un SIGNED_OUT inesperado posterior vuelve a tratarse como rechazo del servidor', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { service, signInAnonymously, emit } = signOutSetup();
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_ID) },
      error: null,
    });
    await service.signOut();
    await flush();

    emit('SIGNED_OUT');

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('US-011-03 sin red no se cierra nada: la sesión sigue y no se crea otra', async () => {
    const { service, auth, signInAnonymously } = signOutSetup();
    Object.assign(auth, {
      signOut: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });

    const result = await service.signOut();

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.userId()).toBe(UID);
    expect(service.status()).toBe('ready');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('US-011-03 un error devuelto por la librería también se explica y no cambia la sesión', async () => {
    const { service, auth, signInAnonymously } = signOutSetup();
    Object.assign(auth, {
      signOut: vi.fn().mockResolvedValue({
        error: Object.assign(new Error('x'), { name: 'AuthRetryableFetchError', status: 0 }),
      }),
    });

    expect(await service.signOut()).toEqual({ ok: false, reason: 'network' });
    expect(service.userId()).toBe(UID);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('US-011-03 sin respuesta en el plazo → timeout y la sesión sigue', async () => {
    const { service, auth } = signOutSetup();
    Object.assign(auth, { signOut: vi.fn().mockReturnValue(new Promise(() => undefined)) });

    const pending = service.signOut();
    await vi.advanceTimersByTimeAsync(20_000);

    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
    expect(service.userId()).toBe(UID);
  });

  it('US-011-03 una sesión anónima no tiene nada que cerrar', async () => {
    const base = accountSetup();
    const signOut = vi.fn();
    Object.assign(base.auth, { signOut });

    expect(await base.service.signOut()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('US-011-03 cerrar sesión descarta cualquier inicio de sesión comprobado a medias', async () => {
    const { service, signInAnonymously } = signOutSetup();
    signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_ID) },
      error: null,
    });
    await service.signOut();
    await flush();

    expect(await service.completeSignIn()).toEqual({ ok: false, reason: 'unauthorized' });
  });
});

describe('AuthAccessService · cuenta: cambiar contraseña y nombre de usuario (spec 011)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const ACCOUNT_STORED = () =>
    storedSession({ user: { id: UID, is_anonymous: false, email: 'ana@cuenta.invalid' } });
  const reauthOk = { data: { session: { access_token: 'a', refresh_token: 'b' } }, error: null };
  const apiError = (code: string, status = 422) => ({
    data: { user: null },
    error: Object.assign(new Error('x'), { name: 'AuthApiError', status, code }),
  });

  function changeSetup(stored = ACCOUNT_STORED()) {
    return accountSetup(stored);
  }

  it('US-011-05 cambia la contraseña tras re-autenticar con la actual en el cliente sonda', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    updateUser.mockResolvedValue({
      data: { user: { id: UID, email: 'ana@cuenta.invalid' } },
      error: null,
    });

    const result = await service.changePassword('ClaveActual123', 'ClaveNueva456');

    expect(result).toEqual({ ok: true });
    expect(probeAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@cuenta.invalid',
      password: PW_CURRENT,
    });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ password: PW_NEXT });
    expect(service.userId()).toBe(UID);
    expect(service.session()?.user.username).toBe('ana');
  });

  it('US-011-05 contraseña actual incorrecta → invalid-credentials y no se cambia nada', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('x'), {
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_credentials',
      }),
    });

    expect(await service.changePassword('mala', 'ClaveNueva456')).toEqual({
      ok: false,
      reason: 'invalid-credentials',
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('US-011-05 una nueva igual a la actual se rechaza sin llamar al servidor', async () => {
    const { service, probeAuth, updateUser } = changeSetup();

    expect(await service.changePassword('ClaveActual123', 'ClaveActual123')).toEqual({
      ok: false,
      reason: 'same-password',
    });
    expect(probeAuth.signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('US-011-05 el servicio rechaza la nueva por débil o igual → weak-password / same-password', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    updateUser.mockResolvedValueOnce(apiError('weak_password'));
    expect(await service.changePassword('ClaveActual123', 'corta')).toEqual({
      ok: false,
      reason: 'weak-password',
    });
    updateUser.mockResolvedValueOnce(apiError('same_password'));
    expect(await service.changePassword('ClaveActual123', 'ClaveNueva456')).toEqual({
      ok: false,
      reason: 'same-password',
    });
  });

  it('US-011-05 una sesión anónima no puede cambiar contraseña', async () => {
    const { service, probeAuth, updateUser } = accountSetup();

    expect(await service.changePassword('a', 'b')).toEqual({ ok: false, reason: 'unauthorized' });
    expect(probeAuth.signInWithPassword).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('US-011-05 sin red o sin respuesta se explica y no se cambia nada a medias', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await service.changePassword('ClaveActual123', 'ClaveNueva456')).toEqual({
      ok: false,
      reason: 'network',
    });
    expect(updateUser).not.toHaveBeenCalled();

    probeAuth.signInWithPassword.mockResolvedValueOnce(reauthOk);
    updateUser.mockReturnValueOnce(new Promise(() => undefined));
    const pending = service.changePassword('ClaveActual123', 'ClaveNueva456');
    await vi.advanceTimersByTimeAsync(40_000);
    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
  });

  it('US-011-07 cambia el nombre de usuario tras re-autenticar y la sesión muestra el nuevo', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    updateUser.mockResolvedValue({
      data: { user: { id: UID, is_anonymous: false, email: 'ana_nueva@cuenta.invalid' } },
      error: null,
    });

    const result = await service.changeUsername('  Ana_Nueva ', 'ClaveActual123');

    expect(result).toEqual({ ok: true });
    expect(probeAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@cuenta.invalid',
      password: PW_CURRENT,
    });
    expect(updateUser).toHaveBeenCalledWith({ email: 'ana_nueva@cuenta.invalid' });
    expect(service.userId()).toBe(UID);
    expect(service.session()?.user.username).toBe('ana_nueva');
  });

  it('US-011-07 nombre ocupado → username-taken y la sesión no cambia', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    updateUser.mockResolvedValue(apiError('email_exists'));

    expect(await service.changeUsername('ocupado', 'ClaveActual123')).toEqual({
      ok: false,
      reason: 'username-taken',
    });
    expect(service.session()?.user.username).toBe('ana');
  });

  it('US-011-07 contraseña incorrecta no cambia nada; el mismo nombre se rechaza sin llamar', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: Object.assign(new Error('x'), {
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_credentials',
      }),
    });
    expect(await service.changeUsername('otro', 'mala')).toEqual({
      ok: false,
      reason: 'invalid-credentials',
    });
    expect(updateUser).not.toHaveBeenCalled();

    expect(await service.changeUsername(' ANA ', 'ClaveActual123')).toEqual({
      ok: false,
      reason: 'username-taken',
    });
  });

  it('US-011-07 si el servicio deja el cambio pendiente de verificar, no cuenta como éxito', async () => {
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    updateUser.mockResolvedValue({
      data: {
        user: {
          id: UID,
          is_anonymous: false,
          email: 'ana@cuenta.invalid',
          new_email: 'otra@cuenta.invalid',
        },
      },
      error: null,
    });

    expect(await service.changeUsername('otra', 'ClaveActual123')).toEqual({
      ok: false,
      reason: 'unknown',
    });
    expect(service.session()?.user.username).toBe('ana');
  });

  it('US-011-05 ni contraseñas ni identificadores internos llegan a la consola', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    const { service, probeAuth, updateUser } = changeSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    updateUser.mockResolvedValue({
      data: { user: { id: UID, email: 'ana@cuenta.invalid' } },
      error: null,
    });

    await service.changePassword('ClaveActual123', 'ClaveNueva456');

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('AuthAccessService · cuenta: borrar la cuenta (spec 011)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  const ACCOUNT_STORED = () =>
    storedSession({ user: { id: UID, is_anonymous: false, email: 'ana@cuenta.invalid' } });
  const NEW_ID = '44444444-4444-4444-4444-444444444444';
  const reauthOk = { data: { session: { access_token: 'a', refresh_token: 'b' } }, error: null };

  function deleteSetup(stored = ACCOUNT_STORED()) {
    const base = accountSetup(stored);
    const signOut = vi.fn(async () => {
      base.emit('SIGNED_OUT');
      return { error: null };
    });
    Object.assign(base.auth, { signOut });
    base.signInAnonymously.mockResolvedValue({
      data: { session: anonymousSession(NEW_ID) },
      error: null,
    });
    return { ...base, signOut };
  }

  it('US-011-06 re-autentica, borra con la función de servidor y deja una sesión anónima nueva', async () => {
    const { service, probeAuth, rpc, signOut } = deleteSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    rpc.mockResolvedValue({ data: null, error: null });

    const result = await service.deleteOwnAccount('ClaveActual123');
    await flush();

    expect(result).toEqual({ ok: true });
    expect(probeAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@cuenta.invalid',
      password: PW_CURRENT,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(service.status()).toBe('ready');
    expect(service.userId()).toBe(NEW_ID);
    expect(service.session()?.user).toEqual({ id: NEW_ID, isAnonymous: true, username: null });
  });

  it('US-011-06 contraseña incorrecta: no se llama al servidor ni cambia nada', async () => {
    const { service, probeAuth, rpc, signOut } = deleteSetup();
    probeAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('x'), {
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_credentials',
      }),
    });

    expect(await service.deleteOwnAccount('mala')).toEqual({
      ok: false,
      reason: 'invalid-credentials',
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(service.userId()).toBe(UID);
  });

  it('US-011-06 si falla el borrado no se cierra nada ni se crea otra sesión', async () => {
    const { service, probeAuth, rpc, signOut, signInAnonymously } = deleteSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '500', message: 'boom', details: '', hint: '' },
    });
    expect(await service.deleteOwnAccount('ClaveActual123')).toEqual({
      ok: false,
      reason: 'unknown',
    });

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'permission denied', details: '', hint: '' },
    });
    expect(await service.deleteOwnAccount('ClaveActual123')).toEqual({
      ok: false,
      reason: 'unauthorized',
    });

    rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await service.deleteOwnAccount('ClaveActual123')).toEqual({
      ok: false,
      reason: 'network',
    });

    expect(signOut).not.toHaveBeenCalled();
    expect(signInAnonymously).not.toHaveBeenCalled();
    expect(service.userId()).toBe(UID);
    expect(service.session()?.user.username).toBe('ana');
  });

  it('US-011-06 sin respuesta del servidor → timeout y no se borra nada a medias', async () => {
    const { service, probeAuth, rpc, signOut } = deleteSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    rpc.mockReturnValue(new Promise(() => undefined));

    const pending = service.deleteOwnAccount('ClaveActual123');
    await vi.advanceTimersByTimeAsync(40_000);

    expect(await pending).toEqual({ ok: false, reason: 'timeout' });
    expect(signOut).not.toHaveBeenCalled();
    expect(service.userId()).toBe(UID);
  });

  it('US-011-06 una sesión anónima no puede borrar cuenta y ni siquiera llama al servidor', async () => {
    const { service, rpc, probeAuth } = deleteSetup(storedSession());

    expect(await service.deleteOwnAccount('x')).toEqual({ ok: false, reason: 'unauthorized' });
    expect(rpc).not.toHaveBeenCalled();
    expect(probeAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('US-011-06 si la cuenta ya se borró aunque el cierre local falle, el móvil queda con una sesión anónima nueva', async () => {
    const { service, probeAuth, rpc, auth } = deleteSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    rpc.mockResolvedValue({ data: null, error: null });
    Object.assign(auth, { signOut: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) });

    const result = await service.deleteOwnAccount('ClaveActual123');
    await flush();

    expect(result).toEqual({ ok: true });
    expect(service.userId()).toBe(NEW_ID);
    expect(service.session()?.user.isAnonymous).toBe(true);
  });

  it('US-011-06 la contraseña y los identificadores no llegan a la consola', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ];
    const { service, probeAuth, rpc } = deleteSetup();
    probeAuth.signInWithPassword.mockResolvedValue(reauthOk);
    rpc.mockResolvedValue({ data: null, error: null });

    await service.deleteOwnAccount('ClaveActual123');
    await flush();

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});
