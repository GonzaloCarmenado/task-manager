/** Máximo de avisos programados a la vez; el resto se programa al reconciliar. */
export const MAX_ALARMS = 60;
/** Veces que se ofrece el aviso previo de permiso antes de dejar solo el aviso discreto. */
export const MAX_DENIALS = 3;

export type AlarmPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type ExactAlarmState = 'allowed' | 'not-allowed' | 'not-needed' | 'unknown';

/** Un aviso concreto que debe estar programado en el móvil. */
export interface AlarmPlan {
  readonly taskId: string;
  /** Entero estable derivado del id de la tarea (Android exige un entero). */
  readonly notificationId: number;
  /** Instante local de la tarea. */
  readonly at: Date;
  readonly title: string;
  readonly body: string;
}

/** Preferencia local (sin datos sensibles). */
export interface AlarmPrefs {
  /** Veces que el usuario ha pulsado «Ahora no» (o rechazado el permiso), de 0 a MAX_DENIALS. */
  readonly deniedCount: number;
  /** Día local (`YYYY-MM-DD`) en que se cerró el aviso discreto. */
  readonly bannerDismissedDay: string | null;
}

export const DEFAULT_ALARM_PREFS: AlarmPrefs = { deniedCount: 0, bannerDismissedDay: null };
export const ALARM_PREFS_KEY = 'task-manager-alarms';
export const ALARM_CHANNEL_ID = 'reminders';
