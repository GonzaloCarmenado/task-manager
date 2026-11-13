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
