import { TestBed } from '@angular/core/testing';
import { Task } from '../../core/models/task';
import { CLOCK } from '../../core/services/clock';
import { TasksConstructorService } from './tasks.constructor.service';

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

function setup(now: Date): TasksConstructorService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: () => now }] });
  return TestBed.inject(TasksConstructorService);
}

const NOON = new Date(2026, 10, 13, 12, 0, 0); // viernes 13 de noviembre de 2026

describe('TasksConstructorService · agrupado', () => {
  it('US-005-02 agrupa en Atrasadas, Hoy, Mañana, fechas posteriores y Sin fecha, en ese orden', () => {
    const s = setup(NOON);
    const { groups } = s.group([
      task({ dueDate: null }),
      task({ dueDate: '2026-11-20' }),
      task({ dueDate: '2026-11-14' }),
      task({ dueDate: '2026-11-13' }),
      task({ dueDate: '2026-11-12' }),
      task({ dueDate: '2026-11-18' }),
    ]);

    expect(groups.map((g) => g.kind)).toEqual([
      'overdue',
      'today',
      'tomorrow',
      'date',
      'date',
      'none',
    ]);
    expect(groups.map((g) => g.key)).toEqual([
      'overdue',
      'today',
      'tomorrow',
      '2026-11-18',
      '2026-11-20',
      'none',
    ]);
    expect(groups.map((g) => g.label).slice(0, 3)).toEqual(['Atrasadas', 'Hoy', 'Mañana']);
    expect(groups[5].label).toBe('Sin fecha');
  });

  it('US-005-02 omite los grupos vacíos', () => {
    const s = setup(NOON);
    expect(s.group([]).groups).toEqual([]);
    const { groups } = s.group([task({ dueDate: '2026-11-13' })]);
    expect(groups.map((g) => g.kind)).toEqual(['today']);
  });

  it('US-005-02 las fechas posteriores llevan etiqueta legible con el día de la semana', () => {
    const s = setup(NOON);
    const { groups } = s.group([task({ dueDate: '2026-11-19' })]);
    expect(groups[0].label).toBe('Jueves, 19 de noviembre');
  });

  it('US-005-02 hoy y mañana se calculan con la fecha local, también a las 23:59 y a las 00:01', () => {
    const late = setup(new Date(2026, 10, 13, 23, 59, 30));
    expect(late.group([task({ dueDate: '2026-11-13' })]).groups[0].kind).toBe('today');
    expect(late.group([task({ dueDate: '2026-11-14' })]).groups[0].kind).toBe('tomorrow');

    const early = setup(new Date(2026, 10, 14, 0, 1, 0));
    expect(early.group([task({ dueDate: '2026-11-13' })]).groups[0].kind).toBe('overdue');
    expect(early.group([task({ dueDate: '2026-11-14' })]).groups[0].kind).toBe('today');
  });

  it('US-005-02 «mañana» cruza fin de mes y de año', () => {
    const month = setup(new Date(2026, 10, 30, 10));
    expect(month.group([task({ dueDate: '2026-12-01' })]).groups[0].kind).toBe('tomorrow');
    const year = setup(new Date(2026, 11, 31, 10));
    expect(year.group([task({ dueDate: '2027-01-01' })]).groups[0].kind).toBe('tomorrow');
  });

  it('US-005-02 la hora no hace atrasada una tarea de hoy', () => {
    const s = setup(new Date(2026, 10, 13, 22, 0, 0));
    const { groups } = s.group([task({ dueDate: '2026-11-13', dueTime: '08:00' })]);
    expect(groups.map((g) => g.kind)).toEqual(['today']);
  });

  it('US-005-02 las completadas no entran en los grupos y van aparte', () => {
    const s = setup(NOON);
    const done = task({ dueDate: '2026-11-01', completedAt: '2026-11-12T09:00:00.000Z' });
    const { groups, completed } = s.group([done, task({ dueDate: '2026-11-13' })]);
    expect(groups.map((g) => g.kind)).toEqual(['today']);
    expect(completed).toEqual([done]);
  });
});

describe('TasksConstructorService · orden', () => {
  it('US-005-02 dentro del día, primero las que tienen hora (ascendente) y luego las que no, por creación', () => {
    const s = setup(NOON);
    const sinHoraB = task({ dueDate: '2026-11-13', createdAt: '2026-11-02T10:00:00.000Z' });
    const sinHoraA = task({ dueDate: '2026-11-13', createdAt: '2026-11-01T10:00:00.000Z' });
    const tarde = task({ dueDate: '2026-11-13', dueTime: '16:30' });
    const pronto = task({ dueDate: '2026-11-13', dueTime: '09:00' });

    const { groups } = s.group([sinHoraB, tarde, sinHoraA, pronto]);

    expect(groups[0].tasks).toEqual([pronto, tarde, sinHoraA, sinHoraB]);
  });

  it('US-005-02 en Atrasadas se ordena por día y luego como en cualquier día', () => {
    const s = setup(NOON);
    const viejo = task({ dueDate: '2026-11-01' });
    const reciente = task({ dueDate: '2026-11-12', dueTime: '09:00' });
    const { groups } = s.group([reciente, viejo]);
    expect(groups[0].tasks).toEqual([viejo, reciente]);
  });

  it('US-005-02 Sin fecha se ordena por creación', () => {
    const s = setup(NOON);
    const b = task({ createdAt: '2026-11-03T10:00:00.000Z' });
    const a = task({ createdAt: '2026-11-02T10:00:00.000Z' });
    expect(s.group([b, a]).groups[0].tasks).toEqual([a, b]);
  });

  it('US-005-02 las completadas van de la más reciente a la más antigua', () => {
    const s = setup(NOON);
    const antigua = task({ completedAt: '2026-11-01T10:00:00.000Z' });
    const reciente = task({ completedAt: '2026-11-12T10:00:00.000Z' });
    expect(s.group([antigua, reciente]).completed).toEqual([reciente, antigua]);
  });

  it('US-005-02 no modifica la lista recibida', () => {
    const s = setup(NOON);
    const input = [task({ dueDate: '2026-11-14' }), task({ dueDate: '2026-11-13' })];
    const copy = [...input];
    s.group(input);
    expect(input).toEqual(copy);
  });
});

describe('TasksConstructorService · etiquetas', () => {
  it('US-005-02 isOverdue solo con fecha anterior a hoy y sin completar', () => {
    const s = setup(NOON);
    expect(s.isOverdue(task({ dueDate: '2026-11-12' }))).toBe(true);
    expect(s.isOverdue(task({ dueDate: '2026-11-13' }))).toBe(false);
    expect(s.isOverdue(task({ dueDate: null }))).toBe(false);
    expect(
      s.isOverdue(task({ dueDate: '2026-11-01', completedAt: '2026-11-02T10:00:00.000Z' }))
    ).toBe(false);
  });

  it('US-005-02 todayDay y tomorrowDay dan los días locales de hoy y mañana', () => {
    const s = setup(new Date(2026, 10, 30, 23, 59));
    expect(s.todayDay()).toBe('2026-11-30');
    expect(s.tomorrowDay()).toBe('2026-12-01');
  });

  it('US-005-02 dayLabel da una etiqueta legible, con la primera letra en mayúscula', () => {
    const s = setup(NOON);
    expect(s.dayLabel('2026-11-24')).toBe('Martes, 24 de noviembre');
  });
});

describe('TasksConstructorService · textos', () => {
  const FORBIDDEN =
    /\bXP\b|racha|nivel|misi[óo]n|puntos|supabase|token|jwt|http|c[óo]digo de error|exception|\b(4|5)\d\d\b/i;

  function allTexts(s: TasksConstructorService): string[] {
    return [...Object.values(s.list), ...Object.values(s.form)];
  }

  it('US-005-02 define los textos de la lista y del formulario en español', () => {
    const s = setup(NOON);
    expect(s.list.title).toBe('Tareas');
    expect(s.list.newTask).toBe('Nueva tarea');
    expect(s.list.retry).toBe('Reintentar');
    expect(s.list.completedTitle).toBe('Completadas');
    expect(s.list.doneNotice).toBe('Tarea completada');
    expect(s.form.save).toBe('Guardar tarea');
    expect(s.form.deleteWarning).toContain('no se puede deshacer');
    expect(allTexts(s).every((t) => typeof t === 'string' && t.length > 0)).toBe(true);
  });

  it('US-005-02 ningún texto habla de XP, rachas, niveles ni términos técnicos', () => {
    const s = setup(NOON);
    for (const text of allTexts(s)) {
      expect(text, text).not.toMatch(FORBIDDEN);
    }
  });

  it('US-005-01 los mensajes de validación explican el motivo', () => {
    const s = setup(NOON);
    expect(s.form.titleRequired).toBe('Escribe un título para tu tarea.');
    expect(s.form.titleTooLong).toContain('120');
  });
});
