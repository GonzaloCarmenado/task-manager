import {
  addDays,
  daysBetween,
  daysInMonth,
  formatTime,
  parseLocalDay,
  toLocalDay,
  weekdayOf,
} from './local-date';

describe('local-date', () => {
  it('US-005-02 toLocalDay usa la fecha local, también cerca de la medianoche', () => {
    expect(toLocalDay(new Date(2026, 10, 13, 23, 59, 59))).toBe('2026-11-13');
    expect(toLocalDay(new Date(2026, 10, 14, 0, 0, 1))).toBe('2026-11-14');
  });

  it('US-005-02 toLocalDay rellena mes y día con ceros', () => {
    expect(toLocalDay(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('US-005-02 addDays cruza fin de mes y de año', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('US-005-02 addDays no depende del cambio de hora (verano e invierno)', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('US-005-02 parseLocalDay devuelve el mediodía local de ese día', () => {
    const d = parseLocalDay('2026-11-13');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(12);
  });

  it('US-005-02 formatTime recorta los segundos', () => {
    expect(formatTime('09:30:00')).toBe('09:30');
    expect(formatTime('16:05')).toBe('16:05');
    expect(formatTime(null)).toBeNull();
  });

  it('US-012-05 daysBetween cuenta días naturales, también con cambio de hora', () => {
    expect(daysBetween('2026-11-15', '2026-11-15')).toBe(0);
    expect(daysBetween('2026-11-15', '2026-11-20')).toBe(5);
    expect(daysBetween('2026-11-20', '2026-11-15')).toBe(-5);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('US-012-05 daysInMonth respeta los meses cortos y los años bisiestos', () => {
    expect(daysInMonth('2026-01-10')).toBe(31);
    expect(daysInMonth('2026-04-10')).toBe(30);
    expect(daysInMonth('2026-02-10')).toBe(28);
    expect(daysInMonth('2028-02-10')).toBe(29);
    expect(daysInMonth('2100-02-10')).toBe(28);
    expect(daysInMonth('2000-02-10')).toBe(29);
  });

  it('US-012-01 weekdayOf numera de lunes (1) a domingo (7)', () => {
    expect(weekdayOf('2026-11-16')).toBe(1);
    expect(weekdayOf('2026-11-19')).toBe(4);
    expect(weekdayOf('2026-11-21')).toBe(6);
    expect(weekdayOf('2026-11-22')).toBe(7);
  });
});
