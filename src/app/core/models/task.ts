import { Recurrence } from './recurrence';

export const TITLE_MAX = 120;
export const COMPLETED_DAYS = 30;

export interface Task {
  readonly id: string;
  /** 1 a 120 caracteres, sin espacios en los extremos. */
  readonly title: string;
  /** Día local `YYYY-MM-DD`; `null` = sin fecha. */
  readonly dueDate: string | null;
  /** `HH:MM` local; solo con `dueDate`. */
  readonly dueTime: string | null;
  /** Instante ISO; `null` = pendiente. */
  readonly completedAt: string | null;
  readonly createdAt: string;
  /** Veces que se ha pospuesto una tarea que ya tenía fecha. */
  readonly postponedCount: number;
  /** `null` = tarea suelta. */
  readonly seriesId: string | null;
  /** Día previsto original de la ocurrencia (no cambia al posponer); `null` si es suelta. */
  readonly seriesDate: string | null;
}

export interface TaskInput {
  readonly title: string;
  readonly dueDate: string | null;
  /** Se normaliza a `null` si no hay fecha. */
  readonly dueTime: string | null;
  /** Con regla, `dueDate` es obligatorio y es la fecha de la ocurrencia. */
  readonly recurrence?: Recurrence | null;
  /** Solo traspaso entre identidades: conserva el `series_date` de origen; por defecto `dueDate`. */
  readonly seriesDate?: string | null;
}

/** Fila tal como la devuelve Supabase (`due_time` llega como `HH:MM:SS`). */
export interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  created_at: string;
  postponed_count: number;
  series_id: string | null;
  series_date: string | null;
}
