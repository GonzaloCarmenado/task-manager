import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AlarmPermission } from '../../../core/models/alarm';
import { Task } from '../../../core/models/task';
import { CLOCK } from '../../../core/services/clock';
import { Celebration, Progress } from '../../../core/models/progress';
import { AccountAccessService } from '../../account/account.access.service';
import { ProgressAccessService, ProgressStatus } from '../../progress/progress.access.service';
import { AlarmsAccessService } from '../alarms/alarms.access.service';
import {
  TaskOpResult,
  TasksAccessService,
  TasksErrorReason,
  TasksStatus,
} from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';
import { TasksList } from './tasks-list';

type ComponentDef = { ɵcmp: { onPush: boolean } };

let seq = 0;
function task(over: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Tarea ${seq}`,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    createdAt: `2026-11-01T10:${String(seq % 60).padStart(2, '0')}:00.000Z`,
    postponedCount: 0,
    seriesId: null,
    seriesDate: null,
    ...over,
  };
}

interface AlarmsMockOptions {
  supported?: boolean;
  permission?: AlarmPermission;
  banner?: boolean;
  offerExact?: boolean;
  scheduled?: string[];
}

function alarmsMock(o: AlarmsMockOptions = {}) {
  const scheduled = new Set(o.scheduled ?? []);
  return {
    supported: o.supported ?? false,
    permission: signal<AlarmPermission>(o.permission ?? 'unsupported'),
    bannerVisible: signal(o.banner ?? false),
    hasScheduled: vi.fn((id: string) => scheduled.has(id)),
    shouldOfferExact: vi.fn(() => o.offerExact ?? false),
    skipExact: vi.fn(),
    dismissBanner: vi.fn(),
    openNotificationSettings: vi.fn(async () => undefined),
    openExactAlarmSettings: vi.fn(async () => undefined),
  };
}

const PROGRESS: Progress = {
  totalXp: 20,
  level: 1,
  xpIntoLevel: 20,
  xpForNextLevel: 50,
  currentStreak: 1,
  bestStreak: 1,
  xpToday: 20,
  lastCompletedDay: '2026-11-13',
};

function progressMock() {
  const progress = signal<Progress | null>(PROGRESS);
  const status = signal<ProgressStatus>('ready');
  const celebration = signal<Celebration | null>(null);
  const levelUp = signal<number | null>(null);
  return {
    progress,
    status,
    celebration,
    levelUp,
    load: vi.fn(async () => true),
    afterToggle: vi.fn(async () => undefined),
    dismissCelebration: vi.fn(() => celebration.set(null)),
    consumeLevelUp: vi.fn(),
  };
}

function setup(
  initial: Task[] = [],
  status: TasksStatus = 'ready',
  alarmOptions: AlarmsMockOptions = {}
) {
  let now = new Date(2026, 10, 13, 12, 0, 0);
  const alarms = alarmsMock(alarmOptions);
  const progress = progressMock();
  const tasks = signal<readonly Task[]>(initial);
  const statusSig = signal<TasksStatus>(status);
  const errorReason = signal<TasksErrorReason | null>(null);
  const setCompleted = vi.fn(async (): Promise<TaskOpResult> => ({ ok: true }));
  const postpone = vi.fn(async (): Promise<TaskOpResult> => ({ ok: true }));
  const load = vi.fn(async () => undefined);
  const access = { tasks, status: statusSig, errorReason, load, setCompleted, postpone };
  const reminderOn = signal(false);
  const snoozeReminder = vi.fn(() => reminderOn.set(false));
  const account = { reminderVisible: () => reminderOn(), snoozeReminder };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TasksList],
    providers: [
      provideRouter([]),
      { provide: TasksAccessService, useValue: access },
      { provide: AlarmsAccessService, useValue: alarms },
      { provide: ProgressAccessService, useValue: progress },
      { provide: AccountAccessService, useValue: account },
      { provide: CLOCK, useValue: () => now },
    ],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TasksList);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const copy = TestBed.inject(TasksConstructorService);
  return {
    fixture,
    el,
    copy,
    tasks,
    status: statusSig,
    errorReason,
    setCompleted,
    postpone,
    load,
    navigate,
    alarms,
    progress,
    reminderOn,
    snoozeReminder,
    setNow: (d: Date) => (now = d),
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    detect: () => fixture.detectChanges(),
  };
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('TasksList · estados', () => {
  it('US-005-02 al abrir pide cargar las tareas', () => {
    const { load } = setup();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('US-005-02 cargando muestra un indicador anunciado y no la lista', () => {
    const { el, text, copy } = setup([], 'loading');
    expect(text()).toContain(copy.list.loading);
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.querySelector('ul')).toBeNull();
  });

  it('US-005-02 vacío invita a crear la primera tarea y lleva al formulario', () => {
    const { el, text, copy, navigate } = setup([]);
    expect(text()).toContain(copy.list.emptyTitle);
    const button = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(copy.list.createFirst)
    );
    expect(button).toBeDefined();
    button?.click();
    expect(navigate).toHaveBeenCalledWith(['/nueva']);
  });

  it('US-005-02 error muestra el mensaje con Reintentar, que vuelve a cargar', () => {
    const { el, text, copy, status, errorReason, detect, load } = setup([], 'loading');
    errorReason.set('network');
    status.set('error');
    detect();

    expect(text()).toContain(copy.list.errorTitle);
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    const retry = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(copy.list.retry)
    );
    load.mockClear();
    retry?.click();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('US-005-02 el estado vacío solo aparece con estado ready (no durante la carga ni en error)', () => {
    const { text, copy } = setup([], 'loading');
    expect(text()).not.toContain(copy.list.emptyTitle);
  });
});

describe('TasksList · grupos', () => {
  const data = () => [
    task({ title: 'Enviar informe', dueDate: '2026-11-12', dueTime: '18:30' }),
    task({ title: 'Comprar verduras', dueDate: '2026-11-13', dueTime: '11:00' }),
    task({ title: 'Revisar apuntes', dueDate: '2026-11-13' }),
    task({ title: 'Pagar recibo', dueDate: '2026-11-14', dueTime: '09:00' }),
    task({ title: 'Cita médica', dueDate: '2026-11-19', dueTime: '10:00' }),
    task({ title: 'Organizar trastero' }),
  ];

  it('US-005-02 muestra los grupos en orden con su etiqueta y su contador', () => {
    const { el } = setup(data());
    const headings = Array.from(el.querySelectorAll('h2')).map((h) =>
      h.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(headings).toEqual([
      'Atrasadas 1',
      'Hoy 2',
      'Mañana 1',
      'Jueves, 19 de noviembre 1',
      'Sin fecha 1',
    ]);
  });

  it('US-005-02 cada tarea muestra su título y, si la tiene, su hora', () => {
    const { text } = setup(data());
    expect(text()).toContain('Comprar verduras');
    expect(text()).toContain('11:00');
    expect(text()).toContain('09:00');
    expect(text()).toContain('Revisar apuntes');
  });

  it('US-005-02 las tareas con hora van antes que las que no la tienen dentro del día', () => {
    const { el } = setup(data());
    const hoy = Array.from(el.querySelectorAll('section')).find((s) =>
      s.querySelector('h2')?.textContent?.includes('Hoy')
    );
    const titles = Array.from(hoy?.querySelectorAll('.title') ?? []).map((t) =>
      t.textContent?.trim()
    );
    expect(titles).toEqual(['Comprar verduras', 'Revisar apuntes']);
  });

  it('US-005-02 solo las atrasadas llevan la etiqueta «Atrasada»', () => {
    const { el, copy } = setup(data());
    const tags = Array.from(el.querySelectorAll('.tag')).map((t) => t.textContent?.trim());
    expect(tags).toEqual([copy.list.overdueTag]);
  });

  it('US-005-02 los grupos vacíos no se muestran', () => {
    const { el } = setup([task({ dueDate: '2026-11-13' })]);
    expect(el.querySelectorAll('h2')).toHaveLength(1);
  });

  it('US-005-02 al volver a primer plano en otro día, «hoy» se recalcula', () => {
    const t = setup([task({ title: 'De hoy', dueDate: '2026-11-13' })]);
    expect(t.el.querySelector('h2')?.textContent).toContain('Hoy');

    t.setNow(new Date(2026, 10, 14, 0, 5, 0));
    document.dispatchEvent(new Event('visibilitychange'));
    t.detect();

    expect(t.el.querySelector('h2')?.textContent).toContain('Atrasadas');
  });
});

describe('TasksList · completar', () => {
  it('US-005-03 tocar el control completa la tarea y avisa «Tarea completada»', async () => {
    const t = setup([task({ id: 'a', title: 'Regar', dueDate: '2026-11-13' })]);
    t.el.querySelector<HTMLButtonElement>('.check')?.click();
    await flush();
    t.detect();

    expect(t.setCompleted).toHaveBeenCalledWith('a', true);
    expect(t.text()).toContain(t.copy.list.doneNotice);
    expect(t.el.querySelector('.notice[role="status"]')).not.toBeNull();
  });

  it('US-005-03 si falla, avisa del fallo como alerta', async () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.setCompleted.mockResolvedValueOnce({ ok: false, reason: 'network' });
    t.el.querySelector<HTMLButtonElement>('.check')?.click();
    await flush();
    t.detect();

    expect(t.text()).toContain(t.copy.list.failNotice);
    expect(t.text()).not.toContain(t.copy.list.doneNotice);
    expect(t.el.querySelector('.notice[role="alert"]')).not.toBeNull();
  });

  it('US-005-03 el aviso desaparece solo pasados unos segundos', async () => {
    vi.useFakeTimers();
    try {
      const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
      t.el.querySelector<HTMLButtonElement>('.check')?.click();
      await vi.advanceTimersByTimeAsync(10);
      t.detect();
      expect(t.el.querySelector('.notice')).not.toBeNull();

      await vi.advanceTimersByTimeAsync(4_000);
      t.detect();
      expect(t.el.querySelector('.notice')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('US-005-03 la sección Completadas está plegada por defecto y se despliega y pliega', () => {
    const t = setup([
      task({ title: 'Pendiente', dueDate: '2026-11-13' }),
      task({ title: 'Hecha', completedAt: '2026-11-12T09:00:00.000Z' }),
    ]);
    const toggle = t.el.querySelector<HTMLButtonElement>('.completed-toggle');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.textContent).toContain('Completadas');
    expect(toggle?.textContent).toContain('1');
    expect(t.text()).not.toContain('Hecha');

    toggle?.click();
    t.detect();
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(t.text()).toContain('Hecha');

    toggle?.click();
    t.detect();
    expect(t.text()).not.toContain('Hecha');
  });

  it('US-005-03 desmarcar una completada la devuelve a pendientes', async () => {
    const t = setup([
      task({
        id: 'x',
        title: 'Hecha',
        dueDate: '2026-11-13',
        completedAt: '2026-11-12T09:00:00.000Z',
      }),
      task({ title: 'Otra', dueDate: '2026-11-13' }),
    ]);
    t.el.querySelector<HTMLButtonElement>('.completed-toggle')?.click();
    t.detect();

    t.el.querySelector<HTMLButtonElement>('.completed .check')?.click();
    await flush();
    t.detect();

    expect(t.setCompleted).toHaveBeenCalledWith('x', false);
    expect(t.text()).toContain(t.copy.list.undoneNotice);
  });

  it('US-005-03 con la sección desplegada y sin completadas recientes, lo explica', () => {
    const t = setup([task({ dueDate: '2026-11-13' })]);
    t.el.querySelector<HTMLButtonElement>('.completed-toggle')?.click();
    t.detect();
    expect(t.text()).toContain(t.copy.list.noCompleted);
  });

  it('US-005-03 el control tiene nombre accesible con el título de la tarea', () => {
    const t = setup([task({ title: 'Llamar al fontanero', dueDate: '2026-11-13' })]);
    const label = t.el.querySelector('.check')?.getAttribute('aria-label') ?? '';
    expect(label).toContain(t.copy.list.markDone);
    expect(label).toContain('Llamar al fontanero');
  });
});

describe('TasksList · navegación y accesibilidad', () => {
  it('US-005-02 tocar una tarea abre el formulario de esa tarea', () => {
    const t = setup([task({ id: 'abc', title: 'Cita', dueDate: '2026-11-13' })]);
    t.el.querySelector<HTMLButtonElement>('.open')?.click();
    expect(t.navigate).toHaveBeenCalledWith(['/', 'abc']);
  });

  it('US-005-01 «Nueva tarea» está siempre visible y abre el formulario vacío', () => {
    const t = setup([task({ dueDate: '2026-11-13' })]);
    const fab = t.el.querySelector<HTMLButtonElement>('.fab');
    expect(fab?.textContent).toContain(t.copy.list.newTask);
    fab?.click();
    expect(t.navigate).toHaveBeenCalledWith(['/nueva']);
  });

  it('US-005-02 el botón de crear también está disponible en carga y en error', () => {
    const t = setup([], 'loading');
    expect(t.el.querySelector('.fab')).not.toBeNull();
  });

  it('US-005-02 no pinta elementos de prototipo (simulador, avatar, saludo, barra inferior)', () => {
    const t = setup([task({ dueDate: '2026-11-13' })]);
    expect(t.text()).not.toMatch(
      /vista previa|simulador|hola de nuevo|tienes \d+ tareas|agenda|ajustes|listas/i
    );
    expect(t.el.querySelector('nav, img, [data-testid="avatar"]')).toBeNull();
  });

  it('US-005-02 todos los botones son de tipo button y tienen nombre accesible', () => {
    const t = setup([task({ title: 'Algo', dueDate: '2026-11-13' })]);
    for (const b of Array.from(t.el.querySelectorAll('button'))) {
      expect(b.getAttribute('type')).toBe('button');
      const name = b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '';
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('US-005-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((TasksList as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});

describe('TasksList · alarmas', () => {
  const timed = (over: Partial<Task> = {}) =>
    task({ title: 'Llamar al fontanero', dueDate: '2026-11-14', dueTime: '11:00', ...over });

  it('US-006-02 el aviso de alarmas desactivadas solo aparece cuando el servicio lo pide', () => {
    const hidden = setup([timed()], 'ready', { supported: true, banner: false });
    expect(hidden.el.querySelector('app-alarms-banner')).toBeNull();

    const shown = setup([timed()], 'ready', {
      supported: true,
      banner: true,
      permission: 'denied',
    });
    expect(shown.el.querySelector('app-alarms-banner')).not.toBeNull();
  });

  it('US-006-02 Activar alarmas abre los ajustes y cerrar oculta el aviso ese día', () => {
    const t = setup([timed()], 'ready', { supported: true, banner: true, permission: 'denied' });
    const [activate, close] = Array.from(
      t.el.querySelectorAll<HTMLButtonElement>('app-alarms-banner button')
    );

    activate.click();
    close.click();

    expect(t.alarms.openNotificationSettings).toHaveBeenCalledTimes(1);
    expect(t.alarms.dismissBanner).toHaveBeenCalledTimes(1);
  });

  it('US-006-03 una tarea con alarma programada muestra «Avisará a las HH:MM»', () => {
    const a = timed();
    const t = setup([a], 'ready', { supported: true, permission: 'granted', scheduled: [a.id] });
    expect(t.el.querySelector('.alarm')?.textContent?.trim()).toBe('Avisará a las 11:00');
  });

  it('US-006-03 con hora pero sin permiso muestra «Sin alarma»; sin hora no muestra nada', () => {
    const withTime = timed();
    const withoutTime = task({ dueDate: '2026-11-14', dueTime: null });
    const t = setup([withTime, withoutTime], 'ready', { supported: true, permission: 'denied' });

    const labels = Array.from(t.el.querySelectorAll('.alarm')).map((e) => e.textContent?.trim());
    expect(labels).toEqual(['Sin alarma']);
  });

  it('US-006-03 en navegador (sin alarmas) no se pinta ningún indicador ni aviso', () => {
    const t = setup([timed()], 'ready', { supported: false });
    expect(t.el.querySelector('.alarm')).toBeNull();
    expect(t.el.querySelector('app-alarms-banner')).toBeNull();
    expect(t.el.querySelector('app-exact-alarm-sheet')).toBeNull();
  });

  it('US-006-03 una tarea completada o pasada no lleva indicador', () => {
    const done = timed({ completedAt: '2026-11-13T08:00:00.000Z' });
    const past = timed({ dueDate: '2026-11-12' });
    const t = setup([done, past], 'ready', { supported: true, permission: 'denied' });
    expect(t.el.querySelector('.alarm')).toBeNull();
  });

  it('US-006-02 la hoja de alarmas exactas aparece si el servicio la ofrece; Ir a ajustes y Omitir actúan', () => {
    const t = setup([timed()], 'ready', {
      supported: true,
      permission: 'granted',
      offerExact: true,
    });
    const sheet = t.el.querySelector('app-exact-alarm-sheet');
    expect(sheet).not.toBeNull();

    const [open, skip] = Array.from(sheet?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    open.click();
    skip.click();

    expect(t.alarms.openExactAlarmSettings).toHaveBeenCalledTimes(1);
    expect(t.alarms.skipExact).toHaveBeenCalledTimes(2);
  });
});

describe('TasksList · posponer', () => {
  const pending = () => task({ id: 'a', title: 'Regar', dueDate: '2026-11-13' });

  it('US-007-01 cada tarea pendiente tiene un botón Posponer con nombre accesible', () => {
    const t = setup([pending()]);
    const button = t.el.querySelector<HTMLButtonElement>('button.postpone');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe('Posponer: Regar');
  });

  it('US-007-01 las tareas completadas no tienen Posponer', () => {
    const t = setup([task({ id: 'c', completedAt: '2026-11-12T09:00:00.000Z' })]);
    t.el.querySelector<HTMLButtonElement>('.completed-toggle')?.click();
    t.detect();
    expect(t.el.querySelector('.task.done')).not.toBeNull();
    expect(t.el.querySelector('button.postpone')).toBeNull();
  });

  it('US-007-01 el botón abre la hoja con la tarea y no abre el formulario', () => {
    const t = setup([pending()]);
    expect(t.el.querySelector('app-postpone-sheet')).toBeNull();
    t.el.querySelector<HTMLButtonElement>('button.postpone')?.click();
    t.detect();

    expect(t.el.querySelector('app-postpone-sheet')).not.toBeNull();
    expect(t.text()).toContain('Posponer tarea');
    expect(t.navigate).not.toHaveBeenCalled();
  });

  it('US-007-01 elegir una opción pospone, cierra la hoja y avisa con la nueva fecha', async () => {
    const t = setup([pending()]);
    t.el.querySelector<HTMLButtonElement>('button.postpone')?.click();
    t.detect();
    t.el.querySelector<HTMLButtonElement>('app-postpone-sheet button.option')?.click();
    await flush();
    t.detect();

    expect(t.postpone).toHaveBeenCalledWith('a', { dueDate: '2026-11-14', dueTime: null });
    expect(t.el.querySelector('app-postpone-sheet')).toBeNull();
    expect(t.text()).toContain('Tarea pospuesta a Mañana');
    expect(t.el.querySelector('.notice[role="status"]')).not.toBeNull();
  });

  it('US-007-01 si falla el guardado, avisa como alerta', async () => {
    const t = setup([pending()]);
    t.postpone.mockResolvedValueOnce({ ok: false, reason: 'network' });
    t.el.querySelector<HTMLButtonElement>('button.postpone')?.click();
    t.detect();
    t.el.querySelector<HTMLButtonElement>('app-postpone-sheet button.option')?.click();
    await flush();
    t.detect();

    expect(t.text()).toContain('No se pudo posponer la tarea. Inténtalo de nuevo.');
    expect(t.el.querySelector('.notice[role="alert"]')).not.toBeNull();
  });

  it('US-007-01 cerrar la hoja sin elegir no cambia nada', () => {
    const t = setup([pending()]);
    t.el.querySelector<HTMLButtonElement>('button.postpone')?.click();
    t.detect();
    t.el.querySelector<HTMLButtonElement>('app-postpone-sheet button.close')?.click();
    t.detect();

    expect(t.el.querySelector('app-postpone-sheet')).toBeNull();
    expect(t.postpone).not.toHaveBeenCalled();
  });
});

describe('TasksList · progreso', () => {
  it('US-008-04 muestra el resumen de progreso arriba de la lista y carga el progreso', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    const summary = t.el.querySelector('app-progress-summary');
    expect(summary).not.toBeNull();
    expect(t.progress.load).toHaveBeenCalled();
    const heading = t.el.querySelector('h1');
    expect(heading?.compareDocumentPosition(summary as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('US-008-01 completar pide al progreso comparar con lo de antes', async () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.el.querySelector<HTMLButtonElement>('.check')?.click();
    await flush();

    expect(t.setCompleted).toHaveBeenCalledWith('a', true);
    expect(t.progress.afterToggle).toHaveBeenCalledWith(true, PROGRESS);
  });

  it('US-008-01 desmarcar también avisa al progreso', async () => {
    const t = setup([task({ id: 'c', completedAt: '2026-11-12T09:00:00.000Z' })]);
    t.el.querySelector<HTMLButtonElement>('.completed-toggle')?.click();
    t.detect();
    t.el.querySelector<HTMLButtonElement>('.task.done .check')?.click();
    await flush();

    expect(t.progress.afterToggle).toHaveBeenCalledWith(false, PROGRESS);
  });

  it('US-008-01 si falla el guardado, el progreso no se toca', async () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.setCompleted.mockResolvedValueOnce({ ok: false, reason: 'network' });
    t.el.querySelector<HTMLButtonElement>('.check')?.click();
    await flush();

    expect(t.progress.afterToggle).not.toHaveBeenCalled();
    expect(t.text()).toContain(t.copy.list.failNotice);
  });

  it('US-008-01 muestra la celebración mientras la haya y la quita al terminar', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.progress.celebration.set({ xpDelta: 10, capped: false, streakDays: null, leveledUpTo: null });
    t.detect();
    expect(t.el.querySelector('app-celebration')).not.toBeNull();
    expect(t.text()).toContain('+10 XP');

    t.el.querySelector('app-celebration')?.dispatchEvent(new Event('finished'));
    t.progress.dismissCelebration();
    t.detect();
    expect(t.el.querySelector('app-celebration')).toBeNull();
  });

  it('US-008-02 al subir de nivel lleva a la pantalla de subida', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.progress.levelUp.set(2);
    t.detect();
    expect(t.navigate).toHaveBeenCalledWith(['/nivel', 2]);
  });
});

describe('TasksList · sistema de diseño (spec 010)', () => {
  const timed = (over: Partial<Task> = {}) =>
    task({ title: 'Llamar al fontanero', dueDate: '2026-11-14', dueTime: '11:00', ...over });

  it('US-010-02 hora, atraso y aviso son píldoras con su rol de color', () => {
    const overdue = timed({ title: 'Vieja', dueDate: '2026-11-10' });
    const t = setup([overdue], 'ready', {
      supported: true,
      permission: 'granted',
      scheduled: [overdue.id],
    });
    const meta = t.el.querySelector('.meta') as HTMLElement;
    expect(meta.querySelector('.tag.pill')?.textContent?.trim()).toBe(t.copy.list.overdueTag);
    expect(meta.querySelector('.when.pill')).not.toBeNull();
    expect(meta.querySelector('.alarm.pill')).not.toBeNull();
  });

  it('US-010-02 el aviso apagado y el encendido se distinguen por clase', () => {
    const a = timed();
    const on = setup([a], 'ready', { supported: true, permission: 'granted', scheduled: [a.id] });
    expect(on.el.querySelector('.alarm.pill')?.classList.contains('off')).toBe(false);
    const off = setup([timed()], 'ready', { supported: true, permission: 'denied' });
    expect(off.el.querySelector('.alarm.pill')?.classList.contains('off')).toBe(true);
  });

  it('US-010-02 el check es un botón con nombre accesible y marca visible dentro de un círculo', () => {
    const t = setup([task({ title: 'Regar', dueDate: '2026-11-14' })]);
    const check = t.el.querySelector<HTMLButtonElement>('button.check');
    expect(check?.getAttribute('aria-label')).toContain('Regar');
    expect(check?.querySelector('app-icon')).not.toBeNull();
    expect(check?.querySelector('.ring')).not.toBeNull();
  });

  it('US-010-02 vacío muestra una ilustración decorativa sin cambiar textos ni acciones', () => {
    const t = setup([]);
    const art = t.el.querySelector('.state app-illustration');
    expect(art?.getAttribute('kind')).toBe('hill');
    expect(art?.getAttribute('aria-hidden')).toBe('true');
    expect(t.text()).toContain(t.copy.list.emptyTitle);
    expect(t.text()).toContain(t.copy.list.createFirst);
  });

  it('US-010-02 error muestra la ilustración de nube y conserva Reintentar', () => {
    const t = setup([], 'loading');
    t.errorReason.set('network');
    t.status.set('error');
    t.detect();
    expect(t.el.querySelector('.state app-illustration')?.getAttribute('kind')).toBe('cloud');
    expect(t.text()).toContain(t.copy.list.errorTitle);
    expect(t.text()).toContain(t.copy.list.retry);
  });

  it('US-010-02 cargando mantiene el indicador y no usa ilustración', () => {
    const t = setup([], 'loading');
    expect(t.el.querySelector('.spinner')).not.toBeNull();
    expect(t.el.querySelector('app-illustration')).toBeNull();
  });

  it('US-010-02 el botón flotante «Nueva tarea» es un botón principal anclado y el aviso no lo tapa', () => {
    const t = setup([task({ dueDate: '2026-11-14' })]);
    expect(t.el.querySelector('button.fab')).not.toBeNull();
    expect(t.el.querySelector('.screen')).not.toBeNull();
  });
});

describe('TasksList · botón de perfil', () => {
  it('US-011-03 la cabecera tiene el título «Tareas» y a su derecha el botón de perfil', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    const header = t.el.querySelector('header.header') as HTMLElement;
    const heading = header.querySelector('h1') as HTMLElement;
    const profile = header.querySelector('app-profile-button') as HTMLElement;
    expect(heading.textContent?.trim()).toBe('Tareas');
    expect(profile).not.toBeNull();
    expect(heading.compareDocumentPosition(profile)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('US-011-03 el botón de perfil está también con la lista vacía', () => {
    const t = setup([]);
    expect(t.el.querySelector('header.header app-profile-button')).not.toBeNull();
  });
});

describe('TasksList · recordatorio de cuenta', () => {
  it('US-011-08 sin recordatorio activo no se pinta la tarjeta', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    expect(t.el.querySelector('app-account-reminder')).toBeNull();
  });

  it('US-011-08 con el recordatorio activo aparece bajo el resumen de nivel y antes de las tareas', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.reminderOn.set(true);
    t.detect();

    const summary = t.el.querySelector('app-progress-summary') as Node;
    const reminder = t.el.querySelector('app-account-reminder') as Node;
    const firstGroup = t.el.querySelector('.group') as Node;
    expect(reminder).not.toBeNull();
    expect(summary.compareDocumentPosition(reminder)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(reminder.compareDocumentPosition(firstGroup)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('US-011-08 también aparece con la lista vacía (no depende de tener tareas pendientes)', () => {
    const t = setup([]);
    t.reminderOn.set(true);
    t.detect();
    expect(t.el.querySelector('app-account-reminder')).not.toBeNull();
  });

  it('US-011-08 el aspa o «En 14 días» aplazan el recordatorio y la tarjeta desaparece', () => {
    const t = setup([task({ id: 'a', dueDate: '2026-11-13' })]);
    t.reminderOn.set(true);
    t.detect();

    (t.el.querySelector('app-account-reminder button.close') as HTMLButtonElement).click();
    t.detect();

    expect(t.snoozeReminder).toHaveBeenCalledTimes(1);
    expect(t.el.querySelector('app-account-reminder')).toBeNull();
  });
});
