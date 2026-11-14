import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlarmPermission } from '../../../core/models/alarm';
import { Task, TaskInput } from '../../../core/models/task';
import { CLOCK } from '../../../core/services/clock';
import { AlarmsAccessService } from '../alarms/alarms.access.service';
import { TaskOpResult, TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';
import { TaskForm } from './task-form';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const EXISTING: Task = {
  id: 'abc',
  title: 'Comprar pan',
  dueDate: '2026-11-13',
  dueTime: '09:30',
  completedAt: null,
  createdAt: '2026-11-01T10:00:00.000Z',
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function setup(
  options: { id?: string; existing?: Task | null; lateLoad?: boolean; askPermission?: boolean } = {}
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
