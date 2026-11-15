import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ALARM_PREFS_KEY } from '../../../core/models/alarm';
import { Task } from '../../../core/models/task';
import { AlarmsConstructorService } from '../../../core/services/alarms.constructor.service';
import { CLOCK } from '../../../core/services/clock';
import { PlatformService } from '../../../core/services/platform.service';
import { TasksAccessService } from '../tasks.access.service';
import { ALARM_STORAGE, AlarmsAccessService } from './alarms.access.service';

const plugin = vi.hoisted(() => ({
  loaded: vi.fn(),
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  createChannel: vi.fn(),
}));
const core = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@tauri-apps/plugin-notification', () => {
  plugin.loaded();
  return {
    isPermissionGranted: plugin.isPermissionGranted,
    requestPermission: plugin.requestPermission,
    createChannel: plugin.createChannel,
    Importance: { High: 4 },
  };
});
vi.mock('@tauri-apps/api/core', () => ({ invoke: core.invoke }));

const NOW = new Date(2026, 10, 14, 9, 0, 0);
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await flush();
};

interface SentAlarm {
  id: number;
  at: number;
  title: string;
  body: string;
}

let seq = 0;
function task(over: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    title: `Tarea ${seq}`,
    dueDate: '2026-11-14',
    dueTime: '11:00',
    completedAt: null,
    createdAt: `2026-11-01T10:${String(seq % 60).padStart(2, '0')}:00.000Z`,
    postponedCount: 0,
    seriesId: null,
    seriesDate: null,
    ...over,
  };
}

interface Options {
  supported?: boolean;
  granted?: boolean;
  stored?: string | null;
  storageThrows?: boolean;
  tasks?: Task[];
  exact?: string;
  launchNotificationId?: number | null;
  scheduleFails?: boolean;
}

function setup(options: Options = {}) {
  const store = new Map<string, string>();
  if (options.stored) store.set(ALARM_PREFS_KEY, options.stored);
  const storage = {
    getItem: vi.fn((key: string) => {
      if (options.storageThrows) throw new Error('sin almacenamiento');
      return store.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (options.storageThrows) throw new Error('sin almacenamiento');
      store.set(key, value);
    }),
  };
  const tasks = signal<readonly Task[]>(options.tasks ?? []);
  let now = NOW;
  let permissionGranted = options.granted ?? false;
  const launch: { id: number | null } = { id: options.launchNotificationId ?? null };
  const calls: SentAlarm[][] = [];
  let failSchedule = options.scheduleFails ?? false;

  plugin.isPermissionGranted.mockImplementation(async () => permissionGranted);
  plugin.requestPermission.mockResolvedValue('granted');
  plugin.createChannel.mockResolvedValue(undefined);
  core.invoke.mockImplementation(async (command: string, args?: { alarms?: SentAlarm[] }) => {
    if (command.endsWith('can_schedule_exact_alarms')) return { state: options.exact ?? 'allowed' };
    if (command.endsWith('launch_notification_id')) {
      const id = launch.id;
      launch.id = null; // el plugin local lo entrega una sola vez
      return { notificationId: id };
    }
    if (command.endsWith('schedule_alarms')) {
      if (failSchedule) throw new Error('detalle interno con datos');
      calls.push(args?.alarms ?? []);
      return undefined;
    }
    return undefined;
  });

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: PlatformService, useValue: { isTauriAndroid: () => options.supported ?? true } },
      { provide: TasksAccessService, useValue: { tasks } },
      { provide: CLOCK, useValue: () => now },
      { provide: ALARM_STORAGE, useValue: storage },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const service = TestBed.inject(AlarmsAccessService);
  const constructor = TestBed.inject(AlarmsConstructorService);

  return {
    service,
    constructor,
    tasks,
    store,
    navigate,
    /** Cada llamada a `schedule_alarms` lleva el conjunto completo de avisos que debe haber. */
    calls: () => calls,
    last: () => calls.at(-1),
    setNow: (d: Date) => (now = d),
    setGranted: (value: boolean) => (permissionGranted = value),
    setLaunch: (id: number | null) => (launch.id = id),
    failScheduling: (value: boolean) => (failSchedule = value),
    init: async () => {
      service.initialize();
      TestBed.tick();
      await settle();
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('AlarmsAccessService · fuera de Android', () => {
  // Debe ir el primero del fichero: comprueba que el módulo del plugin nunca llega a cargarse.
  it('US-006-01 fuera de Android no se importa el plugin y el servicio no falla', async () => {
    const t = setup({ supported: false, tasks: [task()] });
    await t.init();

    expect(plugin.loaded).not.toHaveBeenCalled();
    expect(t.calls()).toHaveLength(0);
    expect(t.service.permission()).toBe('unsupported');
    expect(t.service.shouldAskPermission()).toBe(false);
    expect(t.service.bannerVisible()).toBe(false);
    expect(await t.service.requestPermission()).toBe('unsupported');
    await expect(t.service.reconcile()).resolves.toBeUndefined();
    await expect(t.service.openNotificationSettings()).resolves.toBeUndefined();
  });
});

describe('AlarmsAccessService · permiso', () => {
  it('US-006-02 al abrir la app no se pide el permiso: solo se consulta', async () => {
    const t = setup({ tasks: [task()] });
    await t.init();

    expect(plugin.isPermissionGranted).toHaveBeenCalled();
    expect(plugin.requestPermission).not.toHaveBeenCalled();
    expect(t.service.permission()).toBe('prompt');
  });

  it('US-006-02 shouldAskPermission: sí sin conceder y con menos de 3 negativas; no concedido o con 3', async () => {
    const asking = setup();
    await asking.init();
    expect(asking.service.shouldAskPermission()).toBe(true);

    const granted = setup({ granted: true });
    await granted.init();
    expect(granted.service.permission()).toBe('granted');
    expect(granted.service.shouldAskPermission()).toBe(false);

    const exhausted = setup({
      stored: JSON.stringify({ deniedCount: 3, bannerDismissedDay: null }),
    });
    await exhausted.init();
    expect(exhausted.service.shouldAskPermission()).toBe(false);
  });

  it('US-006-02 requestPermission concedido: pasa a granted, crea el canal y programa los avisos', async () => {
    const t = setup({ tasks: [task({ title: 'Llamar', dueTime: '11:30' })] });
    await t.init();

    expect(await t.service.requestPermission()).toBe('granted');
    await settle();

    expect(t.service.permission()).toBe('granted');
    expect(plugin.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'reminders', name: 'Recordatorios', importance: 4 })
    );
    expect(t.last()).toHaveLength(1);
  });

  it('US-006-02 requestPermission rechazado: suma una negativa, queda denied y no programa nada', async () => {
    const t = setup({ tasks: [task()] });
    await t.init();
    plugin.requestPermission.mockResolvedValue('denied');

    expect(await t.service.requestPermission()).toBe('denied');
    await settle();

    expect(t.service.permission()).toBe('denied');
    expect(JSON.parse(t.store.get(ALARM_PREFS_KEY) ?? '{}').deniedCount).toBe(1);
    expect(t.calls()).toHaveLength(0);
  });

  it('US-006-02 recordDenial suma hasta 3 y no pasa de ahí', async () => {
    const t = setup();
    await t.init();
    for (let i = 0; i < 5; i++) t.service.recordDenial();

    expect(JSON.parse(t.store.get(ALARM_PREFS_KEY) ?? '{}').deniedCount).toBe(3);
    expect(t.service.shouldAskPermission()).toBe(false);
  });

  it('US-006-02 una preferencia corrupta o un almacenamiento que lanza usan los valores por defecto', async () => {
    const corrupt = setup({ stored: '{no es json' });
    await corrupt.init();
    expect(corrupt.service.shouldAskPermission()).toBe(true);

    const broken = setup({ storageThrows: true });
    await broken.init();
    expect(broken.service.shouldAskPermission()).toBe(true);
    expect(() => broken.service.recordDenial()).not.toThrow();
  });
});

describe('AlarmsAccessService · reconciliación', () => {
  it('US-006-01 con permiso envía al plugin local cada aviso con id, hora, título y texto', async () => {
    const t = setup({
      granted: true,
      tasks: [task({ title: 'Llamar al fontanero', dueTime: '16:30' })],
    });
    await t.init();

    const [plan] = t.constructor.plan(t.tasks(), NOW);
    expect(core.invoke).toHaveBeenCalledWith('plugin:app-settings|schedule_alarms', {
      alarms: [
        {
          id: plan.notificationId,
          at: plan.at.getTime(),
          title: 'Llamar al fontanero',
          body: 'Es la hora (16:30)',
        },
      ],
    });
  });

  it('US-006-01 sin permiso no programa nada', async () => {
    const t = setup({ granted: false, tasks: [task()] });
    await t.init();
    expect(t.calls()).toHaveLength(0);
  });

  it('US-006-01 es idempotente: reconciliar de nuevo envía el mismo conjunto, sin duplicados', async () => {
    const t = setup({ granted: true, tasks: [task(), task({ dueTime: '12:00' })] });
    await t.init();
    const first = t.last();

    await t.service.reconcile();

    expect(t.last()).toEqual(first);
    const ids = (t.last() ?? []).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('US-006-01 crear una tarea con hora añade su aviso al conjunto', async () => {
    const t = setup({ granted: true });
    await t.init();
    t.tasks.set([task({ dueTime: '12:00' })]);
    TestBed.tick();
    await settle();

    expect(t.last()).toHaveLength(1);
  });

  it('US-006-01 editar la hora sustituye el aviso: el conjunto trae solo la hora nueva', async () => {
    const original = task({ dueTime: '12:00' });
    const t = setup({ granted: true, tasks: [original] });
    await t.init();

    t.tasks.set([{ ...original, dueTime: '13:00' }]);
    TestBed.tick();
    await settle();

    const set = t.last() ?? [];
    expect(set).toHaveLength(1);
    expect(new Date(set[0].at).getHours()).toBe(13);
  });

  it('US-006-01 completar, borrar o quitar la hora retira el aviso del conjunto', async () => {
    const a = task();
    const b = task();
    const c = task();
    const t = setup({ granted: true, tasks: [a, b, c] });
    await t.init();
    expect(t.last()).toHaveLength(3);

    t.tasks.set([
      { ...a, completedAt: '2026-11-14T08:00:00.000Z' },
      { ...c, dueTime: null },
    ]); // b borrada
    TestBed.tick();
    await settle();

    expect(t.last()).toEqual([]);
  });

  it('US-006-01 desmarcar una tarea futura vuelve a añadir su aviso', async () => {
    const done = task({ completedAt: '2026-11-14T08:00:00.000Z' });
    const t = setup({ granted: true, tasks: [done] });
    await t.init();
    expect(t.last()).toEqual([]);

    t.tasks.set([{ ...done, completedAt: null }]);
    TestBed.tick();
    await settle();

    expect(t.last()).toHaveLength(1);
  });

  it('US-006-01 envía como máximo 60 avisos', async () => {
    const many = Array.from({ length: 75 }, (_, i) =>
      task({
        dueDate: '2026-12-01',
        dueTime: `${String(8 + Math.floor(i / 12)).padStart(2, '0')}:${String((i % 12) * 5).padStart(2, '0')}`,
      })
    );
    const t = setup({ granted: true, tasks: many });
    await t.init();

    expect(t.last()).toHaveLength(60);
  });

  it('US-006-01 dos reconciliaciones seguidas se encadenan y envían el mismo conjunto', async () => {
    const t = setup({ granted: true, tasks: [task(), task()] });
    await t.init();
    const before = t.calls().length;

    await Promise.all([t.service.reconcile(), t.service.reconcile()]);

    expect(t.calls().length).toBe(before + 2);
    expect(t.calls().at(-1)).toEqual(t.calls().at(-2));
  });

  it('US-006-01 hasScheduled indica qué tareas tienen aviso programado', async () => {
    const a = task();
    const b = task({ dueTime: null });
    const t = setup({ granted: true, tasks: [a, b] });
    await t.init();

    expect(t.service.hasScheduled(a.id)).toBe(true);
    expect(t.service.hasScheduled(b.id)).toBe(false);
  });

  it('US-006-01 si el plugin local falla al programar, no lanza ni marca avisos como programados', async () => {
    const a = task();
    const t = setup({ granted: true, tasks: [a], scheduleFails: true });
    await expect(t.init()).resolves.toBeUndefined();
    expect(t.service.hasScheduled(a.id)).toBe(false);

    t.failScheduling(false);
    await t.service.reconcile();
    expect(t.service.hasScheduled(a.id)).toBe(true);
  });
});

describe('AlarmsAccessService · ciclo de vida', () => {
  it('US-006-02 al volver a primer plano detecta que se concedió el permiso en los ajustes y programa', async () => {
    const t = setup({ granted: false, tasks: [task()] });
    await t.init();
    expect(t.calls()).toHaveLength(0);

    t.setGranted(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();

    expect(t.service.permission()).toBe('granted');
    expect(t.last()).toHaveLength(1);
  });

  it('US-006-02 si el permiso se retira en los ajustes, vuelve el aviso discreto', async () => {
    const t = setup({ granted: true, tasks: [task()] });
    await t.init();
    expect(t.service.bannerVisible()).toBe(false);

    t.setGranted(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();

    expect(t.service.permission()).not.toBe('granted');
    expect(t.service.bannerVisible()).toBe(true);
  });

  it('US-006-03 si el permiso se retira, cancela los avisos programados y deja de marcarlos', async () => {
    const t = setup({ granted: true, tasks: [task()] });
    await t.init();
    const id = t.constructor.notificationId(t.tasks()[0].id);
    expect(t.service.hasScheduled(t.tasks()[0].id)).toBe(true);
    expect(t.last()).toHaveLength(1);

    t.setGranted(false);
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();

    expect(t.last()).toEqual([]);
    expect(t.service.hasScheduled(t.tasks()[0].id)).toBe(false);
    expect(id).toBeTypeOf('number');
  });

  it('US-006-01 tocar el aviso con la app ya en primer plano abre la tarea al recuperar el foco', async () => {
    const target = task();
    const probe = setup();
    const t = setup({ granted: true, tasks: [target] });
    await t.init();
    expect(t.navigate).not.toHaveBeenCalled();

    t.setLaunch(probe.constructor.notificationId(target.id));
    window.dispatchEvent(new Event('focus'));
    await settle();

    expect(t.navigate).toHaveBeenCalledWith(['/', target.id]);
  });

  it('US-006-01 al volver a primer plano reconcilia de nuevo (cambio de hora o de zona)', async () => {
    const t = setup({ granted: true, tasks: [task({ dueTime: '12:00' })] });
    await t.init();
    const before = t.calls().length;

    t.setNow(new Date(2026, 10, 14, 9, 30));
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();

    expect(t.calls().length).toBeGreaterThan(before);
  });
});

describe('AlarmsAccessService · alarmas exactas', () => {
  it('US-006-02 con el permiso de alarmas exactas denegado se informa y se ofrece la hoja una vez', async () => {
    const t = setup({ granted: true, exact: 'not-allowed', tasks: [task()] });
    await t.init();

    expect(t.service.exactAlarm()).toBe('not-allowed');
    expect(t.service.shouldOfferExact()).toBe(true);
    t.service.skipExact();
    expect(t.service.shouldOfferExact()).toBe(false);
  });

  it('US-006-02 con las alarmas exactas permitidas o innecesarias no se ofrece nada y sigue programando', async () => {
    const t = setup({ granted: true, exact: 'allowed', tasks: [task()] });
    await t.init();
    expect(t.service.shouldOfferExact()).toBe(false);
    expect(t.last()).toHaveLength(1);
  });

  it('US-006-02 con las alarmas exactas denegadas se programa igualmente (aproximada)', async () => {
    const t = setup({ granted: true, exact: 'not-allowed', tasks: [task()] });
    await t.init();
    expect(t.last()).toHaveLength(1);
  });

  it('US-006-02 si el plugin local falla al consultar, el estado es unknown y no se ofrece nada', async () => {
    const t = setup({ granted: true, tasks: [task()] });
    core.invoke.mockRejectedValue(new Error('no disponible'));
    await t.init();

    expect(t.service.exactAlarm()).toBe('unknown');
    expect(t.service.shouldOfferExact()).toBe(false);
  });
});

describe('AlarmsAccessService · ajustes del sistema', () => {
  it('US-006-02 abrir los ajustes llama al plugin local y, si falla, no lanza', async () => {
    const t = setup({ granted: true });
    await t.init();

    await t.service.openNotificationSettings();
    await t.service.openExactAlarmSettings();
    expect(core.invoke).toHaveBeenCalledWith('plugin:app-settings|open_notification_settings');
    expect(core.invoke).toHaveBeenCalledWith('plugin:app-settings|open_exact_alarm_settings');

    core.invoke.mockRejectedValue(new Error('x'));
    await expect(t.service.openNotificationSettings()).resolves.toBeUndefined();
    await expect(t.service.openExactAlarmSettings()).resolves.toBeUndefined();
  });
});

describe('AlarmsAccessService · aviso discreto', () => {
  it('US-006-02 el aviso solo aparece sin permiso y con tareas con hora futuras', async () => {
    const withTasks = setup({ granted: false, tasks: [task()] });
    await withTasks.init();
    expect(withTasks.service.bannerVisible()).toBe(true);

    const noTasks = setup({ granted: false, tasks: [task({ dueTime: null })] });
    await noTasks.init();
    expect(noTasks.service.bannerVisible()).toBe(false);

    const granted = setup({ granted: true, tasks: [task()] });
    await granted.init();
    expect(granted.service.bannerVisible()).toBe(false);
  });

  it('US-006-02 cerrarlo lo oculta ese día y vuelve al día siguiente', async () => {
    const t = setup({ granted: false, tasks: [task({ dueDate: '2026-11-20' })] });
    await t.init();
    t.service.dismissBanner();
    expect(t.service.bannerVisible()).toBe(false);
    expect(JSON.parse(t.store.get(ALARM_PREFS_KEY) ?? '{}').bannerDismissedDay).toBe('2026-11-14');

    t.setNow(new Date(2026, 10, 15, 9, 0));
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(t.service.bannerVisible()).toBe(true);
  });
});

describe('AlarmsAccessService · toque en el aviso', () => {
  const idOf = (t: ReturnType<typeof setup>, task: Task) => t.constructor.notificationId(task.id);

  it('US-006-01 si la app se abrió tocando el aviso de una tarea, abre esa tarea', async () => {
    const target = task();
    const probe = setup();
    const t = setup({ granted: true, tasks: [target], launchNotificationId: idOf(probe, target) });
    await t.init();

    expect(core.invoke).toHaveBeenCalledWith('plugin:app-settings|launch_notification_id');
    expect(t.navigate).toHaveBeenCalledWith(['/', target.id]);
  });

  it('US-006-01 si las tareas aún no se han cargado, espera y abre la tarea cuando aparecen', async () => {
    const target = task();
    const probe = setup();
    const t = setup({ granted: true, launchNotificationId: idOf(probe, target) });
    await t.init();
    expect(t.navigate).not.toHaveBeenCalled();

    t.tasks.set([target]);
    TestBed.tick();
    await settle();

    expect(t.navigate).toHaveBeenCalledWith(['/', target.id]);
  });

  it('US-006-01 si la tarea del aviso ya no existe, no navega a ninguna', async () => {
    const t = setup({ granted: true, tasks: [task()], launchNotificationId: 123456 });
    await t.init();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('US-006-01 si la app se abrió de otra forma, no navega a ninguna tarea', async () => {
    const t = setup({ granted: true, tasks: [task()], launchNotificationId: null });
    await t.init();
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('US-006-01 con la app abierta en segundo plano, tocar un aviso abre esa tarea al volver a primer plano', async () => {
    const target = task();
    const probe = setup();
    const t = setup({ granted: true, tasks: [target] });
    await t.init();
    expect(t.navigate).not.toHaveBeenCalled();

    t.setLaunch(idOf(probe, target));
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();

    expect(t.navigate).toHaveBeenCalledWith(['/', target.id]);
  });

  it('US-006-01 un toque se abre una sola vez aunque la app vuelva varias veces a primer plano', async () => {
    const target = task();
    const probe = setup();
    const t = setup({ granted: true, tasks: [target], launchNotificationId: idOf(probe, target) });
    await t.init();
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
    await settle();

    expect(t.navigate).toHaveBeenCalledTimes(1);
  });

  it('US-006-01 si el plugin local falla al leer el lanzamiento, no navega ni lanza', async () => {
    const t = setup({ granted: true, tasks: [task()] });
    core.invoke.mockImplementation(async (command: string) => {
      if (command.endsWith('launch_notification_id')) throw new Error('no disponible');
      return { state: 'allowed' };
    });
    await expect(t.init()).resolves.toBeUndefined();
    expect(t.navigate).not.toHaveBeenCalled();
  });
});

describe('AlarmsAccessService · consola', () => {
  it('US-006-01 nunca escribe en consola, ni con errores del plugin', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined)
    );
    const t = setup({ granted: true, tasks: [task({ title: 'Secreta' })], scheduleFails: true });

    await t.init();
    await t.service.requestPermission();
    await t.service.reconcile();

    spies.forEach((spy) => {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});

describe('AlarmsAccessService · cambio de identidad (spec 011)', () => {
  it('US-011-04 al cerrar sesión se cancelan las alarmas y al entrar se programan solo las de la cuenta', async () => {
    const t = setup({
      granted: true,
      tasks: [task({ title: 'De la cuenta', dueTime: '16:30' })],
    });
    await t.init();
    expect(t.last()).toHaveLength(1);

    // Cierre de sesión: la identidad anónima nueva no tiene tareas
    t.tasks.set([]);
    TestBed.tick();
    await settle();
    expect(t.last()).toEqual([]);

    // Entrada en otra cuenta: solo sus avisos, ninguno de la anterior
    t.tasks.set([task({ title: 'De la otra cuenta', dueTime: '17:00' })]);
    TestBed.tick();
    await settle();
    const set = t.last() ?? [];
    expect(set).toHaveLength(1);
    expect(set[0].title).toBe('De la otra cuenta');
  });
});
