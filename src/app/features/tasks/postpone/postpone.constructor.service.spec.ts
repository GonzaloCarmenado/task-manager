import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Task } from '../../../core/models/task';
import { CLOCK } from '../../../core/services/clock';
import { PostponeChoice, PostponeConstructorService } from './postpone.constructor.service';

// Sábado 14 de noviembre de 2026, 10:00.
const SAT = new Date(2026, 10, 14, 10, 0, 45);

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Llamar',
    dueDate: '2026-11-14',
    dueTime: '09:00',
    completedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    postponedCount: 0,
    seriesId: null,
    seriesDate: null,
    ...over,
  };
}

function setup(): PostponeConstructorService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: CLOCK, useValue: () => SAT }] });
  return TestBed.inject(PostponeConstructorService);
}

const pick = (choices: PostponeChoice[], option: string) =>
  choices.find((c) => c.option === option);

describe('PostponeConstructorService · opciones', () => {
  it('US-007-01 mañana y la semana que viene desde hoy conservan la hora', () => {
    const s = setup();
    const c = s.choices(task(), SAT);
    expect(pick(c, 'tomorrow')?.target).toEqual({ dueDate: '2026-11-15', dueTime: '09:00' });
    expect(pick(c, 'next-week')?.target).toEqual({ dueDate: '2026-11-16', dueTime: '09:00' });
  });

  it('US-007-01 una tarea atrasada se pospone desde hoy, no desde su fecha antigua', () => {
    const s = setup();
    const c = s.choices(task({ dueDate: '2026-11-01', dueTime: null }), SAT);
    expect(pick(c, 'tomorrow')?.target).toEqual({ dueDate: '2026-11-15', dueTime: null });
  });

  it('US-007-01 una tarea sin fecha ve mañana y la semana que viene, sin más tarde hoy', () => {
    const s = setup();
    const c = s.choices(task({ dueDate: null, dueTime: null }), SAT);
    expect(c.map((x) => x.option)).toEqual(['tomorrow', 'next-week']);
  });

  it('US-007-01 si hoy es lunes, la semana que viene es dentro de 7 días', () => {
    const s = setup();
    const monday = new Date(2026, 10, 16, 8, 0);
    const c = s.choices(task({ dueDate: '2026-11-16' }), monday);
    expect(pick(c, 'next-week')?.target.dueDate).toBe('2026-11-23');
  });

  it('US-007-01 funciona en fin de mes y de año', () => {
    const s = setup();
    const dec = new Date(2026, 11, 31, 8, 0); // jueves
    const c = s.choices(task({ dueDate: '2026-12-31' }), dec);
    expect(pick(c, 'tomorrow')?.target.dueDate).toBe('2027-01-01');
    expect(pick(c, 'next-week')?.target.dueDate).toBe('2027-01-04');
  });

  it('US-007-01 el cambio de hora de octubre no desplaza el día', () => {
    const s = setup();
    const before = new Date(2026, 9, 24, 12, 0);
    const c = s.choices(task({ dueDate: '2026-10-24', dueTime: null }), before);
    expect(pick(c, 'tomorrow')?.target.dueDate).toBe('2026-10-25');
    expect(pick(c, 'next-week')?.target.dueDate).toBe('2026-10-26');
  });

  it('US-007-01 más tarde hoy: una hora desde ahora, sin segundos, y lo dice en el detalle', () => {
    const s = setup();
    const later = pick(s.choices(task(), SAT), 'later-today');
    expect(later?.target).toEqual({ dueDate: '2026-11-14', dueTime: '11:00' });
    expect(later?.label).toBe('Más tarde hoy');
    expect(later?.detail).toBe('hoy a las 11:00');
  });

  it('US-007-01 más tarde hoy desde una tarea atrasada con hora usa ahora', () => {
    const s = setup();
    const overdue = task({ dueDate: '2026-11-10', dueTime: '08:00' });
    const later = pick(s.choices(overdue, SAT), 'later-today');
    expect(later?.target).toEqual({ dueDate: '2026-11-14', dueTime: '11:00' });
  });

  it('US-007-01 más tarde hoy cruza la medianoche y cambia de día', () => {
    const s = setup();
    const night = new Date(2026, 10, 14, 23, 20);
    const later = pick(s.choices(task({ dueTime: '22:00' }), night), 'later-today');
    expect(later?.target).toEqual({ dueDate: '2026-11-15', dueTime: '00:20' });
    expect(later?.detail).toBe('mañana a las 00:20');
  });

  it('US-007-01 más tarde hoy no se ofrece sin hora ni con fecha futura', () => {
    const s = setup();
    expect(pick(s.choices(task({ dueTime: null }), SAT), 'later-today')).toBeUndefined();
    expect(pick(s.choices(task({ dueDate: '2026-11-15' }), SAT), 'later-today')).toBeUndefined();
  });

  it('US-007-01 más tarde hoy se oculta si no es posterior a la hora de la tarea', () => {
    const s = setup();
    expect(pick(s.choices(task({ dueTime: '18:00' }), SAT), 'later-today')).toBeUndefined();
  });

  it('US-007-01 se ocultan las opciones que no posponen: una tarea de mañana no ofrece Mañana', () => {
    const s = setup();
    const c = s.choices(task({ dueDate: '2026-11-15', dueTime: null }), SAT);
    expect(c.map((x) => x.option)).toEqual(['next-week']);
  });

  it('US-007-01 una tarea sin hora compara solo la fecha', () => {
    const s = setup();
    const c = s.choices(task({ dueDate: '2026-11-16', dueTime: null }), SAT);
    expect(c.map((x) => x.option)).toEqual([]);
  });

  it('US-007-01 con una tarea lejana no queda ninguna opción rápida', () => {
    const s = setup();
    expect(s.choices(task({ dueDate: '2026-11-30', dueTime: null }), SAT)).toEqual([]);
  });

  it('US-007-01 el detalle lleva la fecha legible y la hora si la hay', () => {
    const s = setup();
    const c = s.choices(task({ dueTime: '09:00' }), SAT);
    expect(pick(c, 'tomorrow')?.detail).toBe('Domingo, 15 de noviembre · a las 09:00');
    const sinHora = s.choices(task({ dueDate: null, dueTime: null }), SAT);
    expect(pick(sinHora, 'tomorrow')?.detail).toBe('Domingo, 15 de noviembre');
  });
});

describe('PostponeConstructorService · elegir fecha y contador', () => {
  it('US-007-01 el mínimo es hoy si está atrasada o sin fecha', () => {
    const s = setup();
    expect(s.customMin(task({ dueDate: '2026-11-01' }), SAT)).toBe('2026-11-14');
    expect(s.customMin(task({ dueDate: null, dueTime: null }), SAT)).toBe('2026-11-14');
  });

  it('US-007-01 el mínimo es el día siguiente a su fecha si es de hoy o futura', () => {
    const s = setup();
    expect(s.customMin(task({ dueDate: '2026-11-14' }), SAT)).toBe('2026-11-15');
    expect(s.customMin(task({ dueDate: '2026-11-20' }), SAT)).toBe('2026-11-21');
  });

  it('US-007-01 customTarget conserva la hora y rechaza fechas no posteriores', () => {
    const s = setup();
    const t = task({ dueDate: '2026-11-14', dueTime: '09:00' });
    expect(s.customTarget(t, '2026-11-20', SAT)).toEqual({
      dueDate: '2026-11-20',
      dueTime: '09:00',
    });
    expect(s.customTarget(t, '2026-11-14', SAT)).toBeNull();
    expect(s.customTarget(t, '2026-11-10', SAT)).toBeNull();
    expect(s.customTarget(t, '', SAT)).toBeNull();
  });

  it('US-007-02 solo cuenta como pospuesta si ya tenía fecha', () => {
    const s = setup();
    const target = { dueDate: '2026-11-15', dueTime: null };
    expect(s.countsAsPostponed(task({ dueDate: '2026-11-14', dueTime: null }), target)).toBe(true);
    expect(s.countsAsPostponed(task({ dueDate: null, dueTime: null }), target)).toBe(false);
  });

  it('US-007-02 no cuenta si el destino no es posterior', () => {
    const s = setup();
    const t = task({ dueDate: '2026-11-15', dueTime: null });
    expect(s.countsAsPostponed(t, { dueDate: '2026-11-15', dueTime: null })).toBe(false);
    expect(s.countsAsPostponed(t, { dueDate: '2026-11-10', dueTime: null })).toBe(false);
  });
});

describe('PostponeConstructorService · textos', () => {
  it('US-007-01 el aviso nombra el destino sin términos técnicos', () => {
    const s = setup();
    expect(s.noticeText({ dueDate: '2026-11-15', dueTime: '16:30' }, SAT)).toBe(
      'Tarea pospuesta a Mañana a las 16:30'
    );
    expect(s.noticeText({ dueDate: '2026-11-15', dueTime: null }, SAT)).toBe(
      'Tarea pospuesta a Mañana'
    );
    expect(s.noticeText({ dueDate: '2026-11-14', dueTime: '11:00' }, SAT)).toBe(
      'Tarea pospuesta a las 11:00'
    );
    expect(s.noticeText({ dueDate: '2026-11-23', dueTime: '09:00' }, SAT)).toBe(
      'Tarea pospuesta al lunes, 23 de noviembre a las 09:00'
    );
  });

  it('US-007-01 los textos de la hoja y del error son los acordados', () => {
    const s = setup();
    expect(s.sheet.title).toBe('Posponer tarea');
    expect(s.sheet.custom).toBe('Elegir fecha');
    expect(s.sheet.action).toBe('Posponer');
    expect(s.failNotice).toBe('No se pudo posponer la tarea. Inténtalo de nuevo.');
  });
});
