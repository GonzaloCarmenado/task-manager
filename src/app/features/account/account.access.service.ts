import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import {
  AccountResult,
  LocalTask,
  LocalTasksSnapshot,
  REMINDER_SNOOZE_DAYS,
} from '../../core/models/account';
import { Recurrence } from '../../core/models/recurrence';
import { TaskInput } from '../../core/models/task';
import { CLOCK } from '../../core/services/clock';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { normalizeUsername } from '../../core/utils/username';
import { ProgressAccessService } from '../progress/progress.access.service';
import { TasksAccessService } from '../tasks/tasks.access.service';
import { AccountConstructorService } from './account.constructor.service';

/** Almacenamiento del buffer de traspaso de tareas; se inyecta para poder simularlo. */
export const ACCOUNT_STORAGE = new InjectionToken<
  Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
>('ACCOUNT_STORAGE', { providedIn: 'root', factory: () => window.localStorage });

const TRANSFER_KEY = 'task-manager-pending-transfer';
const REMINDER_KEY = 'task-manager-account-reminder';
const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY: LocalTasksSnapshot = { pending: [], completed: 0 };

/** Qué hacer con las tareas del móvil al iniciar sesión en una cuenta. */
export type SignInMode = 'merge' | 'discard' | 'none';

/** Tareas a recrear en la cuenta, con la identidad anónima de origen y la cuenta de destino. */
interface TransferBuffer {
  readonly source: string;
  readonly target: string | null;
  readonly tasks: readonly LocalTask[];
}

function isRecurrenceShape(value: unknown): value is Recurrence {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v['kind'] === 'daily' || v['kind'] === 'weekly' || v['kind'] === 'monthly') &&
    typeof v['interval'] === 'number' &&
    Array.isArray(v['weekdays']) &&
    v['weekdays'].every((d) => typeof d === 'number') &&
    (v['monthDay'] === null || typeof v['monthDay'] === 'number') &&
    typeof v['startDate'] === 'string' &&
    (v['until'] === null || typeof v['until'] === 'string')
  );
}

function isLocalTask(value: unknown): value is LocalTask {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['title'] === 'string' &&
    (v['dueDate'] === null || typeof v['dueDate'] === 'string') &&
    (v['dueTime'] === null || typeof v['dueTime'] === 'string') &&
    (v['recurrence'] === undefined || isRecurrenceShape(v['recurrence'])) &&
    (v['seriesDate'] === undefined ||
      v['seriesDate'] === null ||
      typeof v['seriesDate'] === 'string')
  );
}

function isBuffer(value: unknown): value is TransferBuffer {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['source'] === 'string' &&
    (v['target'] === null || typeof v['target'] === 'string') &&
    Array.isArray(v['tasks']) &&
    v['tasks'].every(isLocalTask)
  );
}

/**
 * Flujos de la cuenta de usuario para las pantallas. La identidad la gestiona `AuthAccessService`
 * (único dueño de `supabase.auth`); aquí se orquestan los efectos sobre los datos de la app.
 */
@Injectable({ providedIn: 'root' })
export class AccountAccessService {
  private readonly auth = inject(AuthAccessService);
  private readonly tasks = inject(TasksAccessService);
  private readonly rules = inject(AccountConstructorService);
  private readonly storage = inject(ACCOUNT_STORAGE);
  private readonly progress = inject(ProgressAccessService);
  private readonly clock = inject(CLOCK);

  /** Hay una cuenta con nombre de usuario (no es la sesión anónima). */
  readonly hasAccount = computed(() => {
    const session = this.auth.session();
    return session !== null && !session.user.isAnonymous;
  });
  readonly isAnonymous = computed(() => this.auth.session()?.user.isAnonymous === true);
  readonly username = computed(() => {
    const session = this.auth.session();
    return session !== null && !session.user.isAnonymous ? session.user.username : null;
  });

  /** Tareas de la identidad anónima actual: pendientes (traspasables) y nº de completadas (no se traspasan). */
  readonly localTasks = computed<LocalTasksSnapshot>(() => {
    if (!this.isAnonymous()) return EMPTY;
    const all = this.tasks.tasks();
    return {
      pending: all
        .filter((t) => t.completedAt === null)
        .map((t): LocalTask => {
          const base = { title: t.title, dueDate: t.dueDate, dueTime: t.dueTime };
          const series = t.seriesId === null ? undefined : this.tasks.seriesOf(t);
          return series === undefined
            ? base
            : { ...base, recurrence: series.recurrence, seriesDate: t.seriesDate };
        }),
      completed: all.filter((t) => t.completedAt !== null).length,
    };
  });

  private readonly _signInSnapshot = signal<LocalTasksSnapshot | null>(null);
  private signInSource: string | null = null;
  /** Tareas del móvil capturadas al comprobar las credenciales; no cambian hasta terminar o cancelar. */
  readonly signInSnapshot = this._signInSnapshot.asReadonly();

  /** Instante (ms) hasta el que el recordatorio está aplazado; 0 = no aplazado. */
  private readonly snoozeUntil = signal(0);

  private readonly _transferPending = signal(false);
  /** Queda un traspaso de tareas a medias (se reintentará al arrancar). */
  readonly transferPending = this._transferPending.asReadonly();

  constructor() {
    this._transferPending.set(this.readBuffer() !== null);
    this.snoozeUntil.set(this.readSnooze());
  }

  /**
   * La tarjeta «Crea tu respaldo personal» se ofrece solo sin cuenta, tras completar alguna tarea alguna vez
   * y fuera del aplazamiento. No depende de la red. Es una consulta (no un `computed`) para que el paso del
   * tiempo se tenga en cuenta cada vez que se pinta.
   */
  reminderVisible(): boolean {
    if (!this.isAnonymous()) return false;
    if (this.progress.progress()?.lastCompletedDay == null) return false;
    return this.clock().getTime() >= this.snoozeUntil();
  }

  /** Oculta el recordatorio durante 14 días (también tras reabrir la app). */
  snoozeReminder(): void {
    const until = this.clock().getTime() + REMINDER_SNOOZE_DAYS * DAY_MS;
    this.snoozeUntil.set(until);
    try {
      this.storage.setItem(REMINDER_KEY, String(until));
    } catch {
      /* sin almacenamiento: el aplazamiento dura lo que la apertura */
    }
  }

  private readSnooze(): number {
    try {
      const value = Number(this.storage.getItem(REMINDER_KEY));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Crea la cuenta vinculando la sesión anónima actual: el `user_id` no cambia, así que las tareas y el
   * progreso siguen siendo suyos. Valida antes de llamar al servidor.
   */
  async createAccount(username: string, password: string): Promise<AccountResult> {
    if (!this.isAnonymous()) return { ok: false, reason: 'unauthorized' };
    if (!this.rules.isUsernameValid(username)) return { ok: false, reason: 'invalid-username' };
    if (!this.rules.isPasswordValid(password, username))
      return { ok: false, reason: 'weak-password' };
    return this.auth.linkAccount(normalizeUsername(username), password);
  }

  /**
   * Primera fase de entrar en una cuenta: comprueba las credenciales **sin cambiar de identidad** y
   * congela la instantánea de las tareas del móvil para preguntar qué hacer con ellas.
   */
  async startSignIn(username: string, password: string): Promise<AccountResult> {
    const current = this.auth.session();
    if (current === null || !current.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    const result = await this.auth.checkCredentials(username, password);
    if (!result.ok) return result;
    if (this.tasks.status() === 'idle') await this.tasks.load();
    this.signInSource = current.user.id;
    this._signInSnapshot.set(this.localTasks());
    return { ok: true };
  }

  /** Descarta lo comprobado: la sesión anónima y sus datos siguen intactos. */
  cancelSignIn(): void {
    this.auth.cancelSignIn();
    this._signInSnapshot.set(null);
    this.signInSource = null;
  }

  /**
   * Segunda fase: cambia de identidad y aplica la decisión sobre las tareas del móvil. Con `merge` se
   * **recrean solo las pendientes** en la cuenta (sin XP ni completadas); un fallo a medias no impide
   * entrar: lo que falta queda en el buffer y se reanuda sin duplicar.
   */
  async finishSignIn(mode: SignInMode): Promise<AccountResult> {
    const snapshot = this._signInSnapshot();
    const source = this.signInSource;
    if (snapshot === null || source === null || !this.isAnonymous()) {
      return { ok: false, reason: 'unauthorized' };
    }
    const merge = mode === 'merge' && snapshot.pending.length > 0;
    // El buffer existe antes de cambiar de identidad: si la app se cierra a mitad, no se pierde nada.
    if (merge) this.writeBuffer({ source, target: null, tasks: snapshot.pending });

    const result = await this.auth.completeSignIn();
    if (!result.ok) {
      this.clearBuffer();
      return result;
    }
    this._signInSnapshot.set(null);
    this.signInSource = null;
    this.tasks.forget(source);

    if (merge) {
      const target = this.auth.session()?.user.id ?? null;
      this.writeBuffer({ source, target, tasks: snapshot.pending });
      await this.transfer();
    }
    return { ok: true };
  }

  /** Reanuda un traspaso que quedó a medias (arranque de la app con la cuenta ya abierta). */
  async resumePendingTransfer(): Promise<void> {
    const buffer = this.readBuffer();
    const session = this.auth.session();
    if (buffer === null || session === null) return;

    if (session.user.isAnonymous) {
      // Sigue siendo la identidad de origen: la entrada no llegó a completarse.
      if (session.user.id === buffer.source) this.clearBuffer();
      return;
    }
    if (buffer.target !== null && buffer.target !== session.user.id) {
      this.clearBuffer(); // era para otra cuenta: nunca se vuelca en esta
      return;
    }
    if (buffer.target === null) this.writeBuffer({ ...buffer, target: session.user.id });
    await this.transfer();
  }

  /** Recrea las tareas del buffer una a una, apuntando lo que falta tras cada éxito. */
  private async transfer(): Promise<void> {
    const buffer = this.readBuffer();
    if (buffer === null) return;
    const remaining = [...buffer.tasks];
    while (remaining.length > 0) {
      const { title, dueDate, dueTime, recurrence, seriesDate } = remaining[0];
      const input: TaskInput =
        recurrence === undefined
          ? { title, dueDate, dueTime }
          : { title, dueDate, dueTime, recurrence, seriesDate };
      const result = await this.tasks.create(input);
      if (!result.ok) return;
      remaining.shift();
      if (remaining.length > 0) this.writeBuffer({ ...buffer, tasks: remaining });
    }
    this.clearBuffer();
  }

  private readBuffer(): TransferBuffer | null {
    let raw: string | null;
    try {
      raw = this.storage.getItem(TRANSFER_KEY);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isBuffer(parsed)) return parsed;
    } catch {
      /* buffer corrupto: se descarta */
    }
    this.clearBuffer();
    return null;
  }

  private writeBuffer(buffer: TransferBuffer): void {
    try {
      this.storage.setItem(TRANSFER_KEY, JSON.stringify(buffer));
    } catch {
      /* sin almacenamiento: el traspaso sigue en memoria pero no sobrevivirá a un cierre */
    }
    this._transferPending.set(true);
  }

  private clearBuffer(): void {
    try {
      this.storage.removeItem(TRANSFER_KEY);
    } catch {
      /* nada que limpiar */
    }
    this._transferPending.set(false);
  }

  /**
   * Cambia la contraseña de la cuenta abierta. Valida antes de llamar al servidor (8–64 caracteres, distinta
   * del usuario y de la actual); la actual se comprueba con el servidor y, si falla, no cambia nada.
   */
  async changePassword(current: string, next: string): Promise<AccountResult> {
    const username = this.username();
    if (username === null) return { ok: false, reason: 'unauthorized' };
    if (next === current) return { ok: false, reason: 'same-password' };
    if (!this.rules.isPasswordValid(next, username, { notSameAs: current })) {
      return { ok: false, reason: 'weak-password' };
    }
    return this.auth.changePassword(current, next);
  }

  /**
   * Borra la cuenta y todos sus datos tras comprobar la contraseña. Si va bien, descarta de memoria lo de la
   * cuenta (tareas, progreso) y cualquier traspaso pendiente; las alarmas se cancelan solas al quedar la
   * lista vacía. Si falla, no cambia nada.
   */
  async deleteAccount(password: string): Promise<AccountResult> {
    const leaving = this.auth.session();
    if (leaving === null || leaving.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    if (password === '') return { ok: false, reason: 'invalid-credentials' };
    const result = await this.auth.deleteOwnAccount(password);
    if (!result.ok) return result;
    this.tasks.forget(leaving.user.id);
    this.progress.forget(leaving.user.id);
    this.clearBuffer();
    return result;
  }

  /** Sin conexión no se cierra sesión: la app no puede crear la identidad anónima siguiente. */
  canSignOut(): boolean {
    return this.auth.canSignOut();
  }

  /** Cierra la sesión de esta app y descarta de memoria las tareas de la cuenta saliente. */
  async signOut(): Promise<AccountResult> {
    const leaving = this.auth.session();
    if (leaving === null || leaving.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    const result = await this.auth.signOut();
    if (result.ok) this.tasks.forget(leaving.user.id);
    return result;
  }
}
