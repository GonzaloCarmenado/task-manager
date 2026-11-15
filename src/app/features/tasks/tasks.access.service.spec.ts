import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Recurrence, SeriesRow } from '../../core/models/recurrence';
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
    postponed_count: 0,
    series_id: null,
    series_date: null,
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

function setup(options: { userId?: string | null; now?: Date } = {}) {
  const userId = signal<string | null>(options.userId === undefined ? USER_A : options.userId);
  const calls: Call[] = [];
  const queue: Settle[] = [];
  /** Las consultas a `task_series` tienen su propia cola: por defecto, lista vacía. */
  const seriesQueue: Settle[] = [];
  const from = vi.fn((table: string) => {
    calls.push(['from', [table]]);
    const settle =
      table === 'task_series'
        ? (seriesQueue.shift() ?? (() => ok([])))
        : (queue.shift() ?? (() => ok(null)));
    return makeChain(calls, settle);
  });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SupabaseService, useValue: { client: { from } } },
      { provide: AuthAccessService, useValue: { userId } },
      { provide: CLOCK, useValue: () => options.now ?? NOW },
    ],
  });
  const service = TestBed.inject(TasksAccessService);
  const next = (settle: Settle) => queue.push(settle);
  const nextSeries = (settle: Settle) => seriesQueue.push(settle);
  const called = (name: string) => calls.filter(([n]) => n === name).map(([, args]) => args);
  return { service, userId, from, next, nextSeries, calls, called };
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
    next(() => ok([row({ completed_at: '2026-11-12T09:00:00.000Z', postponed_count: 2 })]));

    await service.load();

    expect(service.tasks()).toEqual([
      {
        id: 't1',
        title: 'Comprar pan',
        dueDate: '2026-11-13',
        dueTime: '09:30',
        completedAt: '2026-11-12T09:00:00.000Z',
        createdAt: '2026-11-01T10:00:00.000Z',
        postponedCount: 2,
        seriesId: null,
        seriesDate: null,
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

  it('US-011-04 forget borra de memoria las tareas y el estado de un usuario que sale', async () => {
    const { service, userId, next } = setup();
    next(() => ok([row()]));
    await service.load();
    expect(service.tasks()).toHaveLength(1);

    service.forget(USER_A);
    expect(service.tasks()).toEqual([]);
    expect(service.status()).toBe('idle');

    userId.set(USER_B);
    userId.set(USER_A);
    expect(service.tasks()).toEqual([]);
  });

  it('US-011-04 forget solo afecta al usuario indicado', async () => {
    const { service, userId, next } = setup();
    next(() => ok([row()]));
    await service.load();
    userId.set(USER_B);
    next(() => ok([row({ id: 'b1', title: 'De B' })]));
    await service.load();

    service.forget(USER_A);
    expect(service.tasks().map((t) => t.id)).toEqual(['b1']);
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
    expect(called('update')[0]).toEqual([
      { completed_at: NOW.toISOString(), completed_day: '2026-11-13' },
    ]);
    expect(called('eq').at(-1)).toEqual(['id', 't1']);
  });

  it('US-005-03 una recarga que llega con datos antiguos no deshace un cambio optimista en curso', async () => {
    const { service, next } = await loaded();
    let releaseLoad: (r: Result) => void = () => undefined;
    let releaseUpdate: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseLoad = resolve)));
    const reloading = service.load();
    next(() => new Promise<Result>((resolve) => (releaseUpdate = resolve)));
    const completing = service.setCompleted('t1', true);
    await flush();

    releaseLoad(ok([row()])); // el servidor aún no sabe lo de «completada»
    await reloading;
    expect(service.get('t1')?.completedAt).toBe(NOW.toISOString());

    releaseUpdate(ok(null));
    await completing;
    expect(service.get('t1')?.completedAt).toBe(NOW.toISOString());
  });

  it('US-005-04 una recarga con datos antiguos no hace reaparecer una tarea que se está borrando', async () => {
    const { service, next } = await loaded();
    let releaseLoad: (r: Result) => void = () => undefined;
    let releaseDelete: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseLoad = resolve)));
    const reloading = service.load();
    next(() => new Promise<Result>((resolve) => (releaseDelete = resolve)));
    const removing = service.remove('t1');
    await flush();

    releaseLoad(ok([row()]));
    await reloading;
    expect(service.get('t1')).toBeUndefined();

    releaseDelete(ok(null));
    await removing;
    expect(service.get('t1')).toBeUndefined();
  });

  it('US-005-03 una recarga lanzada antes del cambio y resuelta después de confirmarse no lo deshace', async () => {
    const { service, next } = await loaded();
    let releaseLoad: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseLoad = resolve)));
    const reloading = service.load();
    next(() => ok(null));
    await service.setCompleted('t1', true); // el cambio ya está confirmado
    await flush();

    releaseLoad(ok([row()])); // respuesta de una consulta anterior al cambio
    await reloading;

    expect(service.get('t1')?.completedAt).toBe(NOW.toISOString());
  });

  it('US-005-04 una recarga lanzada antes del borrado y resuelta después de confirmarse no lo deshace', async () => {
    const { service, next } = await loaded();
    let releaseLoad: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseLoad = resolve)));
    const reloading = service.load();
    next(() => ok(null));
    await service.remove('t1');
    await flush();

    releaseLoad(ok([row()]));
    await reloading;

    expect(service.get('t1')).toBeUndefined();
  });

  it('US-005-01 una recarga lanzada antes de crear y resuelta después no hace desaparecer la tarea nueva', async () => {
    const { service, next } = await loaded();
    let releaseLoad: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseLoad = resolve)));
    const reloading = service.load();
    next(() => ok(row({ id: 'n1', title: 'Nueva' })));
    await service.create({ title: 'Nueva', dueDate: null, dueTime: null });
    await flush();

    releaseLoad(ok([row()]));
    await reloading;

    expect(service.get('n1')).toBeDefined();
  });

  it('US-005-03 desmarcar vuelve a pendiente (completed_at null)', async () => {
    const { service, next, called } = await loaded();
    next(() => ok(null));
    await service.setCompleted('t1', true);
    next(() => ok(null));

    expect(await service.setCompleted('t1', false)).toEqual({ ok: true });

    expect(service.get('t1')?.completedAt).toBeNull();
    expect(called('update').at(-1)).toEqual([{ completed_at: null, completed_day: null }]);
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

describe('TasksAccessService · día local del completado', () => {
  async function loaded() {
    const ctx = setup();
    ctx.next(() => ok([row()]));
    await ctx.service.load();
    return ctx;
  }

  it('US-008-01 envía el día local (no el UTC) también a las 23:59 y a las 00:01', async () => {
    for (const [moment, day] of [
      [new Date(2026, 10, 13, 23, 59, 30), '2026-11-13'],
      [new Date(2026, 10, 14, 0, 1, 0), '2026-11-14'],
    ] as const) {
      const ctx = setup({ now: moment });
      ctx.next(() => ok([row()]));
      await ctx.service.load();
      ctx.next(() => ok(null));
      await ctx.service.setCompleted('t1', true);
      expect(ctx.called('update')[0]).toEqual([
        { completed_at: moment.toISOString(), completed_day: day },
      ]);
    }
  });

  it('US-008-01 desmarcar envía completed_at y completed_day a null', async () => {
    const { service, next, called } = await loaded();
    next(() => ok(null));
    await service.setCompleted('t1', true);
    next(() => ok(null));
    await service.setCompleted('t1', false);
    expect(called('update')[1]).toEqual([{ completed_at: null, completed_day: null }]);
  });

  it('US-008-01 si falla, no se queda ningún día inventado en la tarea', async () => {
    const { service, next } = await loaded();
    next(() => fail(new Error('Failed to fetch')));
    const result = await service.setCompleted('t1', true);
    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')?.completedAt).toBeNull();
  });
});

describe('TasksAccessService · posponer', () => {
  const target = { dueDate: '2026-11-15', dueTime: '09:30' };

  async function loaded(over: Partial<TaskRow> = {}) {
    const ctx = setup();
    ctx.next(() => ok([row(over)]));
    await ctx.service.load();
    return ctx;
  }

  it('US-007-01 cambia fecha y hora al instante y guarda fecha, hora y contador', async () => {
    const { service, next, called } = await loaded();
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));

    const pending = service.postpone('t1', target);
    expect(service.get('t1')?.dueDate).toBe('2026-11-15');
    expect(service.get('t1')?.dueTime).toBe('09:30');
    expect(service.get('t1')?.postponedCount).toBe(1);

    await flush();
    release(ok(null));
    expect(await pending).toEqual({ ok: true });
    expect(called('update')[0]).toEqual([
      { due_date: '2026-11-15', due_time: '09:30', postponed_count: 1 },
    ]);
    expect(called('eq').at(-1)).toEqual(['id', 't1']);
  });

  it('US-007-02 el contador suma sobre el que ya tenía', async () => {
    const { service, next, called } = await loaded({ postponed_count: 3 });
    next(() => ok(null));
    await service.postpone('t1', target);
    expect(service.get('t1')?.postponedCount).toBe(4);
    expect(called('update')[0]).toEqual([
      { due_date: '2026-11-15', due_time: '09:30', postponed_count: 4 },
    ]);
  });

  it('US-007-02 ponerle fecha a una tarea sin fecha no sube el contador', async () => {
    const { service, next, called } = await loaded({ due_date: null, due_time: null });
    next(() => ok(null));
    await service.postpone('t1', { dueDate: '2026-11-15', dueTime: null });
    expect(service.get('t1')?.dueDate).toBe('2026-11-15');
    expect(service.get('t1')?.postponedCount).toBe(0);
    expect(called('update')[0]).toEqual([
      { due_date: '2026-11-15', due_time: null, postponed_count: 0 },
    ]);
  });

  it('US-007-02 editar a mano, completar y desmarcar no tocan el contador', async () => {
    const { service, next, called } = await loaded({ postponed_count: 2 });
    next(() => ok(row({ postponed_count: 2, due_date: '2026-11-20' })));
    await service.update('t1', { title: 'Comprar pan', dueDate: '2026-11-20', dueTime: null });
    expect(called('update')[0]).toEqual([
      { title: 'Comprar pan', due_date: '2026-11-20', due_time: null },
    ]);
    next(() => ok(null));
    await service.setCompleted('t1', true);
    next(() => ok(null));
    await service.setCompleted('t1', false);
    expect(service.get('t1')?.postponedCount).toBe(2);
  });

  it('US-007-01 si falla, la tarea vuelve a su sitio con su contador', async () => {
    const { service, next } = await loaded({ postponed_count: 1 });
    next(() => fail(new Error('Failed to fetch')));

    const result = await service.postpone('t1', target);

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(service.get('t1')?.dueDate).toBe('2026-11-13');
    expect(service.get('t1')?.dueTime).toBe('09:30');
    expect(service.get('t1')?.postponedCount).toBe(1);
  });

  it('US-007-01 una recarga lanzada antes y resuelta después de posponer no lo deshace', async () => {
    const { service, next } = await loaded();
    let releaseLoad: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseLoad = resolve)));
    const reloading = service.load();
    next(() => ok(null));
    await service.postpone('t1', target);
    await flush();

    releaseLoad(ok([row()])); // respuesta anterior al cambio
    await reloading;

    expect(service.get('t1')?.dueDate).toBe('2026-11-15');
  });

  it('US-007-01 sin identidad o con una tarea desconocida no consulta y devuelve unknown', async () => {
    const { service, from } = setup({ userId: null });
    expect(await service.postpone('t1', target)).toEqual({ ok: false, reason: 'unknown' });
    const loadedCtx = await loaded();
    expect(await loadedCtx.service.postpone('nope', target)).toEqual({
      ok: false,
      reason: 'unknown',
    });
    expect(from).not.toHaveBeenCalled();
  });
});

// ───────────────────────── Spec 012: tareas repetitivas ─────────────────────────

function seriesRow(over: Partial<SeriesRow> = {}): SeriesRow {
  return {
    id: 's1',
    title: 'Pastilla',
    due_time: '08:00:00',
    kind: 'daily',
    interval_n: 1,
    weekdays: [],
    month_day: null,
    start_date: '2026-11-13',
    until_date: null,
    ...over,
  };
}

function occurrence(over: Partial<TaskRow> = {}): TaskRow {
  return row({
    id: 'o1',
    title: 'Pastilla',
    due_date: '2026-11-13',
    due_time: '08:00:00',
    series_id: 's1',
    series_date: '2026-11-13',
    ...over,
  });
}

const weeklyRule = (over: Partial<Recurrence> = {}): Recurrence => ({
  kind: 'weekly',
  interval: 1,
  weekdays: [1, 4],
  monthDay: null,
  startDate: '2026-11-16',
  until: null,
  ...over,
});

async function loadedSeries(
  tasks: TaskRow[] = [occurrence()],
  series: SeriesRow[] = [seriesRow()],
  options: { now?: Date } = {}
) {
  const ctx = setup(options);
  ctx.next(() => ok(tasks));
  ctx.nextSeries(() => ok(series));
  await ctx.service.load();
  return ctx;
}

describe('TasksAccessService · series · carga', () => {
  it('US-012-01 carga las series con las tareas y las asocia a sus ocurrencias', async () => {
    const { service, from } = await loadedSeries();

    expect(from).toHaveBeenCalledWith('task_series');
    expect(service.seriesOf(service.get('o1')!)).toEqual({
      id: 's1',
      title: 'Pastilla',
      dueTime: '08:00',
      recurrence: {
        kind: 'daily',
        interval: 1,
        weekdays: [],
        monthDay: null,
        startDate: '2026-11-13',
        until: null,
      },
    });
  });

  it('US-012-01 una tarea suelta no tiene serie', async () => {
    const { service } = await loadedSeries([row()], []);
    expect(service.seriesOf(service.get('t1')!)).toBeUndefined();
  });

  it('US-012-01 una serie con una ocurrencia pendiente no crea otra al cargar', async () => {
    const { called } = await loadedSeries();
    expect(called('insert')).toHaveLength(0);
  });

  it('US-012-01 si falla la carga de las series sin datos previos, la carga falla', async () => {
    const ctx = setup();
    ctx.next(() => ok([row()]));
    ctx.nextSeries(() => fail({ message: 'Failed to fetch', code: '' }));

    await ctx.service.load();

    expect(ctx.service.status()).toBe('error');
    expect(ctx.service.errorReason()).toBe('network');
  });

  it('US-012-01 las series son de cada usuario y forget las descarta', async () => {
    const { service, userId } = await loadedSeries();
    expect(service.series().size).toBe(1);

    userId.set(USER_B);
    expect(service.series().size).toBe(0);

    userId.set(USER_A);
    service.forget(USER_A);
    expect(service.series().size).toBe(0);
  });
});

describe('TasksAccessService · series · crear', () => {
  const input = (over: Partial<TaskInput> = {}): TaskInput => ({
    title: 'Pastilla',
    dueDate: '2026-11-16',
    dueTime: '08:00',
    recurrence: weeklyRule(),
    ...over,
  });

  it('US-012-01 crea la serie y su primera ocurrencia, enlazadas', async () => {
    const { service, next, nextSeries, called } = setup();
    nextSeries(() => ok(seriesRow({ kind: 'weekly', weekdays: [1, 4], start_date: '2026-11-16' })));
    next(() => ok(occurrence({ due_date: '2026-11-16', series_date: '2026-11-16' })));

    const result = await service.create(input());

    expect(result).toEqual({ ok: true });
    expect(called('insert')[0]).toEqual([
      {
        title: 'Pastilla',
        due_time: '08:00',
        kind: 'weekly',
        interval_n: 1,
        weekdays: [1, 4],
        month_day: null,
        start_date: '2026-11-16',
        until_date: null,
      },
    ]);
    expect(called('insert')[1]).toEqual([
      {
        title: 'Pastilla',
        due_date: '2026-11-16',
        due_time: '08:00',
        series_id: 's1',
        series_date: '2026-11-16',
      },
    ]);
    expect(service.get('o1')).toMatchObject({ seriesId: 's1', seriesDate: '2026-11-16' });
    expect(service.seriesOf(service.get('o1')!)?.recurrence.weekdays).toEqual([1, 4]);
  });

  it('US-012-01 el traspaso entre identidades conserva el día previsto de origen', async () => {
    const { service, next, nextSeries, called } = setup();
    nextSeries(() => ok(seriesRow()));
    next(() => ok(occurrence()));

    await service.create(input({ seriesDate: '2026-11-15' }));

    expect(called('insert')[1]).toEqual([
      expect.objectContaining({ due_date: '2026-11-16', series_date: '2026-11-15' }),
    ]);
  });

  it('US-012-01 si falla la ocurrencia, borra la serie y devuelve el error', async () => {
    const { service, next, nextSeries, called } = setup();
    nextSeries(() => ok(seriesRow()));
    next(() => fail({ message: 'Failed to fetch', code: '' }));
    nextSeries(() => ok(null)); // borrado de la serie

    const result = await service.create(input());

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(called('delete')).toHaveLength(1);
    expect(called('eq').at(-1)).toEqual(['id', 's1']);
    expect(service.tasks()).toEqual([]);
    expect(service.series().size).toBe(0);
  });

  it('US-012-01 si falla la serie no se crea ninguna tarea', async () => {
    const { service, nextSeries, called } = setup();
    nextSeries(() => fail({ message: 'Failed to fetch', code: '' }));

    expect(await service.create(input())).toEqual({ ok: false, reason: 'network' });
    expect(called('insert')).toHaveLength(1);
  });

  it('US-012-01 repetir sin fecha o con una regla inválida se rechaza sin consultar', async () => {
    const { service, from } = setup();

    expect(await service.create(input({ dueDate: null, dueTime: null }))).toEqual({
      ok: false,
      reason: 'unknown',
    });
    expect(await service.create(input({ recurrence: weeklyRule({ weekdays: [] }) }))).toEqual({
      ok: false,
      reason: 'unknown',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('US-012-01 una tarea sin regla se crea como hasta ahora, sin tocar las series', async () => {
    const { service, next, from } = setup();
    next(() => ok(row({ id: 'n1' })));

    await service.create({ title: 'Suelta', dueDate: null, dueTime: null, recurrence: null });

    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('tasks');
  });
});

describe('TasksAccessService · series · completar', () => {
  it('US-012-02 completar crea la siguiente ocurrencia con el título y la hora de la serie', async () => {
    const { service, next, called } = await loadedSeries([
      occurrence({ title: 'Cambiado solo hoy', due_time: '09:00:00' }),
    ]);
    next(() => ok(null)); // completar
    next(() => ok(occurrence({ id: 'o2', due_date: '2026-11-14', series_date: '2026-11-14' })));

    const result = await service.setCompleted('o1', true);

    expect(result).toEqual({ ok: true, next: '2026-11-14' });
    expect(called('insert')[0]).toEqual([
      {
        title: 'Pastilla',
        due_date: '2026-11-14',
        due_time: '08:00',
        series_id: 's1',
        series_date: '2026-11-14',
      },
    ]);
    expect(service.get('o1')?.completedAt).toBe(NOW.toISOString());
    expect(service.get('o2')?.dueDate).toBe('2026-11-14');
  });

  it('US-012-02 si la siguiente ya existe (reintento u otro móvil), no se duplica ni falla', async () => {
    const { service, next } = await loadedSeries();
    next(() => ok(null));
    next(() => fail({ code: '23505', message: 'duplicate key value violates unique constraint' }));

    const result = await service.setCompleted('o1', true);

    expect(result).toEqual({ ok: true, next: '2026-11-14' });
    expect(service.get('o2')).toBeUndefined();
    expect(service.get('o1')?.completedAt).toBe(NOW.toISOString());
  });

  it('US-012-02 si falla crear la siguiente, lo completado se conserva', async () => {
    const { service, next } = await loadedSeries();
    next(() => ok(null));
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    const result = await service.setCompleted('o1', true);

    expect(result.ok).toBe(true);
    expect(service.get('o1')?.completedAt).toBe(NOW.toISOString());
  });

  it('US-012-06 al completar la última ocurrencia (fecha de fin) no se crea otra', async () => {
    const { service, next, called } = await loadedSeries(
      [occurrence()],
      [seriesRow({ until_date: '2026-11-13' })]
    );
    next(() => ok(null));

    const result = await service.setCompleted('o1', true);

    expect(result).toEqual({ ok: true, next: null });
    expect(called('insert')).toHaveLength(0);
  });

  it('US-012-02 una ocurrencia atrasada no crea la siguiente en el pasado: la crea desde hoy', async () => {
    const { service, next, called } = await loadedSeries(
      [occurrence({ due_date: '2026-11-10', series_date: '2026-11-10' })],
      [seriesRow({ start_date: '2026-11-01' })]
    );
    next(() => ok(null));
    next(() => ok(occurrence({ id: 'o2', due_date: '2026-11-13', series_date: '2026-11-13' })));

    const result = await service.setCompleted('o1', true);

    expect(result).toEqual({ ok: true, next: '2026-11-13' });
    expect(called('insert')[0]).toEqual([
      expect.objectContaining({ due_date: '2026-11-13', series_date: '2026-11-13' }),
    ]);
  });

  it('US-012-03 una ocurrencia pospuesta calcula la siguiente desde su día previsto original', async () => {
    // Prevista el lunes 9, pospuesta al viernes 13 (hoy) y completada hoy: la siguiente es el lunes 16.
    const { service, next, called } = await loadedSeries(
      [occurrence({ due_date: '2026-11-13', series_date: '2026-11-09' })],
      [seriesRow({ kind: 'weekly', weekdays: [1], start_date: '2026-11-02' })]
    );
    next(() => ok(null));
    next(() => ok(occurrence({ id: 'o2', due_date: '2026-11-16', series_date: '2026-11-16' })));

    const result = await service.setCompleted('o1', true);

    expect(result).toEqual({ ok: true, next: '2026-11-16' });
    expect(called('insert')[0]).toEqual([expect.objectContaining({ series_date: '2026-11-16' })]);
  });

  it('US-012-02 si el servidor rechaza completar una ocurrencia futura, vuelve a pendiente', async () => {
    const { service, next, called } = await loadedSeries([
      occurrence({ due_date: '2026-11-20', series_date: '2026-11-20' }),
    ]);
    next(() => fail({ code: 'P0001', message: 'future occurrence' }));

    const result = await service.setCompleted('o1', true);

    expect(result).toEqual({ ok: false, reason: 'unknown' });
    expect(service.get('o1')?.completedAt).toBeNull();
    expect(called('insert')).toHaveLength(0);
  });

  it('US-012-02 completar una tarea suelta no consulta las series ni devuelve «next»', async () => {
    const { service, next, from } = await loadedSeries([row()], []);
    from.mockClear();
    next(() => ok(null));

    expect(await service.setCompleted('t1', true)).toEqual({ ok: true });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('US-012-02 las operaciones de series nunca escriben en consola', async () => {
    const spies = (['log', 'warn', 'error', 'info'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined)
    );
    const { service, next } = await loadedSeries();
    next(() => fail({ message: 'Failed to fetch', code: '' }));
    await service.setCompleted('o1', true);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    spies.forEach((s) => s.mockRestore());
  });
});

describe('TasksAccessService · series · desmarcar', () => {
  const pair = (): TaskRow[] => [
    occurrence({ completed_at: NOW.toISOString() }),
    occurrence({ id: 'o2', due_date: '2026-11-14', series_date: '2026-11-14' }),
  ];

  it('US-012-02 desmarcar deja una sola pendiente: sale la generada después', async () => {
    const { service, next, called } = await loadedSeries(pair());
    next(() => ok(null));

    expect(await service.setCompleted('o1', false)).toEqual({ ok: true });

    expect(service.get('o1')?.completedAt).toBeNull();
    expect(service.get('o2')).toBeUndefined();
    expect(called('update')[0]).toEqual([{ completed_at: null, completed_day: null }]);
    expect(called('insert')).toHaveLength(0);
  });

  it('US-012-02 si falla desmarcar, vuelven las dos como estaban', async () => {
    const { service, next } = await loadedSeries(pair());
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    expect(await service.setCompleted('o1', false)).toEqual({ ok: false, reason: 'network' });

    expect(service.get('o1')?.completedAt).toBe(NOW.toISOString());
    expect(service.get('o2')).toBeDefined();
  });
});

describe('TasksAccessService · series · autorreparación', () => {
  it('US-012-02 una serie sin ocurrencia pendiente recibe la siguiente al cargar', async () => {
    const ctx = setup();
    ctx.next(() =>
      ok([occurrence({ completed_at: NOW.toISOString(), series_date: '2026-11-12' })])
    );
    ctx.nextSeries(() => ok([seriesRow()]));
    ctx.next(() => ok(occurrence({ id: 'o9' })));

    await ctx.service.load();

    expect(ctx.called('insert')[0]).toEqual([
      {
        title: 'Pastilla',
        due_date: '2026-11-13',
        due_time: '08:00',
        series_id: 's1',
        series_date: '2026-11-13',
      },
    ]);
    expect(ctx.service.get('o9')).toBeDefined();
  });

  it('US-012-02 sin completadas conocidas, la siguiente es el primer día válido desde hoy', async () => {
    const ctx = setup();
    ctx.next(() => ok([]));
    ctx.nextSeries(() => ok([seriesRow({ start_date: '2026-11-01' })]));
    ctx.next(() => ok(occurrence({ id: 'o9' })));

    await ctx.service.load();

    expect(ctx.called('insert')[0]).toEqual([expect.objectContaining({ due_date: '2026-11-13' })]);
  });

  it('US-012-06 una serie terminada no recibe ninguna ocurrencia', async () => {
    const ctx = setup();
    ctx.next(() => ok([]));
    ctx.nextSeries(() => ok([seriesRow({ start_date: '2026-11-01', until_date: '2026-11-12' })]));

    await ctx.service.load();

    expect(ctx.called('insert')).toHaveLength(0);
    expect(ctx.service.status()).toBe('ready');
  });

  it('US-012-02 si la reparación choca con el índice único, se ignora', async () => {
    const ctx = setup();
    ctx.next(() => ok([]));
    ctx.nextSeries(() => ok([seriesRow()]));
    ctx.next(() => fail({ code: '23505', message: 'duplicate key' }));

    await ctx.service.load();

    expect(ctx.service.status()).toBe('ready');
    expect(ctx.service.tasks()).toEqual([]);
  });

  it('US-012-02 si la reparación falla por la red, la carga sigue en ready', async () => {
    const ctx = setup();
    ctx.next(() => ok([]));
    ctx.nextSeries(() => ok([seriesRow()]));
    ctx.next(() => fail({ message: 'Failed to fetch', code: '' }));

    await ctx.service.load();

    expect(ctx.service.status()).toBe('ready');
    expect(ctx.service.errorReason()).toBeNull();
  });
});

describe('TasksAccessService · series · editar', () => {
  const formInput = (over: Partial<TaskInput> = {}): TaskInput => ({
    title: 'Nueva pastilla',
    dueDate: '2026-11-16',
    dueTime: '07:30',
    recurrence: weeklyRule({ weekdays: [1] }),
    ...over,
  });

  it('US-012-03 «solo esta» cambia esa fila y no toca la serie', async () => {
    const { service, next, from, called } = await loadedSeries();
    from.mockClear();
    next(() => ok(occurrence({ title: 'Solo hoy', due_date: '2026-11-14', due_time: '10:00:00' })));

    const result = await service.updateOccurrence('o1', {
      title: 'Solo hoy',
      dueDate: '2026-11-14',
      dueTime: '10:00',
    });

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('tasks');
    expect(called('update')[0]).toEqual([
      { title: 'Solo hoy', due_date: '2026-11-14', due_time: '10:00' },
    ]);
    expect(service.get('o1')).toMatchObject({ seriesId: 's1', seriesDate: '2026-11-13' });
  });

  it('US-012-03 «solo esta» no permite quitar la fecha de una ocurrencia', async () => {
    const { service, from } = await loadedSeries();
    from.mockClear();

    const result = await service.updateOccurrence('o1', {
      title: 'Pastilla',
      dueDate: null,
      dueTime: null,
    });

    expect(result).toEqual({ ok: false, reason: 'unknown' });
    expect(from).not.toHaveBeenCalled();
  });

  it('US-012-03 «toda la serie» cambia título, hora y regla, y recoloca la pendiente', async () => {
    const { service, next, nextSeries, called } = await loadedSeries();
    nextSeries(() =>
      ok(
        seriesRow({
          title: 'Nueva pastilla',
          due_time: '07:30:00',
          kind: 'weekly',
          weekdays: [1],
          start_date: '2026-11-16',
        })
      )
    );
    next(() =>
      ok(
        occurrence({
          title: 'Nueva pastilla',
          due_time: '07:30:00',
          due_date: '2026-11-16',
          series_date: '2026-11-16',
        })
      )
    );

    const result = await service.updateSeries('o1', formInput());

    expect(result).toEqual({ ok: true });
    expect(called('update')[0]).toEqual([
      {
        title: 'Nueva pastilla',
        due_time: '07:30',
        kind: 'weekly',
        interval_n: 1,
        weekdays: [1],
        month_day: null,
        start_date: '2026-11-16',
        until_date: null,
      },
    ]);
    expect(called('update')[1]).toEqual([
      {
        title: 'Nueva pastilla',
        due_time: '07:30',
        due_date: '2026-11-16',
        series_date: '2026-11-16',
      },
    ]);
    expect(service.seriesOf(service.get('o1')!)?.recurrence).toMatchObject({
      kind: 'weekly',
      weekdays: [1],
    });
  });

  it('US-012-03 si la fecha del formulario ya pasó, la pendiente se recoloca desde hoy', async () => {
    const { service, next, nextSeries, called } = await loadedSeries();
    nextSeries(() => ok(seriesRow({ kind: 'weekly', weekdays: [1], start_date: '2026-11-02' })));
    next(() => ok(occurrence({ due_date: '2026-11-16', series_date: '2026-11-16' })));

    await service.updateSeries(
      'o1',
      formInput({
        dueDate: '2026-11-02',
        recurrence: weeklyRule({ weekdays: [1], startDate: '2026-11-02' }),
      })
    );

    expect(called('update')[1]).toEqual([
      expect.objectContaining({ due_date: '2026-11-16', series_date: '2026-11-16' }),
    ]);
  });

  it('US-012-03 una tarea suelta pasa a ser una serie al ponerle repetición', async () => {
    const { service, next, nextSeries, called } = await loadedSeries([row()], []);
    nextSeries(() =>
      ok(seriesRow({ id: 's9', kind: 'weekly', weekdays: [1], start_date: '2026-11-16' }))
    );
    next(() =>
      ok(
        row({
          title: 'Nueva pastilla',
          due_date: '2026-11-16',
          due_time: '07:30:00',
          series_id: 's9',
          series_date: '2026-11-16',
        })
      )
    );

    const result = await service.updateSeries('t1', formInput());

    expect(result).toEqual({ ok: true });
    expect(called('insert')[0]).toEqual([
      expect.objectContaining({ kind: 'weekly', weekdays: [1] }),
    ]);
    expect(called('update')[0]).toEqual([
      {
        title: 'Nueva pastilla',
        due_date: '2026-11-16',
        due_time: '07:30',
        series_id: 's9',
        series_date: '2026-11-16',
      },
    ]);
    expect(service.get('t1')).toMatchObject({ seriesId: 's9' });
  });

  it('US-012-03 quitar la repetición borra la serie y deja la tarea suelta', async () => {
    const { service, next, nextSeries, called, from } = await loadedSeries();
    from.mockClear();
    nextSeries(() => ok(null)); // borrado de la serie
    next(() => ok(occurrence({ title: 'Ya no se repite', series_id: null, series_date: null })));

    const result = await service.updateSeries('o1', {
      title: 'Ya no se repite',
      dueDate: '2026-11-13',
      dueTime: '08:00',
      recurrence: null,
    });

    expect(result).toEqual({ ok: true });
    expect(from.mock.calls.map(([t]) => t)).toEqual(['task_series', 'tasks']);
    expect(called('delete')).toHaveLength(1);
    expect(called('update')[0]).toEqual([
      {
        title: 'Ya no se repite',
        due_date: '2026-11-13',
        due_time: '08:00',
        series_id: null,
        series_date: null,
      },
    ]);
    expect(service.get('o1')?.seriesId).toBeNull();
    expect(service.series().size).toBe(0);
  });

  it('US-012-03 si falla la edición de la serie, no cambia nada', async () => {
    const { service, nextSeries } = await loadedSeries();
    nextSeries(() => fail({ message: 'Failed to fetch', code: '' }));

    expect(await service.updateSeries('o1', formInput())).toEqual({ ok: false, reason: 'network' });

    expect(service.get('o1')?.title).toBe('Pastilla');
    expect(service.seriesOf(service.get('o1')!)?.recurrence.kind).toBe('daily');
  });
});

describe('TasksAccessService · series · borrar', () => {
  it('US-012-03 «solo esta» borra la ocurrencia y crea la siguiente', async () => {
    const { service, next, called } = await loadedSeries();
    next(() => ok(null)); // borrado
    next(() => ok(occurrence({ id: 'o2', due_date: '2026-11-14', series_date: '2026-11-14' })));

    const result = await service.removeOccurrence('o1');

    expect(result).toEqual({ ok: true });
    expect(service.get('o1')).toBeUndefined();
    expect(service.get('o2')?.dueDate).toBe('2026-11-14');
    expect(called('insert')[0]).toEqual([expect.objectContaining({ due_date: '2026-11-14' })]);
  });

  it('US-012-06 «solo esta» sobre la última ocurrencia no crea otra', async () => {
    const { service, next, called } = await loadedSeries(
      [occurrence()],
      [seriesRow({ until_date: '2026-11-13' })]
    );
    next(() => ok(null));

    expect(await service.removeOccurrence('o1')).toEqual({ ok: true });
    expect(called('insert')).toHaveLength(0);
  });

  it('US-012-03 si falla borrar la ocurrencia, vuelve a la lista y no se crea la siguiente', async () => {
    const { service, next, called } = await loadedSeries();
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    expect(await service.removeOccurrence('o1')).toEqual({ ok: false, reason: 'network' });
    expect(service.get('o1')).toBeDefined();
    expect(called('insert')).toHaveLength(0);
  });

  it('US-012-03 «toda la serie» borra primero la serie y después la ocurrencia', async () => {
    const { service, next, nextSeries, from } = await loadedSeries();
    from.mockClear();
    nextSeries(() => ok(null));
    next(() => ok(null));

    expect(await service.removeSeries('o1')).toEqual({ ok: true });

    expect(from.mock.calls.map(([t]) => t)).toEqual(['task_series', 'tasks']);
    expect(service.get('o1')).toBeUndefined();
    expect(service.series().size).toBe(0);
  });

  it('US-012-03 si falla borrar la serie, no cambia nada', async () => {
    const { service, nextSeries } = await loadedSeries();
    nextSeries(() => fail({ message: 'Failed to fetch', code: '' }));

    expect(await service.removeSeries('o1')).toEqual({ ok: false, reason: 'network' });

    expect(service.get('o1')).toBeDefined();
    expect(service.seriesOf(service.get('o1')!)).toBeDefined();
  });

  it('US-012-03 si la serie se borra pero falla la ocurrencia, esta queda como tarea suelta', async () => {
    const { service, next, nextSeries } = await loadedSeries();
    nextSeries(() => ok(null));
    next(() => fail({ message: 'Failed to fetch', code: '' }));

    expect(await service.removeSeries('o1')).toEqual({ ok: false, reason: 'network' });

    expect(service.get('o1')).toMatchObject({ seriesId: null });
    expect(service.series().size).toBe(0);
  });

  it('US-012-03 «toda la serie» sobre una tarea suelta es un borrado normal', async () => {
    const { service, next, from } = await loadedSeries([row()], []);
    from.mockClear();
    next(() => ok(null));

    expect(await service.removeSeries('t1')).toEqual({ ok: true });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('tasks');
  });
});

describe('TasksAccessService · series · posponer', () => {
  it('US-012-03 posponer una ocurrencia mueve solo esa fila: no cambia la regla ni su día previsto original', async () => {
    const { service, next, called, from } = await loadedSeries([
      occurrence({ due_date: '2026-11-13', series_date: '2026-11-13' }),
    ]);
    from.mockClear();
    next(() => ok(null));

    const result = await service.postpone('o1', { dueDate: '2026-11-15', dueTime: '08:00' });

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('tasks');
    expect(called('update')[0]).toEqual([
      { due_date: '2026-11-15', due_time: '08:00', postponed_count: 1 },
    ]);
    expect(service.get('o1')).toMatchObject({ seriesId: 's1', seriesDate: '2026-11-13' });
    expect(service.seriesOf(service.get('o1')!)?.recurrence.kind).toBe('daily');
  });
});
