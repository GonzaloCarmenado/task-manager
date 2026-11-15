const pad = (n: number): string => String(n).padStart(2, '0');

/** Día local `YYYY-MM-DD`. Nunca `toISOString()`: usa UTC y desfasa un día. */
export function toLocalDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Mediodía local del día indicado (evita saltos por cambios de hora). */
export function parseLocalDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(day: string, days: number): string {
  const d = parseLocalDay(day);
  d.setDate(d.getDate() + days);
  return toLocalDay(d);
}

/** `HH:MM:SS` → `HH:MM`. */
export function formatTime(time: string | null): string | null {
  return time === null ? null : time.slice(0, 5);
}

/** Días naturales de `from` a `to` (negativo si `to` es anterior). Con `Date.UTC`: inmune al cambio de hora. */
export function daysBetween(from: string, to: string): number {
  const utc = (day: string): number => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** Días que tiene el mes del día indicado (28 a 31). */
export function daysInMonth(day: string): number {
  const [y, m] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Día de la semana: 1 = lunes … 7 = domingo. */
export function weekdayOf(day: string): number {
  return ((parseLocalDay(day).getDay() + 6) % 7) + 1;
}
