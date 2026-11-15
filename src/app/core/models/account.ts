import { Recurrence } from './recurrence';
/** Motivo por el que falló una operación de cuenta (sin detalles técnicos). */
export type AccountErrorReason =
  | 'invalid-credentials' // inicio de sesión o contraseña actual incorrectos (mensaje siempre igual)
  | 'username-taken' // «Nombre de usuario no disponible»
  | 'invalid-username' // formato no válido (3–24 caracteres de a-z, 0-9, punto, guion y guion bajo)
  | 'weak-password' // el servicio rechazó la contraseña (mínimo remoto)
  | 'same-password' // la nueva es igual a la actual
  | 'rate-limited' // «Demasiados intentos. Espera unos minutos.»
  | 'network' // sin conexión
  | 'timeout' // sin respuesta en el plazo
  | 'unauthorized' // sesión caducada o no válida
  | 'unknown';

export type AccountResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: AccountErrorReason };

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const REMINDER_SNOOZE_DAYS = 14;

/** Gris = aún sin tocar · verde = cumple · rojo = no cumple. */
export type RuleState = 'idle' | 'ok' | 'error';

export interface RuleView {
  readonly key: string;
  readonly text: string;
  readonly state: RuleState;
}

/** Tarea pendiente anónima que se puede traer a la cuenta (solo lo imprescindible). */
export interface LocalTask {
  readonly title: string;
  readonly dueDate: string | null;
  readonly dueTime: string | null;
  /** Solo si es una ocurrencia de una serie (spec 012): la regla viaja con la tarea. */
  readonly recurrence?: Recurrence;
  /** Día previsto original de esa ocurrencia. */
  readonly seriesDate?: string | null;
}

/** Tareas anónimas del móvil, capturadas antes de iniciar sesión. */
export interface LocalTasksSnapshot {
  readonly pending: readonly LocalTask[];
  /** Completadas recientes: no se traspasan (ni ellas ni su XP). */
  readonly completed: number;
}
