import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountResult } from '../../core/models/account';
import { AuthSession } from '../../core/models/auth-session';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { TasksAccessService } from '../tasks/tasks.access.service';
import { Task, TaskInput } from '../../core/models/task';
import { TasksStatus, TaskOpResult } from '../tasks/tasks.access.service';
import { ACCOUNT_STORAGE, AccountAccessService } from './account.access.service';

const ACCOUNT: AuthSession = {
  user: { id: 'user-1', isAnonymous: false, username: 'carlos_ritmo' },
  expiresAt: 0,
};
const ANONYMOUS: AuthSession = {
  user: { id: 'anon-1', isAnonymous: true, username: null },
  expiresAt: 0,
};

function setup(initial: AuthSession | null = ANONYMOUS) {
  const session = signal<AuthSession | null>(initial);
  const signOut = vi.fn<() => Promise<AccountResult>>(async () => ({ ok: true }));
  const canSignOut = vi.fn(() => true);
  const linkAccount = vi.fn<(u: string, p: string) => Promise<AccountResult>>(async () => ({
    ok: true,
  }));
  const forget = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthAccessService, useValue: { session, signOut, canSignOut, linkAccount } },
      { provide: TasksAccessService, useValue: { forget } },
    ],
  });
  return {
    service: TestBed.inject(AccountAccessService),
    session,
    signOut,
    canSignOut,
    linkAccount,
    forget,
  };
}

describe('AccountAccessService · sesión', () => {
  it('US-011-04 sin cuenta: isAnonymous y sin nombre de usuario', () => {
    const { service } = setup(ANONYMOUS);
    expect(service.hasAccount()).toBe(false);
    expect(service.isAnonymous()).toBe(true);
    expect(service.username()).toBeNull();
  });

  it('US-011-04 con cuenta: hasAccount y el nombre de usuario de la sesión', () => {
    const { service } = setup(ACCOUNT);
    expect(service.hasAccount()).toBe(true);
    expect(service.isAnonymous()).toBe(false);
    expect(service.username()).toBe('carlos_ritmo');
  });

  it('US-011-04 sin sesión no hay cuenta ni se considera anónima', () => {
    const { service } = setup(null);
    expect(service.hasAccount()).toBe(false);
    expect(service.isAnonymous()).toBe(false);
    expect(service.username()).toBeNull();
  });

  it('US-011-04 reacciona cuando la sesión cambia', () => {
    const { service, session } = setup(ANONYMOUS);
    session.set(ACCOUNT);
    expect(service.username()).toBe('carlos_ritmo');
    session.set(ANONYMOUS);
    expect(service.hasAccount()).toBe(false);
  });
});

describe('AccountAccessService · cerrar sesión', () => {
  it('US-011-04 canSignOut delega en la identidad (sin red no se puede cerrar)', () => {
    const { service, canSignOut } = setup(ACCOUNT);
    expect(service.canSignOut()).toBe(true);
    canSignOut.mockReturnValue(false);
    expect(service.canSignOut()).toBe(false);
  });

  it('US-011-04 signOut delega y vacía de memoria las tareas de la cuenta saliente', async () => {
    const { service, signOut, forget } = setup(ACCOUNT);

    expect(await service.signOut()).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(forget).toHaveBeenCalledWith('user-1');
  });

  it('US-011-04 si el cierre falla no se vacía nada y se devuelve el motivo', async () => {
    const { service, signOut, forget } = setup(ACCOUNT);
    signOut.mockResolvedValue({ ok: false, reason: 'network' });

    expect(await service.signOut()).toEqual({ ok: false, reason: 'network' });
    expect(forget).not.toHaveBeenCalled();
  });

  it('US-011-04 una sesión anónima no puede cerrar sesión y no toca nada', async () => {
    const { service, signOut, forget } = setup(ANONYMOUS);

    expect(await service.signOut()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(signOut).not.toHaveBeenCalled();
    expect(forget).not.toHaveBeenCalled();
  });
});

describe('AccountAccessService · crear cuenta', () => {
  const PASSWORD = ['Mi', 'Clave', 'Segura1'].join('');

  it('US-011-01 vincula la sesión anónima con el nombre normalizado y la contraseña', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);

    expect(await service.createAccount('  Carlos_Ritmo ', PASSWORD)).toEqual({ ok: true });

    expect(linkAccount).toHaveBeenCalledTimes(1);
    expect(linkAccount).toHaveBeenCalledWith('carlos_ritmo', PASSWORD);
  });

  it('US-011-01 conserva las tareas y el progreso: no se vacía nada de memoria', async () => {
    const { service, forget } = setup(ANONYMOUS);
    await service.createAccount('carlos_ritmo', PASSWORD);
    expect(forget).not.toHaveBeenCalled();
  });

  it('US-011-01 un nombre con formato inválido se rechaza sin llamar al servidor', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);

    for (const bad of ['ab', 'a'.repeat(25), 'ana lopez', 'ana@mail', '']) {
      expect(await service.createAccount(bad, PASSWORD), bad).toEqual({
        ok: false,
        reason: 'invalid-username',
      });
    }
    expect(linkAccount).not.toHaveBeenCalled();
  });

  it('US-011-01 una contraseña que no cumple las reglas se rechaza sin llamar al servidor', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);

    expect(await service.createAccount('carlos_ritmo', 'corta')).toEqual({
      ok: false,
      reason: 'weak-password',
    });
    expect(await service.createAccount('carlos_ritmo', 'Carlos_Ritmo')).toEqual({
      ok: false,
      reason: 'weak-password',
    });
    expect(linkAccount).not.toHaveBeenCalled();
  });

  it('US-011-01 devuelve tal cual el motivo del servidor (nombre ocupado, sin red…)', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);
    for (const reason of ['username-taken', 'network', 'timeout', 'rate-limited'] as const) {
      linkAccount.mockResolvedValueOnce({ ok: false, reason });
      expect(await service.createAccount('carlos_ritmo', PASSWORD)).toEqual({ ok: false, reason });
    }
  });

  it('US-011-01 quien ya tiene cuenta, o no hay sesión, no puede crear otra', async () => {
    const withAccount = setup(ACCOUNT);
    expect(await withAccount.service.createAccount('otro_nombre', PASSWORD)).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
    expect(withAccount.linkAccount).not.toHaveBeenCalled();

    const none = setup(null);
    expect(await none.service.createAccount('otro_nombre', PASSWORD)).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
  });
});

// ---- Iniciar sesión y tareas de este móvil (US-011-02) ---------------------------------------------
const NEW_ID = 'account-9';
const STORE_KEY = 'task-manager-pending-transfer';

function task(over: Partial<Task> & { title: string }): Task {
  return {
    id: over.title,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    createdAt: '2026-11-14T10:00:00.000Z',
    postponedCount: 0,
    ...over,
  };
}

function flowSetup(
  initial: AuthSession | null = ANONYMOUS,
  options: { tasks?: Task[]; status?: TasksStatus; stored?: string } = {}
) {
  const session = signal<AuthSession | null>(initial);
  const tasksList = signal<Task[]>(options.tasks ?? []);
  const status = signal<TasksStatus>(options.status ?? 'ready');
  const store = new Map<string, string>();
  if (options.stored !== undefined) store.set(STORE_KEY, options.stored);
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const order: string[] = [];
  const checkCredentials = vi.fn<(u: string, p: string) => Promise<AccountResult>>(async () => ({
    ok: true,
  }));
  const completeSignIn = vi.fn<() => Promise<AccountResult>>(async () => {
    order.push('complete');
    session.set({ user: { id: NEW_ID, isAnonymous: false, username: 'ana' }, expiresAt: 0 });
    return { ok: true };
  });
  const cancelSignIn = vi.fn();
  const load = vi.fn(async () => {
    status.set('ready');
  });
  const create = vi.fn<(i: TaskInput) => Promise<TaskOpResult>>(async () => {
    order.push('create');
    return { ok: true };
  });
  const forget = vi.fn();

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthAccessService,
        useValue: { session, checkCredentials, completeSignIn, cancelSignIn },
      },
      { provide: TasksAccessService, useValue: { tasks: tasksList, status, load, create, forget } },
      { provide: ACCOUNT_STORAGE, useValue: storage },
    ],
  });
  return {
    service: TestBed.inject(AccountAccessService),
    session,
    tasksList,
    status,
    store,
    order,
    checkCredentials,
    completeSignIn,
    cancelSignIn,
    load,
    create,
    forget,
  };
}

const MIXED = [
  task({ title: 'Comprar pan', dueDate: '2026-11-15', dueTime: '18:30' }),
  task({ title: 'Llamar al banco' }),
  task({ title: 'Ya hecha', completedAt: '2026-11-14T09:00:00.000Z' }),
];

describe('AccountAccessService · tareas de este móvil', () => {
  it('US-011-02 con sesión anónima: instantánea de pendientes y número de completadas', () => {
    const { service } = flowSetup(ANONYMOUS, { tasks: MIXED });
    expect(service.localTasks()).toEqual({
      pending: [
        { title: 'Comprar pan', dueDate: '2026-11-15', dueTime: '18:30' },
        { title: 'Llamar al banco', dueDate: null, dueTime: null },
      ],
      completed: 1,
    });
  });

  it('US-011-02 con cuenta o sin sesión no hay tareas «de este móvil»', () => {
    expect(flowSetup(ACCOUNT, { tasks: MIXED }).service.localTasks()).toEqual({
      pending: [],
      completed: 0,
    });
    expect(flowSetup(null, { tasks: MIXED }).service.localTasks()).toEqual({
      pending: [],
      completed: 0,
    });
  });

  it('US-011-02 sigue a la lista de tareas cuando cambia', () => {
    const { service, tasksList } = flowSetup(ANONYMOUS, { tasks: [] });
    expect(service.localTasks().pending).toHaveLength(0);
    tasksList.set(MIXED);
    expect(service.localTasks().pending).toHaveLength(2);
  });
});

describe('AccountAccessService · iniciar sesión (comprobación)', () => {
  const PASS = ['Clave', 'Segura', '123'].join('');

  it('US-011-02 comprueba las credenciales sin cambiar de identidad y guarda la instantánea', async () => {
    const { service, checkCredentials, completeSignIn } = flowSetup(ANONYMOUS, { tasks: MIXED });

    expect(await service.startSignIn('Ana', PASS)).toEqual({ ok: true });

    expect(checkCredentials).toHaveBeenCalledWith('Ana', PASS);
    expect(completeSignIn).not.toHaveBeenCalled();
    expect(service.signInSnapshot()?.pending).toHaveLength(2);
    expect(service.signInSnapshot()?.completed).toBe(1);
  });

  it('US-011-02 la instantánea se congela: cambios posteriores en la lista no la alteran', async () => {
    const { service, tasksList } = flowSetup(ANONYMOUS, { tasks: MIXED });
    await service.startSignIn('ana', PASS);
    tasksList.set([]);
    expect(service.signInSnapshot()?.pending).toHaveLength(2);
  });

  it('US-011-02 si las tareas aún no se han cargado, las carga antes de capturar', async () => {
    const { service, load, tasksList } = flowSetup(ANONYMOUS, { status: 'idle' });
    load.mockImplementation(async () => {
      tasksList.set(MIXED);
    });
    await service.startSignIn('ana', PASS);
    expect(load).toHaveBeenCalledTimes(1);
    expect(service.signInSnapshot()?.pending).toHaveLength(2);
  });

  it.each(['invalid-credentials', 'rate-limited', 'network', 'timeout'] as const)(
    'US-011-02 el fallo «%s» se devuelve y no deja instantánea',
    async (reason) => {
      const { service, checkCredentials } = flowSetup(ANONYMOUS, { tasks: MIXED });
      checkCredentials.mockResolvedValue({ ok: false, reason });
      expect(await service.startSignIn('ana', PASS)).toEqual({ ok: false, reason });
      expect(service.signInSnapshot()).toBeNull();
    }
  );

  it('US-011-02 quien ya tiene cuenta no puede iniciar otra sesión desde aquí', async () => {
    const { service, checkCredentials } = flowSetup(ACCOUNT);
    expect(await service.startSignIn('ana', PASS)).toEqual({ ok: false, reason: 'unauthorized' });
    expect(checkCredentials).not.toHaveBeenCalled();
  });

  it('US-011-02 cancelar descarta lo comprobado y la instantánea', async () => {
    const { service, cancelSignIn } = flowSetup(ANONYMOUS, { tasks: MIXED });
    await service.startSignIn('ana', PASS);
    service.cancelSignIn();
    expect(cancelSignIn).toHaveBeenCalledTimes(1);
    expect(service.signInSnapshot()).toBeNull();
  });
});

describe('AccountAccessService · terminar el inicio de sesión', () => {
  const PASS = ['Clave', 'Segura', '123'].join('');

  async function started(options: Parameters<typeof flowSetup>[1] = { tasks: MIXED }) {
    const ctx = flowSetup(ANONYMOUS, options);
    await ctx.service.startSignIn('ana', PASS);
    return ctx;
  }

  it('US-011-02 «traer»: guarda el buffer antes de entrar y recrea solo las pendientes', async () => {
    const { service, create, order, forget, store } = await started();
    const stored: string[] = [];
    const original = store.set.bind(store);
    store.set = (k, v) => {
      stored.push(k);
      return original(k, v);
    };

    expect(await service.finishSignIn('merge')).toEqual({ ok: true });

    expect(stored[0]).toBe(STORE_KEY); // el buffer existe antes de cambiar de identidad
    expect(order).toEqual(['complete', 'create', 'create']);
    expect(create).toHaveBeenNthCalledWith(1, {
      title: 'Comprar pan',
      dueDate: '2026-11-15',
      dueTime: '18:30',
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      title: 'Llamar al banco',
      dueDate: null,
      dueTime: null,
    });
    expect(forget).toHaveBeenCalledWith('anon-1');
    expect(store.has(STORE_KEY)).toBe(false);
    expect(service.transferPending()).toBe(false);
  });

  it('US-011-02 las completadas y su XP no se traspasan', async () => {
    const { service, create } = await started({
      tasks: [task({ title: 'Hecha', completedAt: '2026-11-14T09:00:00.000Z' })],
    });
    await service.finishSignIn('merge');
    expect(create).not.toHaveBeenCalled();
  });

  it('US-011-02 si falla a mitad: entra igualmente, conserva lo que falta y lo reintenta sin duplicar', async () => {
    const { service, create, store, session } = await started();
    create
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: 'network' });

    expect(await service.finishSignIn('merge')).toEqual({ ok: true });
    expect(session()?.user.id).toBe(NEW_ID);
    expect(service.transferPending()).toBe(true);
    expect(JSON.parse(store.get(STORE_KEY) as string).tasks).toEqual([
      { title: 'Llamar al banco', dueDate: null, dueTime: null },
    ]);

    create.mockClear();
    await service.resumePendingTransfer();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ title: 'Llamar al banco', dueDate: null, dueTime: null });
    expect(store.has(STORE_KEY)).toBe(false);
    expect(service.transferPending()).toBe(false);
  });

  it('US-011-02 si no se puede completar la entrada: no se crea nada y no queda buffer', async () => {
    const { service, completeSignIn, create, forget, store } = await started();
    completeSignIn.mockResolvedValue({ ok: false, reason: 'unauthorized' });

    expect(await service.finishSignIn('merge')).toEqual({ ok: false, reason: 'unauthorized' });
    expect(create).not.toHaveBeenCalled();
    expect(forget).not.toHaveBeenCalled();
    expect(store.has(STORE_KEY)).toBe(false);
  });

  it.each(['discard', 'none'] as const)(
    'US-011-02 «%s»: entra sin recrear nada y suelta lo del móvil',
    async (mode) => {
      const { service, create, forget, store, session } = await started();
      expect(await service.finishSignIn(mode)).toEqual({ ok: true });
      expect(session()?.user.id).toBe(NEW_ID);
      expect(create).not.toHaveBeenCalled();
      expect(forget).toHaveBeenCalledWith('anon-1');
      expect(store.has(STORE_KEY)).toBe(false);
    }
  );

  it('US-011-02 la instantánea se limpia al entrar', async () => {
    const { service } = await started();
    await service.finishSignIn('none');
    expect(service.signInSnapshot()).toBeNull();
  });

  it('US-011-02 sin una comprobación previa no se puede terminar', async () => {
    const { service, completeSignIn } = flowSetup(ANONYMOUS, { tasks: MIXED });
    expect(await service.finishSignIn('merge')).toEqual({ ok: false, reason: 'unauthorized' });
    expect(completeSignIn).not.toHaveBeenCalled();
  });
});

describe('AccountAccessService · reanudar el traspaso', () => {
  const buffer = (over: Record<string, unknown> = {}) =>
    JSON.stringify({
      source: 'anon-1',
      target: NEW_ID,
      tasks: [{ title: 'Pendiente', dueDate: null, dueTime: null }],
      ...over,
    });
  const ACCOUNT_9: AuthSession = {
    user: { id: NEW_ID, isAnonymous: false, username: 'ana' },
    expiresAt: 0,
  };

  it('US-011-02 con la cuenta abierta y un buffer suyo, crea lo que falta y lo borra', async () => {
    const { service, create, store } = flowSetup(ACCOUNT_9, { stored: buffer() });
    await service.resumePendingTransfer();
    expect(create).toHaveBeenCalledWith({ title: 'Pendiente', dueDate: null, dueTime: null });
    expect(store.has(STORE_KEY)).toBe(false);
  });

  it('US-011-02 si el destino aún no estaba fijado, adopta la cuenta abierta', async () => {
    const { service, create } = flowSetup(ACCOUNT_9, { stored: buffer({ target: null }) });
    await service.resumePendingTransfer();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 sin buffer no hace nada', async () => {
    const { service, create } = flowSetup(ACCOUNT_9);
    await service.resumePendingTransfer();
    expect(create).not.toHaveBeenCalled();
  });

  it('US-011-02 con sesión anónima no traspasa; un buffer de esta misma identidad se descarta', async () => {
    const stale = flowSetup(ANONYMOUS, { stored: buffer({ source: 'anon-1', target: null }) });
    await stale.service.resumePendingTransfer();
    expect(stale.create).not.toHaveBeenCalled();
    expect(stale.store.has(STORE_KEY)).toBe(false);

    const other = flowSetup(ANONYMOUS, { stored: buffer({ source: 'otro-anonimo' }) });
    await other.service.resumePendingTransfer();
    expect(other.create).not.toHaveBeenCalled();
  });

  it('US-011-02 un buffer de otra cuenta no se vuelca en esta: se descarta', async () => {
    const { service, create, store } = flowSetup(ACCOUNT_9, {
      stored: buffer({ target: 'otra-cuenta' }),
    });
    await service.resumePendingTransfer();
    expect(create).not.toHaveBeenCalled();
    expect(store.has(STORE_KEY)).toBe(false);
  });

  it('US-011-02 un buffer corrupto se ignora y se borra', async () => {
    const { service, create, store } = flowSetup(ACCOUNT_9, { stored: '{no es json' });
    await service.resumePendingTransfer();
    expect(create).not.toHaveBeenCalled();
    expect(store.has(STORE_KEY)).toBe(false);
  });
});
