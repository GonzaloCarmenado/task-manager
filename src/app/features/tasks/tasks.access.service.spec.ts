import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TaskInput, TaskRow } from '../../core/models/task';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { CLOCK } from '../../core/services/clock';
import { SupabaseService } from '../../core/services/supabase';
import { TasksAccessService } from './tasks.access.service';

type Result = { data: unknown; error: unknown };
type Call = [string, unknown[]];
type Settle = (signal: AbortSignal | undefined) => Promise<Result> | Result;

interface Chain extends PromiseLike<Result> {
  [method: string]: unknown;
}

const NOW = new Date(2026, 10, 13, 12, 0, 0);
const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function row(over: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 't1',
    title: 'Comprar pan',
    due_date: '2026-11-13',
    due_time: '09:30:00',
    completed_at: null,
    created_at: '2026-11-01T10:00:00.000Z',
    ...over,
  };
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const ok = (data: unknown): Result => ({ data, error: null });
const fail = (error: unknown): Result => ({ data: null, error });

function makeChain(calls: Call[], settle: Settle): Chain {
  let signalUsed: AbortSignal | undefined;
  const record =
    (name: string) =>
    (...args: unknown[]): Chain => {
      calls.push([name, args]);
      if (name === 'abortSignal') signalUsed = args[0] as AbortSignal;
      return chain;
    };
  const chain: Chain = {
    select: record('select'),
    insert: record('insert'),
    update: record('update'),
    delete: record('delete'),
    eq: record('eq'),
    or: record('or'),
    order: record('order'),
    single: record('single'),
    abortSignal: record('abortSignal'),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(settle(signalUsed)).then(onFulfilled, onRejected),
  };
  return chain;
}

function setup(options: { userId?: string | null } = {}) {
  const userId = signal<string | null>(options.userId === undefined ? USER_A : options.userId);
  const calls: Call[] = [];
  const queue: Settle[] = [];
  const from = vi.fn((table: string) => {
    calls.push(['from', [table]]);
    const settle = queue.shift() ?? (() => ok(null));
    return makeChain(calls, settle);
  });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SupabaseService, useValue: { client: { from } } },
      { provide: AuthAccessService, useValue: { userId } },
      { provide: CLOCK, useValue: () => NOW },
    ],
  });
  const service = TestBed.inject(TasksAccessService);
  const next = (settle: Settle) => queue.push(settle);
  const called = (name: string) => calls.filter(([n]) => n === name).map(([, args]) => args);
  return { service, userId, from, next, calls, called };
}

describe('TasksAccessService · carga', () => {
  it('US-005-02 carga pendientes y completadas de los últimos 30 días de la tabla tasks', async () => {
    const { service, from, next, called } = setup();
    next(() => ok([row()]));

    await service.load();

    expect(from).toHaveBeenCalledWith('tasks');
    expect(called('select')[0]).toEqual(['*']);
    const since = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(called('or')[0]).toEqual([`completed_at.is.null,completed_at.gte.${since}`]);
    expect(service.status()).toBe('ready');
  });

  it('US-005-02 mapea la fila: la hora llega como HH:MM y los nombres a camelCase', async () => {
    const { service, next } = setup();
    next(() => ok([row({ completed_at: '2026-11-12T09:00:00.000Z' })]));

    await service.load();

    expect(service.tasks()).toEqual([
      {
        id: 't1',
        title: 'Comprar pan',
        dueDate: '2026-11-13',
        dueTime: '09:30',
        completedAt: '2026-11-12T09:00:00.000Z',
        createdAt: '2026-11-01T10:00:00.000Z',
      },
    ]);
  });

  it('US-005-02 el estado loading solo se ve la primera vez; después se recarga sin parpadeo', async () => {
    const { service, next } = setup();
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));

    const first = service.load();
    expect(service.status()).toBe('loading');
    await flush();
    release(ok([row()]));
    await first;
    expect(service.status()).toBe('ready');

    next(() => new Promise<Result>((resolve) => (release = resolve)));
    const second = service.load();
    expect(service.status()).toBe('ready');
    await flush();
    release(ok([row(), row({ id: 't2' })]));
    await second;
    expect(service.tasks()).toHaveLength(2);
  });

  it('US-005-02 un fallo sin datos previos deja el estado en error con su motivo', async () => {
    const { service, next } = setup();
    next(() => fail({ message: 'TypeError: Failed to fetch', code: '' }));

    await service.load();

    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');
    expect(service.tasks()).toEqual([]);
  });

  it('US-005-02 un error que no es de red se clasifica como unknown', async () => {
    const { service, next } = setup();
    next(() => fail({ message: 'permission denied for table tasks', code: '42501' }));

    await service.load();

    expect(service.errorReason()).toBe('unknown');
  });

  it('US-005-05 si la consulta lanza una excepción, se trata como error y no se propaga', async () => {
    const { service, next } = setup();
    next(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(service.load()).resolves.toBeUndefined();
    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');
  });

  it('US-005-05 un fallo al recargar con datos previos conserva los datos y no cambia a error', async () => {
    const { service, next } = setup();
    next(() => ok([row()]));
    await service.load();
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    await service.load();

    expect(service.status()).toBe('ready');
    expect(service.tasks()).toHaveLength(1);
  });

  it('US-005-05 tras un error, un nuevo load() puede recuperarse', async () => {
    const { service, next } = setup();
    next(() => fail({ message: 'Failed to fetch', code: '' }));
    await service.load();
    next(() => ok([row()]));

    await service.load();

    expect(service.status()).toBe('ready');
    expect(service.tasks()).toHaveLength(1);
  });

  it('US-005-05 sin identidad no consulta nada', async () => {
    const { service, from } = setup({ userId: null });
    await service.load();
    expect(from).not.toHaveBeenCalled();
    expect(service.tasks()).toEqual([]);
  });
});

describe('TasksAccessService · plazo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('US-005-05 sin respuesta en 8 s aborta la consulta y devuelve error de red', async () => {
    const { service, next } = setup();
    let seen: AbortSignal | undefined;
    next(
      (signalArg) =>
        new Promise<Result>((_resolve, reject) => {
          seen = signalArg;
          signalArg?.addEventListener('abort', () =>
            reject(new DOMException('abort', 'AbortError'))
          );
        })
    );

    const loading = service.load();
    await vi.advanceTimersByTimeAsync(7_999);
    expect(service.status()).toBe('loading');
    await vi.advanceTimersByTimeAsync(2);
    await loading;

    expect(seen?.aborted).toBe(true);
    expect(service.status()).toBe('error');
    expect(service.errorReason()).toBe('network');
  });

  it('US-005-05 el plazo también aplica a crear, completar y borrar', async () => {
    const { service, next } = setup();
    const hang: Settle = (signalArg) =>
      new Promise<Result>((_resolve, reject) => {
        signalArg?.addEventListener('abort', () => reject(new DOMException('abort', 'AbortError')));
      });
    next(() => ok([row()]));
    await service.load();

    next(hang);
    const created = service.create({ title: 'Nueva', dueDate: null, dueTime: null });
    await vi.advanceTimersByTimeAsync(8_001);
    expect(await created).toEqual({ ok: false, reason: 'network' });

    next(hang);
    const done = service.setCompleted('t1', true);
    await vi.advanceTimersByTimeAsync(8_001);
    expect(await done).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')?.completedAt).toBeNull();

    next(hang);
    const removed = service.remove('t1');
    await vi.advanceTimersByTimeAsync(8_001);
    expect(await removed).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')).toBeDefined();
  });
});

describe('TasksAccessService · datos por usuario', () => {
  it('US-005-05 la caché se indexa por userId: otro usuario no ve datos ajenos', async () => {
    const { service, userId, next } = setup();
    next(() => ok([row()]));
    await service.load();
    expect(service.tasks()).toHaveLength(1);

    userId.set(USER_B);
    expect(service.tasks()).toEqual([]);
    expect(service.get('t1')).toBeUndefined();

    next(() => ok([row({ id: 'b1', title: 'De B' })]));
    await service.load();
    expect(service.tasks().map((t) => t.id)).toEqual(['b1']);

    userId.set(USER_A);
    expect(service.tasks().map((t) => t.id)).toEqual(['t1']);
  });

  it('US-005-05 el estado loading de un usuario nuevo no hereda el de otro', async () => {
    const { service, userId, next } = setup();
    next(() => ok([row()]));
    await service.load();
    userId.set(USER_B);
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));

    const loading = service.load();
    expect(service.status()).toBe('loading');
    await flush();
    release(ok([]));
    await loading;
  });

  it('US-005-05 una respuesta tardía de otro usuario no se mezcla con el actual', async () => {
    const { service, userId, next } = setup();
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));
    const loadA = service.load();

    userId.set(USER_B);
    await flush();
    release(ok([row({ id: 'a1' })]));
    await loadA;

    expect(service.tasks()).toEqual([]);
    userId.set(USER_A);
    expect(service.tasks().map((t) => t.id)).toEqual(['a1']);
  });

  it('US-005-05 nunca escribe en consola, ni con errores', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );
    const { service, next } = setup();
    next(() => fail({ message: 'detalle interno con datos', code: 'X' }));
    await service.load();
    next(() => Promise.reject(new Error('otro detalle')));
    await service.create({ title: 'x', dueDate: null, dueTime: null });

    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe('TasksAccessService · crear', () => {
  const input: TaskInput = {
    title: '  Llamar al fontanero  ',
    dueDate: '2026-11-13',
    dueTime: '16:30',
  };

  it('US-005-01 inserta con título recortado, fecha y hora, y la tarea aparece en la lista', async () => {
    const { service, next, called } = setup();
    next(() => ok(row({ id: 'n1', title: 'Llamar al fontanero', due_time: '16:30:00' })));

    const result = await service.create(input);

    expect(result).toEqual({ ok: true });
    expect(called('insert')[0]).toEqual([
      { title: 'Llamar al fontanero', due_date: '2026-11-13', due_time: '16:30' },
    ]);
    expect(service.tasks().map((t) => t.id)).toEqual(['n1']);
    expect(service.get('n1')?.dueTime).toBe('16:30');
  });

  it('US-005-01 sin fecha la hora se guarda como null', async () => {
    const { service, next, called } = setup();
    next(() => ok(row({ id: 'n1', due_date: null, due_time: null })));

    await service.create({ title: 'Idea', dueDate: null, dueTime: '10:00' });

    expect(called('insert')[0]).toEqual([{ title: 'Idea', due_date: null, due_time: null }]);
  });

  it('US-005-01 se permiten títulos repetidos', async () => {
    const { service, next } = setup();
    next(() => ok(row({ id: 'n1', title: 'Repetida' })));
    next(() => ok(row({ id: 'n2', title: 'Repetida' })));

    await service.create({ title: 'Repetida', dueDate: null, dueTime: null });
    await service.create({ title: 'Repetida', dueDate: null, dueTime: null });

    expect(service.tasks().map((t) => t.title)).toEqual(['Repetida', 'Repetida']);
  });

  it('US-005-01 si falla, devuelve el motivo y no cambia la lista', async () => {
    const { service, next } = setup();
    next(() => ok([row()]));
    await service.load();
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    const result = await service.create(input);

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.tasks()).toHaveLength(1);
  });

  it('US-005-01 sin identidad no inserta y devuelve unknown', async () => {
    const { service, from } = setup({ userId: null });
    expect(await service.create(input)).toEqual({ ok: false, reason: 'unknown' });
    expect(from).not.toHaveBeenCalled();
  });
});

describe('TasksAccessService · completar', () => {
  async function loaded() {
    const ctx = setup();
    ctx.next(() => ok([row()]));
    await ctx.service.load();
    return ctx;
  }

  it('US-005-03 completa de forma optimista, con la hora de completado, y guarda en el servidor', async () => {
    const { service, next, called } = await loaded();
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));

    const pending = service.setCompleted('t1', true);
    expect(service.get('t1')?.completedAt).toBe(NOW.toISOString());

    await flush();

    release(ok(null));
    expect(await pending).toEqual({ ok: true });
    expect(called('update')[0]).toEqual([{ completed_at: NOW.toISOString() }]);
    expect(called('eq').at(-1)).toEqual(['id', 't1']);
  });

  it('US-005-03 desmarcar vuelve a pendiente (completed_at null)', async () => {
    const { service, next, called } = await loaded();
    next(() => ok(null));
    await service.setCompleted('t1', true);
    next(() => ok(null));

    expect(await service.setCompleted('t1', false)).toEqual({ ok: true });

    expect(service.get('t1')?.completedAt).toBeNull();
    expect(called('update').at(-1)).toEqual([{ completed_at: null }]);
  });

  it('US-005-03 si falla el guardado, la tarea vuelve a su estado anterior', async () => {
    const { service, next } = await loaded();
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    const result = await service.setCompleted('t1', true);

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')?.completedAt).toBeNull();
  });

  it('US-005-03 una tarea que no existe no consulta ni cambia nada', async () => {
    const { service, from } = await loaded();
    from.mockClear();
    expect(await service.setCompleted('nope', true)).toEqual({ ok: false, reason: 'unknown' });
    expect(from).not.toHaveBeenCalled();
  });
});

describe('TasksAccessService · editar y borrar', () => {
  async function loaded() {
    const ctx = setup();
    ctx.next(() => ok([row()]));
    await ctx.service.load();
    return ctx;
  }

  it('US-005-04 edita título, fecha y hora, y la lista refleja la fila devuelta', async () => {
    const { service, next, called } = await loaded();
    next(() => ok(row({ title: 'Nuevo título', due_date: '2026-11-20', due_time: '11:00:00' })));

    const result = await service.update('t1', {
      title: ' Nuevo título ',
      dueDate: '2026-11-20',
      dueTime: '11:00',
    });

    expect(result).toEqual({ ok: true });
    expect(called('update')[0]).toEqual([
      { title: 'Nuevo título', due_date: '2026-11-20', due_time: '11:00' },
    ]);
    expect(service.get('t1')).toMatchObject({
      title: 'Nuevo título',
      dueDate: '2026-11-20',
      dueTime: '11:00',
    });
  });

  it('US-005-04 quitar la fecha quita también la hora', async () => {
    const { service, next, called } = await loaded();
    next(() => ok(row({ due_date: null, due_time: null })));

    await service.update('t1', { title: 'Comprar pan', dueDate: null, dueTime: '09:30' });

    expect(called('update')[0]).toEqual([{ title: 'Comprar pan', due_date: null, due_time: null }]);
    expect(service.get('t1')).toMatchObject({ dueDate: null, dueTime: null });
  });

  it('US-005-04 si falla la edición, la tarea conserva sus datos', async () => {
    const { service, next } = await loaded();
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    const result = await service.update('t1', { title: 'Otro', dueDate: null, dueTime: null });

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')?.title).toBe('Comprar pan');
  });

  it('US-005-04 borra de forma optimista y pide el borrado de esa fila', async () => {
    const { service, next, called } = await loaded();
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));

    const pending = service.remove('t1');
    expect(service.get('t1')).toBeUndefined();
    await flush();
    release(ok(null));

    expect(await pending).toEqual({ ok: true });
    expect(called('delete')).toHaveLength(1);
    expect(called('eq').at(-1)).toEqual(['id', 't1']);
  });

  it('US-005-04 si falla el borrado, la tarea vuelve a la lista', async () => {
    const { service, next } = await loaded();
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    const result = await service.remove('t1');

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')).toBeDefined();
  });
});
