import { Recurrence } from '../models/recurrence';
import { firstOnOrAfter, isRecurrenceValid, nextAfter, occursOn } from './recurrence';

// 2026-11-16 es lunes.
function rule(over: Partial<Recurrence> = {}): Recurrence {
  return {
    kind: 'daily',
    interval: 1,
    weekdays: [],
    monthDay: null,
    startDate: '2026-11-16',
    until: null,
    ...over,
  };
}

const weekly = (weekdays: number[], interval = 1, over: Partial<Recurrence> = {}): Recurrence =>
  rule({ kind: 'weekly', weekdays, interval, ...over });
const monthly = (monthDay: number, over: Partial<Recurrence> = {}): Recurrence =>
  rule({ kind: 'monthly', monthDay, ...over });

describe('recurrence · isRecurrenceValid', () => {
  it('US-012-01 acepta una regla diaria y una semanal con días', () => {
    expect(isRecurrenceValid(rule())).toBe(true);
    expect(isRecurrenceValid(weekly([1, 4]))).toBe(true);
  });

  it('US-012-01 rechaza «días de la semana» sin ningún día o con días fuera de 1–7', () => {
    expect(isRecurrenceValid(weekly([]))).toBe(false);
    expect(isRecurrenceValid(weekly([0]))).toBe(false);
    expect(isRecurrenceValid(weekly([8]))).toBe(false);
    expect(isRecurrenceValid(weekly([1, 1]))).toBe(false);
  });

  it('US-012-05 rechaza intervalos fuera de 1–30', () => {
    expect(isRecurrenceValid(rule({ interval: 0 }))).toBe(false);
    expect(isRecurrenceValid(rule({ interval: 31 }))).toBe(false);
    expect(isRecurrenceValid(rule({ interval: 30 }))).toBe(true);
    expect(isRecurrenceValid(rule({ interval: 1.5 }))).toBe(false);
  });

  it('US-012-05 el día del mes va de 1 a 31 y el intervalo mensual es 1', () => {
    expect(isRecurrenceValid(monthly(31))).toBe(true);
    expect(isRecurrenceValid(monthly(1))).toBe(true);
    expect(isRecurrenceValid(monthly(0))).toBe(false);
    expect(isRecurrenceValid(monthly(32))).toBe(false);
    expect(isRecurrenceValid(rule({ kind: 'monthly', monthDay: null }))).toBe(false);
    expect(isRecurrenceValid(monthly(15, { interval: 2 }))).toBe(false);
  });

  it('US-012-01 los campos de otro tipo deben estar vacíos', () => {
    expect(isRecurrenceValid(rule({ weekdays: [1] }))).toBe(false);
    expect(isRecurrenceValid(rule({ monthDay: 5 }))).toBe(false);
    expect(isRecurrenceValid(weekly([1], 1, { monthDay: 5 }))).toBe(false);
  });

  it('US-012-06 la fecha de fin no puede ser anterior al inicio (el mismo día vale)', () => {
    expect(isRecurrenceValid(rule({ until: '2026-11-15' }))).toBe(false);
    expect(isRecurrenceValid(rule({ until: '2026-11-16' }))).toBe(true);
    expect(isRecurrenceValid(rule({ until: '2027-01-01' }))).toBe(true);
  });
});

describe('recurrence · occursOn', () => {
  it('US-012-01 «todos los días» cae cada día desde el inicio y nunca antes', () => {
    const r = rule();
    expect(occursOn(r, '2026-11-16')).toBe(true);
    expect(occursOn(r, '2026-11-17')).toBe(true);
    expect(occursOn(r, '2026-11-15')).toBe(false);
  });

  it('US-012-05 «cada N días» cuenta desde el inicio', () => {
    const r = rule({ interval: 3 });
    expect(occursOn(r, '2026-11-16')).toBe(true);
    expect(occursOn(r, '2026-11-17')).toBe(false);
    expect(occursOn(r, '2026-11-19')).toBe(true);
    expect(occursOn(r, '2026-11-22')).toBe(true);
  });

  it('US-012-01 «días de la semana» solo cae en los días marcados', () => {
    const r = weekly([1, 4]); // lunes y jueves
    expect(occursOn(r, '2026-11-16')).toBe(true);
    expect(occursOn(r, '2026-11-17')).toBe(false);
    expect(occursOn(r, '2026-11-19')).toBe(true);
    expect(occursOn(r, '2026-11-22')).toBe(false); // domingo
    expect(occursOn(r, '2026-11-23')).toBe(true);
  });

  it('US-012-05 «cada 2 semanas» alterna semanas a partir de la del inicio', () => {
    const r = weekly([5], 2); // viernes, cada 2 semanas; semana de inicio: 16–22 nov
    expect(occursOn(r, '2026-11-20')).toBe(true);
    expect(occursOn(r, '2026-11-27')).toBe(false);
    expect(occursOn(r, '2026-12-04')).toBe(true);
    expect(occursOn(r, '2026-12-11')).toBe(false);
  });

  it('US-012-05 la semana empieza en lunes: un domingo pertenece a la semana anterior', () => {
    const r = weekly([7], 2, { startDate: '2026-11-16' }); // domingos, cada 2 semanas
    expect(occursOn(r, '2026-11-22')).toBe(true); // domingo de la semana de inicio
    expect(occursOn(r, '2026-11-29')).toBe(false);
    expect(occursOn(r, '2026-12-06')).toBe(true);
  });

  it('US-012-05 «día del mes» cae ese día y, si el mes no lo tiene, el último', () => {
    const r = monthly(31, { startDate: '2026-01-01' });
    expect(occursOn(r, '2026-01-31')).toBe(true);
    expect(occursOn(r, '2026-04-30')).toBe(true); // abril tiene 30
    expect(occursOn(r, '2026-04-29')).toBe(false);
    expect(occursOn(r, '2026-02-28')).toBe(true);
    expect(occursOn(r, '2028-02-29')).toBe(true); // bisiesto
    expect(occursOn(r, '2028-02-28')).toBe(false);
  });

  it('US-012-05 «día 15» solo cae el 15', () => {
    const r = monthly(15, { startDate: '2026-01-01' });
    expect(occursOn(r, '2026-11-15')).toBe(true);
    expect(occursOn(r, '2026-11-14')).toBe(false);
  });

  it('US-012-05 los cambios de hora no desplazan los días', () => {
    const daily = rule({ startDate: '2026-03-27' });
    expect(occursOn(daily, '2026-03-29')).toBe(true);
    expect(occursOn(daily, '2026-03-30')).toBe(true);
    const everyTwo = rule({ startDate: '2026-10-24', interval: 2 });
    expect(occursOn(everyTwo, '2026-10-26')).toBe(true);
    expect(occursOn(everyTwo, '2026-10-25')).toBe(false);
  });
});

describe('recurrence · firstOnOrAfter', () => {
  it('US-012-01 si el propio día cumple la regla, es ese día', () => {
    expect(firstOnOrAfter(weekly([1, 4]), '2026-11-16')).toBe('2026-11-16');
  });

  it('US-012-01 si no, el primer día válido siguiente', () => {
    expect(firstOnOrAfter(weekly([1, 4]), '2026-11-17')).toBe('2026-11-19');
    expect(firstOnOrAfter(weekly([1, 4]), '2026-11-20')).toBe('2026-11-23');
  });

  it('US-012-01 nunca devuelve un día anterior al inicio', () => {
    expect(firstOnOrAfter(rule(), '2026-11-01')).toBe('2026-11-16');
  });

  it('US-012-06 la fecha de fin se incluye y lo posterior no existe', () => {
    const r = rule({ until: '2026-11-18' });
    expect(firstOnOrAfter(r, '2026-11-18')).toBe('2026-11-18');
    expect(firstOnOrAfter(r, '2026-11-19')).toBeNull();
  });

  it('US-012-05 encuentra «cada 30 semanas» dentro del límite de búsqueda', () => {
    const r = weekly([1], 30, { startDate: '2026-11-16' });
    expect(firstOnOrAfter(r, '2026-11-17')).toBe('2027-06-14');
  });

  it('US-012-05 «día 31» en una búsqueda que empieza en abril cae el 30', () => {
    const r = monthly(31, { startDate: '2026-01-01' });
    expect(firstOnOrAfter(r, '2026-04-15')).toBe('2026-04-30');
  });

  it('US-012-01 una regla inválida no tiene ocurrencias', () => {
    expect(firstOnOrAfter(weekly([]), '2026-11-16')).toBeNull();
  });
});

describe('recurrence · nextAfter', () => {
  it('US-012-02 la siguiente es posterior a la ocurrencia completada', () => {
    expect(nextAfter(rule(), '2026-11-16', '2026-11-16')).toBe('2026-11-17');
    expect(nextAfter(weekly([1, 4]), '2026-11-16', '2026-11-16')).toBe('2026-11-19');
  });

  it('US-012-02 una ocurrencia atrasada no crea la siguiente en el pasado: desde hoy', () => {
    expect(nextAfter(rule(), '2026-11-16', '2026-11-20')).toBe('2026-11-20');
    expect(nextAfter(weekly([1, 4]), '2026-11-16', '2026-11-20')).toBe('2026-11-23');
  });

  it('US-012-02 si hoy cumple la regla y la atrasada era anterior, la siguiente es hoy', () => {
    expect(nextAfter(weekly([1, 4]), '2026-11-16', '2026-11-19')).toBe('2026-11-19');
  });

  it('US-012-06 al completar la última ocurrencia no hay siguiente', () => {
    const r = rule({ until: '2026-11-17' });
    expect(nextAfter(r, '2026-11-17', '2026-11-17')).toBeNull();
    expect(nextAfter(r, '2026-11-16', '2026-11-16')).toBe('2026-11-17');
  });

  it('US-012-05 «día del mes» salta al mes siguiente', () => {
    const r = monthly(15, { startDate: '2026-01-01' });
    expect(nextAfter(r, '2026-11-15', '2026-11-15')).toBe('2026-12-15');
  });

  it('US-012-02 una ocurrencia pospuesta se calcula desde su fecha original', () => {
    // Prevista el lunes 16, pospuesta y completada el jueves 19: la siguiente es el lunes 23.
    expect(nextAfter(weekly([1]), '2026-11-16', '2026-11-19')).toBe('2026-11-23');
  });
});
