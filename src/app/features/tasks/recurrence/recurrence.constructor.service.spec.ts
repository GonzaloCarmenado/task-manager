import { TestBed } from '@angular/core/testing';
import { Recurrence } from '../../../core/models/recurrence';
import { RecurrenceConstructorService, RecurrenceDraft } from './recurrence.constructor.service';

// 2026-11-16 es lunes; 2026-11-19, jueves.
const START = '2026-11-16';
const TODAY = '2026-11-14';

function service(): RecurrenceConstructorService {
  TestBed.resetTestingModule();
  return TestBed.inject(RecurrenceConstructorService);
}

const draft = (over: Partial<RecurrenceDraft> = {}): RecurrenceDraft => ({
  option: 'daily',
  interval: 1,
  weekdays: [1],
  monthDay: 16,
  until: null,
  ...over,
});

const rule = (over: Partial<Recurrence> = {}): Recurrence => ({
  kind: 'daily',
  interval: 1,
  weekdays: [],
  monthDay: null,
  startDate: START,
  until: null,
  ...over,
});

describe('RecurrenceConstructorService · opciones', () => {
  it('US-012-01 ofrece «No se repite», «Todos los días» y «Días de la semana»', () => {
    const { frequencies } = service();
    expect(frequencies.map((f) => f.value)).toEqual(['none', 'daily', 'weekdays']);
    expect(frequencies.map((f) => f.label)).toEqual([
      'No se repite',
      'Todos los días',
      'Días de la semana',
    ]);
  });

  it('US-012-01 los siete días van de lunes (1) a domingo (7) con letras L M X J V S D', () => {
    const { days } = service();
    expect(days.map((d) => d.value)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(days.map((d) => d.letter)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
    expect(days[2].name).toBe('miércoles');
  });
});

describe('RecurrenceConstructorService · borrador y regla', () => {
  it('US-012-01 sin regla, el borrador es «No se repite» con el día de la fecha marcado', () => {
    const s = service();
    expect(s.draftFrom(null, START)).toEqual({
      option: 'none',
      interval: 1,
      weekdays: [1],
      monthDay: 16,
      until: null,
    });
  });

  it('US-012-01 una regla diaria da un borrador «Todos los días»', () => {
    expect(service().draftFrom(rule(), START).option).toBe('daily');
  });

  it('US-012-01 una regla semanal cada semana da un borrador «Días de la semana» con sus días', () => {
    const d = service().draftFrom(rule({ kind: 'weekly', weekdays: [1, 4] }), START);
    expect(d.option).toBe('weekdays');
    expect(d.weekdays).toEqual([1, 4]);
  });

  it('US-012-01 «No se repite» no produce regla', () => {
    expect(service().toRule(draft({ option: 'none' }), START)).toBeNull();
  });

  it('US-012-01 «Todos los días» produce una regla diaria que empieza en la fecha', () => {
    expect(service().toRule(draft({ option: 'daily' }), START)).toEqual(rule());
  });

  it('US-012-01 «Días de la semana» produce una regla semanal con los días ordenados', () => {
    expect(service().toRule(draft({ option: 'weekdays', weekdays: [4, 1] }), START)).toEqual(
      rule({ kind: 'weekly', weekdays: [1, 4] })
    );
  });
});

describe('RecurrenceConstructorService · validación', () => {
  it('US-012-01 «Días de la semana» sin ningún día pide elegir al menos uno', () => {
    expect(service().problem(draft({ option: 'weekdays', weekdays: [] }), START)).toBe(
      'Elige al menos un día'
    );
  });

  it('US-012-01 con un día o con «Todos los días» no hay problema', () => {
    const s = service();
    expect(s.problem(draft({ option: 'weekdays', weekdays: [3] }), START)).toBeNull();
    expect(s.problem(draft({ option: 'daily' }), START)).toBeNull();
    expect(s.problem(draft({ option: 'none' }), START)).toBeNull();
  });
});

describe('RecurrenceConstructorService · textos de la regla', () => {
  it('US-012-01 describe «Todos los días»', () => {
    expect(service().describe(rule())).toBe('Todos los días');
  });

  it('US-012-01 describe los días de la semana con tres letras', () => {
    expect(service().describe(rule({ kind: 'weekly', weekdays: [1, 4] }))).toBe('Lun, jue');
    expect(service().describe(rule({ kind: 'weekly', weekdays: [3] }))).toBe('Mié');
  });

  it('US-012-01 los siete días de la semana equivalen a «Todos los días»', () => {
    expect(service().describe(rule({ kind: 'weekly', weekdays: [1, 2, 3, 4, 5, 6, 7] }))).toBe(
      'Todos los días'
    );
  });
});

describe('RecurrenceConstructorService · resumen y primera ocurrencia', () => {
  it('US-012-01 resume «todos los días» y la primera ocurrencia es la fecha del formulario', () => {
    expect(service().summary(draft({ option: 'daily' }), START, TODAY)).toEqual({
      rule: 'Se repetirá todos los días',
      first: 'Primera ocurrencia: lunes 16 de noviembre',
    });
  });

  it('US-012-01 resume los días en lenguaje natural', () => {
    expect(
      service().summary(draft({ option: 'weekdays', weekdays: [1, 3, 5] }), START, TODAY)?.rule
    ).toBe('Se repetirá los lunes, miércoles y viernes');
    expect(
      service().summary(draft({ option: 'weekdays', weekdays: [4] }), START, TODAY)?.rule
    ).toBe('Se repetirá los jueves');
  });

  it('US-012-01 si la fecha no cae en un día marcado, la primera ocurrencia es el siguiente válido', () => {
    expect(
      service().summary(draft({ option: 'weekdays', weekdays: [4] }), START, TODAY)?.first
    ).toBe('Primera ocurrencia: jueves 19 de noviembre');
  });

  it('US-012-01 sin repetición o con borrador inválido no hay resumen', () => {
    const s = service();
    expect(s.summary(draft({ option: 'none' }), START, TODAY)).toBeNull();
    expect(s.summary(draft({ option: 'weekdays', weekdays: [] }), START, TODAY)).toBeNull();
  });
});
