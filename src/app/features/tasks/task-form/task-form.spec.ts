import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlarmPermission } from '../../../core/models/alarm';
import { TaskSeries } from '../../../core/models/recurrence';
import { Task, TaskInput } from '../../../core/models/task';
import { CLOCK } from '../../../core/services/clock';
import { AlarmsAccessService } from '../alarms/alarms.access.service';
import { TaskOpResult, TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';
import { TasksNoticeService } from '../tasks-notice.service';
import { TaskForm } from './task-form';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const EXISTING: Task = {
  id: 'abc',
  title: 'Comprar pan',
  dueDate: '2026-11-13',
  dueTime: '09:30',
  completedAt: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  postponedCount: 0,
  seriesId: null,
  seriesDate: null,
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function setup(
  options: {
    id?: string;
    existing?: Task | null;
    lateLoad?: boolean;
    askPermission?: boolean;
    series?: TaskSeries;
  } = {}
) {
  const alarms = {
    shouldAskPermission: vi.fn(() => options.askPermission ?? false),
    requestPermission: vi.fn(async (): Promise<AlarmPermission> => 'granted'),
    recordDenial: vi.fn(),
  };
  const existing = options.existing === undefined ? EXISTING : options.existing;
  let loaded = !options.lateLoad;
  const ok = async (): Promise<TaskOpResult> => ({ ok: true });
  const access = {
    tasks: signal<readonly Task[]>([]),
    get: vi.fn((id: string) => (loaded && existing && existing.id === id ? existing : undefined)),
    load: vi.fn(async () => {
      loaded = true;
    }),
    create: vi.fn((input: TaskInput) => {
      void input;
      return ok();
    }),
    update: vi.fn((id: string, input: TaskInput) => {
      void id;
      void input;
      return ok();
    }),
    remove: vi.fn((id: string) => {
      void id;
      return ok();
    }),
    postpone: vi.fn((id: string, target: unknown) => {
      void id;
      void target;
      return ok();
    }),
    updateSeries: vi.fn((id: string, input: TaskInput) => {
      void id;
      void input;
      return ok();
    }),
    updateOccurrence: vi.fn((id: string, input: TaskInput) => {
      void id;
      void input;
      return ok();
    }),
    removeOccurrence: vi.fn((id: string) => {
      void id;
      return ok();
    }),
    removeSeries: vi.fn((id: string) => {
      void id;
      return ok();
    }),
    seriesOf: vi.fn((): TaskSeries | undefined => options.series),
  };

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TaskForm],
    providers: [
      provideRouter([]),
      { provide: TasksAccessService, useValue: access },
      { provide: AlarmsAccessService, useValue: alarms },
      { provide: CLOCK, useValue: () => new Date(2026, 10, 13, 12, 0, 0) },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(options.id ? { id: options.id } : {}),
          },
        },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(TaskForm);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const copy = TestBed.inject(TasksConstructorService);

  const api = {
    fixture,
    el,
    copy,
    access,
    alarms,
    navigate,
    detect: () => fixture.detectChanges(),
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    titleInput: () => el.querySelector<HTMLInputElement>('input[name="title"]') as HTMLInputElement,
    dateInput: () => el.querySelector<HTMLInputElement>('input[type="date"]') as HTMLInputElement,
    timeInput: () => el.querySelector<HTMLInputElement>('input[type="time"]') as HTMLInputElement,
    saveButton: () => el.querySelector<HTMLButtonElement>('button.save') as HTMLButtonElement,
    button: (label: string) =>
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)),
    type(value: string) {
      const input = api.titleInput();
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
    setDate(value: string) {
      const input = api.dateInput();
      input.value = value;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    },
    setTime(value: string) {
      const input = api.timeInput();
      input.value = value;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    },
    async save() {
      api.saveButton().click();
      await flush();
      fixture.detectChanges();
    },
  };
  return api;
}

describe('TaskForm · título (crear)', () => {
  it('US-005-01 muestra «Nueva tarea», el título vacío y Guardar deshabilitado con el motivo', () => {
    const f = setup();
    expect(f.text()).toContain(f.copy.form.createTitle);
    expect(f.titleInput().value).toBe('');
    expect(f.saveButton().disabled).toBe(true);
    expect(f.text()).toContain(f.copy.form.titleRequired);
  });

  it('US-005-01 solo espacios sigue siendo inválido', () => {
    const f = setup();
    f.type('     ');
    expect(f.saveButton().disabled).toBe(true);
    expect(f.text()).toContain(f.copy.form.titleRequired);
  });

  it('US-005-01 un título válido habilita Guardar y quita el motivo', () => {
    const f = setup();
    f.type('Llamar al fontanero');
    expect(f.saveButton().disabled).toBe(false);
    expect(f.text()).not.toContain(f.copy.form.titleRequired);
  });

  it('US-005-01 120 caracteres es válido y 121 no, con el contador y el motivo', () => {
    const f = setup();
    f.type('a'.repeat(120));
    expect(f.saveButton().disabled).toBe(false);
    expect(f.text()).toContain('120 / 120');

    f.type('a'.repeat(121));
    expect(f.saveButton().disabled).toBe(true);
    expect(f.text()).toContain('121 / 120');
    expect(f.text()).toContain(f.copy.form.titleTooLong);
  });

  it('US-005-01 el aviso bajo Guardar solo pide escribir un título cuando está vacío, no cuando es demasiado largo', () => {
    const f = setup();
    expect(f.text()).toContain(f.copy.form.saveBlocked);

    f.type('a'.repeat(121));
    expect(f.text()).not.toContain(f.copy.form.saveBlocked);
    expect(f.text()).toContain(f.copy.form.titleTooLong);

    f.type('Algo');
    expect(f.text()).not.toContain(f.copy.form.saveBlocked);
  });

  it('US-005-01 el contador cuenta lo que se guarda: sin los espacios de los extremos y sin ponerse en rojo', () => {
    const f = setup();
    f.type(`  ${'a'.repeat(120)}  `);
    expect(f.text()).toContain('120 / 120');
    expect(f.el.querySelector('.counter.over')).toBeNull();

    f.type('     ');
    expect(f.text()).toContain('0 / 120');
  });

  it('US-005-01 los espacios de los extremos no cuentan para el límite', () => {
    const f = setup();
    f.type(`  ${'a'.repeat(120)}  `);
    expect(f.saveButton().disabled).toBe(false);
  });

  it('US-005-01 el campo tiene etiqueta accesible y es obligatorio', () => {
    const f = setup();
    const input = f.titleInput();
    expect(input.getAttribute('aria-required')).toBe('true');
    const id = input.getAttribute('id') ?? '';
    expect(f.el.querySelector(`label[for="${id}"]`)?.textContent).toContain(f.copy.form.titleLabel);
  });
});

describe('TaskForm · fecha y hora', () => {
  it('US-005-01 la fecha por defecto es hoy (hora local)', () => {
    const f = setup();
    expect(f.dateInput().value).toBe('2026-11-13');
    expect(f.button(f.copy.form.today)?.getAttribute('aria-pressed')).toBe('true');
    expect(f.button(f.copy.form.tomorrow)?.getAttribute('aria-pressed')).toBe('false');
  });

  it('US-005-01 «Mañana» y «Hoy» cambian la fecha', () => {
    const f = setup();
    f.button(f.copy.form.tomorrow)?.click();
    f.detect();
    expect(f.dateInput().value).toBe('2026-11-14');
    expect(f.button(f.copy.form.tomorrow)?.getAttribute('aria-pressed')).toBe('true');

    f.button(f.copy.form.today)?.click();
    f.detect();
    expect(f.dateInput().value).toBe('2026-11-13');
  });

  it('US-005-01 «Elegir fecha» admite cualquier día con el selector del sistema', () => {
    const f = setup();
    expect(f.dateInput().type).toBe('date');
    f.setDate('2026-12-24');
    expect(f.dateInput().value).toBe('2026-12-24');
    expect(f.button(f.copy.form.today)?.getAttribute('aria-pressed')).toBe('false');
  });

  it('US-005-01 «Quitar fecha» deja la tarea sin fecha y sin hora', () => {
    const f = setup();
    f.setTime('10:00');
    f.button(f.copy.form.clearDate)?.click();
    f.detect();

    expect(f.dateInput().value).toBe('');
    expect(f.timeInput().value).toBe('');
    expect(f.button(f.copy.form.clearDate)).toBeUndefined();
  });

  it('US-005-01 la hora solo está disponible con fecha y lo explica', () => {
    const f = setup();
    expect(f.timeInput().disabled).toBe(false);

    f.button(f.copy.form.clearDate)?.click();
    f.detect();
    expect(f.timeInput().disabled).toBe(true);
    expect(f.text()).toContain(f.copy.form.timeNeedsDate);

    f.button(f.copy.form.today)?.click();
    f.detect();
    expect(f.timeInput().disabled).toBe(false);
    expect(f.text()).not.toContain(f.copy.form.timeNeedsDate);
  });

  it('US-005-01 la hora se puede poner y quitar', () => {
    const f = setup();
    f.setTime('16:30');
    expect(f.timeInput().value).toBe('16:30');
    f.button(f.copy.form.clearTime)?.click();
    f.detect();
    expect(f.timeInput().value).toBe('');
  });
});

describe('TaskForm · guardar', () => {
  it('US-005-01 crear guarda título recortado, fecha y hora, y vuelve a la lista', async () => {
    const f = setup();
    f.type('  Llamar al fontanero ');
    f.setTime('16:30');

    await f.save();

    expect(f.access.create).toHaveBeenCalledWith({
      title: 'Llamar al fontanero',
      dueDate: '2026-11-13',
      dueTime: '16:30',
    });
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-005-01 crear sin fecha guarda sin fecha y sin hora', async () => {
    const f = setup();
    f.type('Idea');
    f.button(f.copy.form.clearDate)?.click();
    f.detect();

    await f.save();

    expect(f.access.create).toHaveBeenCalledWith({ title: 'Idea', dueDate: null, dueTime: null });
  });

  it('US-005-01 mientras guarda, Guardar queda bloqueado y no se guarda dos veces', async () => {
    const f = setup();
    let release: (r: TaskOpResult) => void = () => undefined;
    f.access.create.mockImplementationOnce(
      () => new Promise<TaskOpResult>((resolve) => (release = resolve))
    );
    f.type('Algo');

    f.saveButton().click();
    f.detect();
    expect(f.saveButton().disabled).toBe(true);
    expect(f.text()).toContain(f.copy.form.saving);
    f.saveButton().click();
    expect(f.access.create).toHaveBeenCalledTimes(1);

    release({ ok: true });
    await flush();
  });

  it('US-005-01 si falla el guardado, avisa, no se cierra y conserva lo escrito', async () => {
    const f = setup();
    f.access.create.mockResolvedValueOnce({ ok: false, reason: 'network' });
    f.type('Mi tarea');
    f.setDate('2026-12-24');
    f.setTime('08:15');

    await f.save();

    expect(f.text()).toContain(f.copy.form.saveError);
    expect(f.el.querySelector('[role="alert"]')).not.toBeNull();
    expect(f.navigate).not.toHaveBeenCalled();
    expect(f.titleInput().value).toBe('Mi tarea');
    expect(f.dateInput().value).toBe('2026-12-24');
    expect(f.timeInput().value).toBe('08:15');
    expect(f.saveButton().disabled).toBe(false);
  });

  it('US-005-01 cerrar sin guardar vuelve a la lista sin guardar nada', () => {
    const f = setup();
    f.type('No guardar');
    f.button(f.copy.form.cancel)?.click();

    expect(f.navigate).toHaveBeenCalledWith(['/']);
    expect(f.access.create).not.toHaveBeenCalled();
  });
});

describe('TaskForm · editar', () => {
  it('US-005-04 carga los datos de la tarea y muestra «Editar tarea»', () => {
    const f = setup({ id: 'abc' });
    expect(f.text()).toContain(f.copy.form.editTitle);
    expect(f.titleInput().value).toBe('Comprar pan');
    expect(f.dateInput().value).toBe('2026-11-13');
    expect(f.timeInput().value).toBe('09:30');
  });

  it('US-005-04 guardar actualiza la tarea y vuelve a la lista', async () => {
    const f = setup({ id: 'abc' });
    f.type('Comprar pan integral');
    f.setDate('2026-11-20');

    await f.save();

    expect(f.access.update).toHaveBeenCalledWith('abc', {
      title: 'Comprar pan integral',
      dueDate: '2026-11-20',
      dueTime: '09:30',
    });
    expect(f.access.create).not.toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-005-04 quitar la fecha guarda también sin hora', async () => {
    const f = setup({ id: 'abc' });
    f.button(f.copy.form.clearDate)?.click();
    f.detect();

    await f.save();

    expect(f.access.update).toHaveBeenCalledWith('abc', {
      title: 'Comprar pan',
      dueDate: null,
      dueTime: null,
    });
  });

  it('US-005-04 si falla la edición, avisa y conserva los cambios', async () => {
    const f = setup({ id: 'abc' });
    f.access.update.mockResolvedValueOnce({ ok: false, reason: 'unknown' });
    f.type('Cambiado');

    await f.save();

    expect(f.text()).toContain(f.copy.form.saveError);
    expect(f.titleInput().value).toBe('Cambiado');
    expect(f.navigate).not.toHaveBeenCalled();
  });

  it('US-005-04 si la tarea no existe, vuelve a la lista', async () => {
    const f = setup({ id: 'nope', existing: null });
    await flush();
    expect(f.access.load).toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-005-04 al entrar directamente en una tarea aún no cargada, la carga y rellena el formulario', async () => {
    const f = setup({ id: 'abc', lateLoad: true });
    expect(f.titleInput().value).toBe('');
    await flush();
    f.detect();
    expect(f.titleInput().value).toBe('Comprar pan');
  });
});

describe('TaskForm · borrar', () => {
  it('US-005-04 «Borrar tarea» solo existe al editar', () => {
    const create = setup();
    expect(create.button(create.copy.form.delete)).toBeUndefined();
    const edit = setup({ id: 'abc' });
    expect(edit.button(edit.copy.form.delete)).toBeDefined();
  });

  it('US-005-04 pide confirmación dentro de la pantalla antes de borrar', () => {
    const f = setup({ id: 'abc' });
    f.button(f.copy.form.delete)?.click();
    f.detect();

    const dialog = f.el.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(f.text()).toContain(f.copy.form.deleteWarning);
    expect(f.access.remove).not.toHaveBeenCalled();
  });

  it('US-005-04 cancelar la confirmación no borra nada y cierra el aviso', () => {
    const f = setup({ id: 'abc' });
    f.button(f.copy.form.delete)?.click();
    f.detect();
    f.button(f.copy.form.deleteCancel)?.click();
    f.detect();

    expect(f.access.remove).not.toHaveBeenCalled();
    expect(f.el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(f.navigate).not.toHaveBeenCalled();
  });

  it('US-005-04 confirmar borra la tarea y vuelve a la lista', async () => {
    const f = setup({ id: 'abc' });
    f.button(f.copy.form.delete)?.click();
    f.detect();
    f.button(f.copy.form.deleteConfirm)?.click();
    await flush();
    f.detect();

    expect(f.access.remove).toHaveBeenCalledWith('abc');
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-005-04 si falla el borrado, avisa y la tarea sigue ahí', async () => {
    const f = setup({ id: 'abc' });
    f.access.remove.mockResolvedValueOnce({ ok: false, reason: 'network' });
    f.button(f.copy.form.delete)?.click();
    f.detect();
    f.button(f.copy.form.deleteConfirm)?.click();
    await flush();
    f.detect();

    expect(f.text()).toContain(f.copy.form.deleteError);
    expect(f.el.querySelector('[role="alert"]')).not.toBeNull();
    expect(f.navigate).not.toHaveBeenCalled();
    expect(f.el.querySelector('[role="alertdialog"]')).toBeNull();
  });
});

describe('TaskForm · accesibilidad', () => {
  it('US-005-01 todos los botones son de tipo button, con nombre accesible y sin elementos de prototipo', () => {
    const f = setup({ id: 'abc' });
    for (const b of Array.from(f.el.querySelectorAll('button'))) {
      expect(b.getAttribute('type')).toBe('button');
      expect((b.getAttribute('aria-label') ?? b.textContent ?? '').trim().length).toBeGreaterThan(
        0
      );
    }
    expect(f.text()).not.toMatch(/modos de prueba|interactivo|>120 chars|permite coordinar/i);
    expect(f.el.querySelector('img, [data-testid="avatar"]')).toBeNull();
  });

  it('US-005-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((TaskForm as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});

describe('TaskForm · aviso previo de alarmas', () => {
  const promptOf = (el: HTMLElement) => el.querySelector('app-alarm-permission-prompt');

  it('US-006-02 el aviso previo nunca aparece al abrir el formulario', () => {
    const f = setup({ askPermission: true });
    expect(promptOf(f.el)).toBeNull();
    expect(f.alarms.requestPermission).not.toHaveBeenCalled();
  });

  it('US-006-02 al guardar una tarea con hora aparece el aviso previo y la lista no se abre todavía', async () => {
    const f = setup({ askPermission: true });
    f.type('Llamar');
    f.setDate('2026-11-14');
    f.setTime('16:30');

    await f.save();

    expect(f.access.create).toHaveBeenCalled();
    expect(promptOf(f.el)).not.toBeNull();
    expect(f.navigate).not.toHaveBeenCalled();
  });

  it('US-006-02 Permitir pide el permiso del sistema y vuelve a la lista', async () => {
    const f = setup({ askPermission: true });
    f.type('Llamar');
    f.setDate('2026-11-14');
    f.setTime('16:30');
    await f.save();

    const allow = promptOf(f.el)?.querySelectorAll('button')[0] as HTMLButtonElement;
    allow.click();
    await flush();
    f.detect();

    expect(f.alarms.requestPermission).toHaveBeenCalledTimes(1);
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-006-02 Ahora no anota la negativa, no pide el permiso y vuelve a la lista', async () => {
    const f = setup({ askPermission: true });
    f.type('Llamar');
    f.setDate('2026-11-14');
    f.setTime('16:30');
    await f.save();

    const later = promptOf(f.el)?.querySelectorAll('button')[1] as HTMLButtonElement;
    later.click();
    await flush();
    f.detect();

    expect(f.alarms.recordDenial).toHaveBeenCalledTimes(1);
    expect(f.alarms.requestPermission).not.toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-006-02 no aparece sin hora, con la hora ya pasada ni cuando el servicio no lo pide', async () => {
    const noTime = setup({ askPermission: true });
    noTime.type('Sin hora');
    await noTime.save();
    expect(promptOf(noTime.el)).toBeNull();
    expect(noTime.navigate).toHaveBeenCalledWith(['/']);

    const past = setup({ askPermission: true });
    past.type('Pasada');
    past.setDate('2026-11-13');
    past.setTime('08:00');
    await past.save();
    expect(promptOf(past.el)).toBeNull();

    const notNeeded = setup({ askPermission: false });
    notNeeded.type('Con hora');
    notNeeded.setDate('2026-11-14');
    notNeeded.setTime('16:30');
    await notNeeded.save();
    expect(promptOf(notNeeded.el)).toBeNull();
    expect(notNeeded.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-006-02 si falla el guardado no se muestra el aviso previo', async () => {
    const f = setup({ askPermission: true });
    f.access.create.mockResolvedValueOnce({ ok: false, reason: 'network' });
    f.type('Llamar');
    f.setDate('2026-11-14');
    f.setTime('16:30');

    await f.save();

    expect(promptOf(f.el)).toBeNull();
  });
});

describe('TaskForm · posponer', () => {
  const openSheet = (f: ReturnType<typeof setup>) => {
    f.el.querySelector<HTMLButtonElement>('button.postpone')?.click();
    f.detect();
  };

  it('US-007-01 el botón Posponer solo aparece al editar', () => {
    expect(setup({ id: 'abc' }).el.querySelector('button.postpone')).not.toBeNull();
    expect(setup().el.querySelector('button.postpone')).toBeNull();
  });

  it('US-007-01 abre la hoja de la tarea que se edita', () => {
    const f = setup({ id: 'abc' });
    openSheet(f);
    expect(f.el.querySelector('app-postpone-sheet')).not.toBeNull();
    expect(f.text()).toContain('Comprar pan');
  });

  it('US-007-01 al elegir, pospone, deja el aviso en el servicio compartido y vuelve a la lista', async () => {
    const f = setup({ id: 'abc' });
    openSheet(f);
    f.el.querySelector<HTMLButtonElement>('app-postpone-sheet button.option')?.click();
    await vi.waitFor(() => expect(f.navigate).toHaveBeenCalledWith(['/']));

    expect(f.access.postpone).toHaveBeenCalledTimes(1);
    expect(f.access.postpone.mock.calls[0][0]).toBe('abc');
    expect(TestBed.inject(TasksNoticeService).notice()).toEqual({
      text: expect.stringContaining('Tarea pospuesta'),
      error: false,
    });
  });

  it('US-007-01 si falla, se queda en el formulario y avisa', async () => {
    const f = setup({ id: 'abc' });
    f.access.postpone.mockResolvedValueOnce({ ok: false, reason: 'network' });
    openSheet(f);
    f.el.querySelector<HTMLButtonElement>('app-postpone-sheet button.option')?.click();
    await flush();
    f.detect();

    expect(f.navigate).not.toHaveBeenCalled();
    expect(f.text()).toContain('No se pudo posponer la tarea. Inténtalo de nuevo.');
    expect(f.el.querySelector('app-postpone-sheet')).toBeNull();
  });
});

describe('TaskForm · repetición (spec 012)', () => {
  // La fecha por defecto es hoy: sábado... en este reloj, 2026-11-13 es viernes.
  const rowButton = (f: ReturnType<typeof setup>) =>
    f.el.querySelector<HTMLButtonElement>('button.repeat') as HTMLButtonElement;
  const sheet = (f: ReturnType<typeof setup>) => f.el.querySelector('app-recurrence-sheet');
  const pick = (f: ReturnType<typeof setup>, label: string) => {
    const radio = Array.from(
      f.el.querySelectorAll<HTMLElement>('app-recurrence-sheet [role="radio"]')
    ).find((r) => r.textContent?.includes(label));
    radio?.click();
    f.detect();
  };
  const toggleDay = (f: ReturnType<typeof setup>, name: string) => {
    f.el.querySelector<HTMLElement>(`app-recurrence-sheet .day[aria-label="${name}"]`)?.click();
    f.detect();
  };
  const done = (f: ReturnType<typeof setup>) => {
    f.el.querySelector<HTMLElement>('app-recurrence-sheet .done')?.click();
    f.detect();
  };

  it('US-012-01 muestra la fila «Repetir» con «No se repite» por defecto', () => {
    const f = setup();
    expect(rowButton(f).textContent).toContain('Repetir');
    expect(rowButton(f).textContent).toContain('No se repite');
    expect(rowButton(f).disabled).toBe(false);
    expect(sheet(f)).toBeNull();
  });

  it('US-012-01 sin fecha, la fila queda desactivada y explica por qué', () => {
    const f = setup();
    f.setDate('');
    expect(rowButton(f).disabled).toBe(true);
    expect(f.text()).toContain('Elige una fecha para repetir la tarea');
  });

  it('US-012-01 tocar la fila abre la hoja y «Listo» deja la regla en la fila', () => {
    const f = setup();
    rowButton(f).click();
    f.detect();
    expect(sheet(f)).not.toBeNull();

    pick(f, 'Todos los días');
    done(f);

    expect(sheet(f)).toBeNull();
    expect(rowButton(f).textContent).toContain('Todos los días');
  });

  it('US-012-01 «Descartar» cierra la hoja sin cambiar la regla', () => {
    const f = setup();
    rowButton(f).click();
    f.detect();
    pick(f, 'Todos los días');
    f.el.querySelector<HTMLElement>('app-recurrence-sheet .discard')?.click();
    f.detect();

    expect(sheet(f)).toBeNull();
    expect(rowButton(f).textContent).toContain('No se repite');
  });

  it('US-012-01 guardar con «Todos los días» crea la serie desde la fecha elegida', async () => {
    const f = setup();
    f.type('Tomar la pastilla');
    rowButton(f).click();
    f.detect();
    pick(f, 'Todos los días');
    done(f);

    await f.save();

    expect(f.access.create).toHaveBeenCalledWith({
      title: 'Tomar la pastilla',
      dueDate: '2026-11-13',
      dueTime: null,
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

  it('US-012-01 si la fecha no cae en un día marcado, la primera ocurrencia es el siguiente día válido', async () => {
    const f = setup();
    f.type('Gimnasio');
    f.setDate('2026-11-14'); // sábado
    rowButton(f).click();
    f.detect();
    pick(f, 'Días de la semana');
    toggleDay(f, 'sábado'); // quita el sábado, marcado por defecto
    toggleDay(f, 'lunes');
    done(f);

    await f.save();

    expect(f.access.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: '2026-11-16',
        recurrence: expect.objectContaining({
          kind: 'weekly',
          weekdays: [1],
          startDate: '2026-11-14',
        }),
      })
    );
  });

  it('US-012-01 si se cambia la fecha después de elegir la regla, la regla empieza en la fecha final', async () => {
    const f = setup();
    f.type('Pastilla');
    rowButton(f).click();
    f.detect();
    pick(f, 'Todos los días');
    done(f);
    f.setDate('2026-11-20');

    await f.save();

    expect(f.access.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: '2026-11-20',
        recurrence: expect.objectContaining({ startDate: '2026-11-20' }),
      })
    );
  });

  it('US-012-01 quitar la fecha de una tarea con repetición la deja en «No se repite» y avisa', () => {
    const f = setup();
    rowButton(f).click();
    f.detect();
    pick(f, 'Todos los días');
    done(f);

    f.button(f.copy.form.clearDate)?.click();
    f.detect();

    expect(rowButton(f).textContent).toContain('No se repite');
    expect(f.text()).toContain('Sin fecha la tarea ya no se repite.');
  });

  it('US-012-01 una tarea sin repetición se guarda como hasta ahora', async () => {
    const f = setup();
    f.type('Comprar pan');

    await f.save();

    expect(f.access.create).toHaveBeenCalledWith({
      title: 'Comprar pan',
      dueDate: '2026-11-13',
      dueTime: null,
    });
  });

  it('US-012-01 al editar una tarea suelta y ponerle repetición, se convierte en serie', async () => {
    const f = setup({ id: 'abc' });
    rowButton(f).click();
    f.detect();
    pick(f, 'Todos los días');
    done(f);

    await f.save();

    expect(f.access.updateSeries).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({
        title: 'Comprar pan',
        recurrence: expect.objectContaining({ kind: 'daily', startDate: '2026-11-13' }),
      })
    );
    expect(f.access.update).not.toHaveBeenCalled();
  });
});

describe('TaskForm · editar y borrar una ocurrencia (spec 012)', () => {
  const RULE = {
    kind: 'daily' as const,
    interval: 1,
    weekdays: [] as number[],
    monthDay: null,
    startDate: '2026-11-13',
    until: null,
  };
  const SERIES: TaskSeries = { id: 's1', title: 'Comprar pan', dueTime: '09:30', recurrence: RULE };
  const OCCURRENCE: Task = { ...EXISTING, seriesId: 's1', seriesDate: '2026-11-13' };

  const open = () => setup({ id: 'abc', existing: OCCURRENCE, series: SERIES });
  type F = ReturnType<typeof setup>;
  const choice = (f: F) => f.el.querySelector('app-series-choice-sheet');
  const choose = (f: F, selector: string) => {
    f.el.querySelector<HTMLElement>(`app-series-choice-sheet ${selector}`)?.click();
    f.detect();
  };
  const rowButton = (f: F) => f.el.querySelector<HTMLButtonElement>('button.repeat');
  const pickNone = (f: F) => {
    rowButton(f)?.click();
    f.detect();
    Array.from(f.el.querySelectorAll<HTMLElement>('app-recurrence-sheet [role="radio"]'))
      .find((r) => r.textContent?.includes('No se repite'))
      ?.click();
    f.detect();
    f.el.querySelector<HTMLElement>('app-recurrence-sheet .done')?.click();
    f.detect();
  };

  it('US-012-04 al editar una ocurrencia, la fila «Repetir» muestra la regla actual', () => {
    const f = open();
    expect(rowButton(f)?.textContent).toContain('Todos los días');
  });

  it('US-012-03 si cambia el título y la regla sigue igual, pregunta «solo esta» o «toda la serie»', async () => {
    const f = open();
    f.type('Comprar pan integral');

    await f.save();

    expect(choice(f)).not.toBeNull();
    expect(f.access.updateOccurrence).not.toHaveBeenCalled();
    expect(f.access.updateSeries).not.toHaveBeenCalled();
  });

  it('US-012-03 «Solo esta» cambia únicamente esa ocurrencia y vuelve a la lista', async () => {
    const f = open();
    f.type('Comprar pan integral');
    await f.save();

    choose(f, '.single');
    await flush();

    expect(f.access.updateOccurrence).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({ title: 'Comprar pan integral', dueDate: '2026-11-13' })
    );
    expect(f.access.updateSeries).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(f.navigate).toHaveBeenCalledWith(['/']));
  });

  it('US-012-03 «Toda la serie» cambia la serie con su regla', async () => {
    const f = open();
    f.type('Comprar pan integral');
    await f.save();

    choose(f, '.all');
    await flush();

    expect(f.access.updateSeries).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({
        title: 'Comprar pan integral',
        recurrence: expect.objectContaining({ kind: 'daily', startDate: '2026-11-13' }),
      })
    );
    expect(f.access.updateOccurrence).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(f.navigate).toHaveBeenCalledWith(['/']));
  });

  it('US-012-03 «Cancelar» en la hoja vuelve al formulario sin guardar nada', async () => {
    const f = open();
    f.type('Comprar pan integral');
    await f.save();

    choose(f, '.cancel');

    expect(choice(f)).toBeNull();
    expect(f.access.updateOccurrence).not.toHaveBeenCalled();
    expect(f.access.updateSeries).not.toHaveBeenCalled();
    expect(f.navigate).not.toHaveBeenCalled();
  });

  it('US-012-03 cambiar la regla (aquí, a «No se repite») afecta a toda la serie sin preguntar', async () => {
    const f = open();
    pickNone(f);

    await f.save();

    expect(choice(f)).toBeNull();
    expect(f.access.updateSeries).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({ recurrence: null })
    );
  });

  it('US-012-03 quitar la fecha de una ocurrencia también es de toda la serie', async () => {
    const f = open();
    f.button(f.copy.form.clearDate)?.click();
    f.detect();

    await f.save();

    expect(choice(f)).toBeNull();
    expect(f.access.updateSeries).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({ dueDate: null, recurrence: null })
    );
  });

  it('US-012-03 si no se cambia nada, no pregunta ni guarda: vuelve a la lista', async () => {
    const f = open();

    await f.save();

    expect(choice(f)).toBeNull();
    expect(f.access.updateOccurrence).not.toHaveBeenCalled();
    expect(f.access.updateSeries).not.toHaveBeenCalled();
    expect(f.navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-012-03 si falla guardar la ocurrencia, avisa y se queda en el formulario', async () => {
    const f = open();
    f.access.updateOccurrence.mockResolvedValue({ ok: false, reason: 'network' });
    f.type('Comprar pan integral');
    await f.save();

    choose(f, '.single');
    await flush();
    f.detect();

    expect(f.text()).toContain(f.copy.form.saveError);
    expect(f.navigate).not.toHaveBeenCalled();
  });

  it('US-012-03 borrar una ocurrencia abre la hoja de borrado en lugar de la confirmación simple', () => {
    const f = open();
    f.button(f.copy.form.delete)?.click();
    f.detect();

    expect(choice(f)).not.toBeNull();
    expect(f.text()).toContain('Las ocurrencias ya completadas se conservan');
    expect(f.text()).not.toContain(f.copy.form.deleteTitle);
  });

  it('US-012-03 «Solo esta» al borrar elimina la ocurrencia y vuelve a la lista', async () => {
    const f = open();
    f.button(f.copy.form.delete)?.click();
    f.detect();

    choose(f, '.single');
    await flush();

    expect(f.access.removeOccurrence).toHaveBeenCalledWith('abc');
    expect(f.access.removeSeries).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(f.navigate).toHaveBeenCalledWith(['/']));
  });

  it('US-012-03 «Toda la serie» al borrar elimina la serie y vuelve a la lista', async () => {
    const f = open();
    f.button(f.copy.form.delete)?.click();
    f.detect();

    choose(f, '.all');
    await flush();

    expect(f.access.removeSeries).toHaveBeenCalledWith('abc');
    await vi.waitFor(() => expect(f.navigate).toHaveBeenCalledWith(['/']));
  });

  it('US-012-03 «Volver atrás» al borrar no borra nada', () => {
    const f = open();
    f.button(f.copy.form.delete)?.click();
    f.detect();

    choose(f, '.cancel');

    expect(choice(f)).toBeNull();
    expect(f.access.removeOccurrence).not.toHaveBeenCalled();
    expect(f.access.removeSeries).not.toHaveBeenCalled();
  });

  it('US-012-03 si falla el borrado, avisa del error y se queda', async () => {
    const f = open();
    f.access.removeOccurrence.mockResolvedValue({ ok: false, reason: 'network' });
    f.button(f.copy.form.delete)?.click();
    f.detect();

    choose(f, '.single');
    await flush();
    f.detect();

    expect(f.text()).toContain(f.copy.form.deleteError);
    expect(f.navigate).not.toHaveBeenCalled();
  });

  it('US-012-03 una tarea suelta se borra con la confirmación de siempre, sin la hoja de serie', () => {
    const f = setup({ id: 'abc' });
    f.button(f.copy.form.delete)?.click();
    f.detect();

    expect(choice(f)).toBeNull();
    expect(f.text()).toContain(f.copy.form.deleteTitle);
  });
});
