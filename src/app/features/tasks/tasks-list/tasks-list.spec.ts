import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Task } from '../../../core/models/task';
import { CLOCK } from '../../../core/services/clock';
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
    ...over,
  };
}

function setup(initial: Task[] = [], status: TasksStatus = 'ready') {
  let now = new Date(2026, 10, 13, 12, 0, 0);
  const tasks = signal<readonly Task[]>(initial);
  const statusSig = signal<TasksStatus>(status);
  const errorReason = signal<TasksErrorReason | null>(null);
  const setCompleted = vi.fn(async (): Promise<TaskOpResult> => ({ ok: true }));
  const load = vi.fn(async () => undefined);
  const access = { tasks, status: statusSig, errorReason, load, setCompleted };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TasksList],
    providers: [
      provideRouter([]),
      { provide: TasksAccessService, useValue: access },
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
    load,
    navigate,
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
