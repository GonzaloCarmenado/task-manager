export type RecurrenceKind = 'daily' | 'weekly' | 'monthly';

export const INTERVAL_MIN = 1;
export const INTERVAL_MAX = 30;

export interface Recurrence {
  readonly kind: RecurrenceKind;
  /** Cada N días (`daily`) o N semanas (`weekly`); 1 en `monthly`. */
  readonly interval: number;
  /** 1 = lunes … 7 = domingo, ordenados y sin repetir; solo con `weekly`, vacío en el resto. */
  readonly weekdays: readonly number[];
  /** 1 a 31; solo con `monthly`, `null` en el resto. */
  readonly monthDay: number | null;
  /** Día local `YYYY-MM-DD` desde el que cuenta la regla (fase de «cada N»); no hay ocurrencias antes. */
  readonly startDate: string;
  /** Último día local con ocurrencia (incluido); `null` = sin fin. */
  readonly until: string | null;
}

/** Serie tal como la usa el cliente. El título y la hora de la serie mandan sobre las ocurrencias nuevas. */
export interface TaskSeries {
  readonly id: string;
  readonly title: string;
  readonly dueTime: string | null;
  readonly recurrence: Recurrence;
}

/** Fila de `task_series` tal como la devuelve Supabase (`due_time` llega como `HH:MM:SS`). */
export interface SeriesRow {
  id: string;
  title: string;
  due_time: string | null;
  kind: RecurrenceKind;
  interval_n: number;
  weekdays: number[];
  month_day: number | null;
  start_date: string;
  until_date: string | null;
}
