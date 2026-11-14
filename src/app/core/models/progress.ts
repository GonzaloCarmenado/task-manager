/** XP que da completar una tarea y tope de XP por día local. */
export const XP_PER_TASK = 10;
export const DAILY_XP_CAP = 100;

export interface Progress {
  readonly totalXp: number;
  /** Derivado de `totalXp` en el cliente. */
  readonly level: number;
  readonly xpIntoLevel: number;
  /** XP que dura el nivel actual (de este nivel al siguiente). */
  readonly xpForNextLevel: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  /** XP ganados hoy (0 a 100). */
  readonly xpToday: number;
  readonly lastCompletedDay: string | null;
}

/** Respuesta de `get_progress` (nombres de la base de datos). */
export interface ProgressRow {
  total_xp: number;
  best_streak: number;
  current_streak: number;
  xp_today: number;
  last_completed_day: string | null;
}

/** Lo que se enseña tras completar o desmarcar una tarea. */
export interface Celebration {
  /** +10 al completar, 0 con el tope alcanzado y negativo al desmarcar. */
  readonly xpDelta: number;
  readonly capped: boolean;
  /** Días de racha, solo si es la primera tarea del día. */
  readonly streakDays: number | null;
  /** Nivel al que se sube (una sola vez), o `null`. */
  readonly leveledUpTo: number | null;
}
