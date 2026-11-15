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
  it('US-012-01 ofrece las seis frecuencias, de «No se repite» a «Un día del mes»', () => {
    const { frequencies } = service();
    expect(frequencies.map((f) => f.value)).toEqual([
      'none',
      'daily',
      'weekdays',
      'ndays',
      'nweeks',
      'monthly',
    ]);
    expect(frequencies.map((f) => f.label)).toEqual([
      'No se repite',
      'Todos los días',
      'Días de la semana',
      'Cada N días',
      'Cada N semanas',
      'Un día del mes',
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

describe('RecurrenceConstructorService · describe de intervalos, mes y fin (US-012-04)', () => {
  it('US-012-04 «cada N días» lo dice con el número', () => {
    expect(service().describe(rule({ interval: 3 }))).toBe('Cada 3 días');
    expect(service().describe(rule({ interval: 30 }))).toBe('Cada 30 días');
  });

  it('US-012-04 «cada N semanas» nombra los días en minúscula', () => {
    expect(service().describe(rule({ kind: 'weekly', interval: 2, weekdays: [5] }))).toBe(
      'Cada 2 semanas: vie'
    );
    expect(service().describe(rule({ kind: 'weekly', interval: 2, weekdays: [1, 4] }))).toBe(
      'Cada 2 semanas: lun, jue'
    );
  });

  it('US-012-04 un día del mes dice «El día N de cada mes»', () => {
    expect(service().describe(rule({ kind: 'monthly', monthDay: 15 }))).toBe(
      'El día 15 de cada mes'
    );
    expect(service().describe(rule({ kind: 'monthly', monthDay: 31 }))).toBe(
      'El día 31 de cada mes'
    );
  });

  it('US-012-06 con fecha de fin añade «hasta» y el día', () => {
    expect(service().describe(rule({ until: '2026-12-30' }))).toBe('Todos los días · hasta 30 dic');
    expect(
      service().describe(rule({ kind: 'weekly', weekdays: [1, 4], until: '2027-06-05' }))
    ).toBe('Lun, jue · hasta 5 jun');
  });
});

describe('RecurrenceConstructorService · intervalos y día del mes (US-012-05)', () => {
  it('US-012-05 una regla diaria con intervalo da «Cada N días» y una semanal con intervalo «Cada N semanas»', () => {
    const s = service();
    expect(s.draftFrom(rule({ interval: 3 }), START)).toMatchObject({
      option: 'ndays',
      interval: 3,
    });
    const weeks = s.draftFrom(rule({ kind: 'weekly', interval: 2, weekdays: [5] }), START);
    expect(weeks).toMatchObject({ option: 'nweeks', interval: 2, weekdays: [5] });
  });

  it('US-012-05 una regla mensual da «Un día del mes» con su día', () => {
    expect(service().draftFrom(rule({ kind: 'monthly', monthDay: 15 }), START)).toMatchObject({
      option: 'monthly',
      monthDay: 15,
    });
  });

  it('US-012-05 «Cada N días» produce una regla diaria con ese intervalo', () => {
    expect(service().toRule(draft({ option: 'ndays', interval: 3 }), START)).toEqual(
      rule({ interval: 3 })
    );
  });

  it('US-012-05 «Cada N semanas» produce una regla semanal con intervalo y días ordenados', () => {
    expect(
      service().toRule(draft({ option: 'nweeks', interval: 2, weekdays: [5, 1] }), START)
    ).toEqual(rule({ kind: 'weekly', interval: 2, weekdays: [1, 5] }));
  });

  it('US-012-05 «Un día del mes» produce una regla mensual', () => {
    expect(service().toRule(draft({ option: 'monthly', monthDay: 31 }), START)).toEqual(
      rule({ kind: 'monthly', monthDay: 31 })
    );
  });

  it('US-012-05 «Cada N semanas» también pide al menos un día', () => {
    expect(service().problem(draft({ option: 'nweeks', interval: 2, weekdays: [] }), START)).toBe(
      'Elige al menos un día'
    );
  });

  it('US-012-05 avisa de que en los meses cortos será el último día del mes', () => {
    const s = service();
    expect(s.monthHint(draft({ option: 'monthly', monthDay: 31 }))).toBe(
      'En los meses que no tengan ese día, será el último día del mes.'
    );
    expect(s.monthHint(draft({ option: 'monthly', monthDay: 29 }))).not.toBeNull();
    expect(s.monthHint(draft({ option: 'monthly', monthDay: 28 }))).toBeNull();
    expect(s.monthHint(draft({ option: 'daily' }))).toBeNull();
  });

  it('US-012-05 el resumen cubre cada N días, cada N semanas y el día del mes', () => {
    const s = service();
    expect(s.summary(draft({ option: 'ndays', interval: 3 }), START, TODAY)?.rule).toBe(
      'Se repetirá cada 3 días'
    );
    expect(
      s.summary(draft({ option: 'nweeks', interval: 2, weekdays: [5] }), START, TODAY)?.rule
    ).toBe('Se repetirá cada 2 semanas, los viernes');
    expect(s.summary(draft({ option: 'monthly', monthDay: 15 }), START, TODAY)?.rule).toBe(
      'Se repetirá el día 15 de cada mes'
    );
  });

  it('US-012-05 la primera ocurrencia de «día del mes» es el siguiente día válido', () => {
    expect(service().summary(draft({ option: 'monthly', monthDay: 20 }), START, TODAY)?.first).toBe(
      'Primera ocurrencia: viernes 20 de noviembre'
    );
  });
});

describe('RecurrenceConstructorService · fin de la repetición (US-012-06)', () => {
  it('US-012-06 por defecto no termina (Nunca)', () => {
    expect(service().draftFrom(null, START).until).toBeNull();
  });

  it('US-012-06 una fecha de fin anterior a la primera ocurrencia es un error', () => {
    expect(service().problem(draft({ option: 'daily', until: '2026-11-15' }), START)).toBe(
      'La fecha de fin no puede ser anterior a la primera ocurrencia'
    );
  });

  it('US-012-06 el mismo día de la primera ocurrencia vale', () => {
    expect(service().problem(draft({ option: 'daily', until: START }), START)).toBeNull();
  });

  it('US-012-06 una fecha posterior es válida y viaja en la regla', () => {
    const d = draft({ option: 'daily', until: '2027-01-31' });
    expect(service().problem(d, START)).toBeNull();
    expect(service().toRule(d, START)?.until).toBe('2027-01-31');
  });

  it('US-012-06 la primera ocurrencia es la de la regla: con «días de la semana» se compara con ella', () => {
    // 16 de noviembre es lunes; la primera ocurrencia en jueves es el 19.
    const d = draft({ option: 'weekdays', weekdays: [4], until: '2026-11-18' });
    expect(service().problem(d, START)).toBe(
      'La fecha de fin no puede ser anterior a la primera ocurrencia'
    );
  });

  it('US-012-06 el resumen añade la fecha de fin', () => {
    expect(
      service().summary(draft({ option: 'daily', until: '2026-12-30' }), START, TODAY)?.rule
    ).toBe('Se repetirá todos los días, hasta el 30 de diciembre');
  });
});

describe('RecurrenceConstructorService · plural de los días en el resumen', () => {
  it('US-012-01 el resumen pone en plural sábado y domingo (los sábados y domingos)', () => {
    const d = draft({ option: 'weekdays', weekdays: [6, 7] });
    expect(service().summary(d, '2026-11-14', TODAY)?.rule).toBe(
      'Se repetirá los sábados y domingos'
    );
  });

  it('US-012-01 los días que ya acaban en «s» no cambian (lunes, miércoles)', () => {
    const d = draft({ option: 'weekdays', weekdays: [1, 3] });
    expect(service().summary(d, START, TODAY)?.rule).toBe('Se repetirá los lunes y miércoles');
  });
});
