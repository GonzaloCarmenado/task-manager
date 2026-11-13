import { Injectable, computed, inject, signal } from '@angular/core';
import { COMPLETED_DAYS, Task, TaskInput, TaskRow } from '../../core/models/task';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { CLOCK } from '../../core/services/clock';
import { SupabaseService } from '../../core/services/supabase';
import { formatTime } from '../../core/utils/local-date';

export type TasksStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TasksErrorReason = 'network' | 'unknown';
export type TaskOpResult = { ok: true } | { ok: false; reason: TasksErrorReason };

/** Plazo propio de la capa de datos: sin red y con el token caducado las consultas no vuelven solas. */
const TIMEOUT_MS = 8_000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Outcome = { ok: true; data: unknown } | { ok: false; reason: TasksErrorReason };

interface UserState {
  readonly status: TasksStatus;
  readonly reason: TasksErrorReason | null;
}

function isRow(value: unknown): value is TaskRow {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['title'] === 'string' &&
    typeof v['created_at'] === 'string' &&
    (v['due_date'] === null || typeof v['due_date'] === 'string') &&
    (v['due_time'] === null || typeof v['due_time'] === 'string') &&
    (v['completed_at'] === null || typeof v['completed_at'] === 'string')
  );
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    dueTime: formatTime(row.due_time),
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function toTasks(data: unknown): Task[] {
  return Array.isArray(data) ? data.filter(isRow).map(toTask) : [];
}

/** Valores a guardar: título recortado y la hora solo si hay fecha. */
function toValues(input: TaskInput) {
  return {
    title: input.title.trim(),
    due_date: input.dueDate,
    due_time: input.dueDate === null ? null : input.dueTime,
  };
}

function reasonOf(error: unknown, timedOut: boolean): TasksErrorReason {
  if (timedOut) return 'network';
  const e = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
  const text = [e['message'], e['name'], e['details']]
    .filter((p) => typeof p === 'string')
    .join(' ');
  return /fetch|network|abort|timeout|load failed/i.test(text) ? 'network' : 'unknown';
}

/**
 * Único punto de contacto con la tabla `tasks`. Estado en Signals, caché indexada por `userId`,
 * plazo propio de 8 s y reversión de los cambios optimistas. Nunca escribe en consola.
 */
@Injectable({ providedIn: 'root' })
export class TasksAccessService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthAccessService);
  private readonly clock = inject(CLOCK);

  private readonly cache = signal<ReadonlyMap<string, readonly Task[]>>(new Map());
  private readonly states = signal<ReadonlyMap<string, UserState>>(new Map());

  /** Tareas del usuario actual (nunca las de otro). */
  readonly tasks = computed<readonly Task[]>(() => {
    const uid = this.auth.userId();
    return uid === null ? [] : (this.cache().get(uid) ?? []);
  });

  readonly status = computed<TasksStatus>(() => this.stateOf()?.status ?? 'idle');
  readonly errorReason = computed<TasksErrorReason | null>(() => this.stateOf()?.reason ?? null);

  get(id: string): Task | undefined {
    return this.tasks().find((t) => t.id === id);
  }

  async load(): Promise<void> {
    const uid = this.auth.userId();
    if (uid === null) return;

    // Solo se muestra «cargando» si no hay datos previos de este usuario: sin parpadeos al volver.
    if (!this.cache().has(uid)) this.setState(uid, { status: 'loading', reason: null });

    const since = new Date(this.clock().getTime() - COMPLETED_DAYS * DAY_MS).toISOString();
    const outcome = await this.run((signal) =>
      this.supabase.client
        .from('tasks')
        .select('*')
        .or(`completed_at.is.null,completed_at.gte.${since}`)
        .order('created_at', { ascending: true })
        .abortSignal(signal)
    );

    if (outcome.ok) {
      this.setTasks(uid, toTasks(outcome.data));
      this.setState(uid, { status: 'ready', reason: null });
    } else if (!this.cache().has(uid)) {
      this.setState(uid, { status: 'error', reason: outcome.reason });
    }
  }

  async create(input: TaskInput): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    if (uid === null) return { ok: false, reason: 'unknown' };

    const outcome = await this.run((signal) =>
      this.supabase.client
        .from('tasks')
        .insert(toValues(input))
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!outcome.ok || !isRow(outcome.data)) return this.failed(outcome);

    this.setTasks(uid, [...(this.cache().get(uid) ?? []), toTask(outcome.data)]);
    return { ok: true };
  }

  async update(id: string, input: TaskInput): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    if (uid === null) return { ok: false, reason: 'unknown' };

    const outcome = await this.run((signal) =>
      this.supabase.client
        .from('tasks')
        .update(toValues(input))
        .eq('id', id)
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!outcome.ok || !isRow(outcome.data)) return this.failed(outcome);

    this.replaceTask(uid, id, toTask(outcome.data));
    return { ok: true };
  }

  /** Optimista: cambia al instante y vuelve atrás si el servidor falla. */
  async setCompleted(id: string, done: boolean): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };

    const completedAt = done ? this.clock().toISOString() : null;
    this.replaceTask(uid, id, { ...previous, completedAt });

    const outcome = await this.run((signal) =>
      this.supabase.client
        .from('tasks')
        .update({ completed_at: completedAt })
        .eq('id', id)
        .abortSignal(signal)
    );
    if (outcome.ok) return { ok: true };

    this.replaceTask(uid, id, previous);
    return { ok: false, reason: outcome.reason };
  }

  /** Optimista: desaparece al instante y vuelve a la lista si el servidor falla. */
  async remove(id: string): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };

    this.replaceTask(uid, id, null);

    const outcome = await this.run((signal) =>
      this.supabase.client.from('tasks').delete().eq('id', id).abortSignal(signal)
    );
    if (outcome.ok) return { ok: true };

    this.setTasks(uid, [...(this.cache().get(uid) ?? []), previous]);
    return { ok: false, reason: outcome.reason };
  }

  private async run(
    build: (signal: AbortSignal) => PromiseLike<{ data: unknown; error: unknown }>
  ): Promise<Outcome> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);
    try {
      const { data, error } = await build(controller.signal);
      return error ? { ok: false, reason: reasonOf(error, timedOut) } : { ok: true, data };
    } catch (error) {
      return { ok: false, reason: reasonOf(error, timedOut) };
    } finally {
      clearTimeout(timer);
    }
  }

  private failed(outcome: Outcome): TaskOpResult {
    return { ok: false, reason: outcome.ok ? 'unknown' : outcome.reason };
  }

  private stateOf(): UserState | undefined {
    const uid = this.auth.userId();
    return uid === null ? undefined : this.states().get(uid);
  }

  private setState(uid: string, state: UserState): void {
    this.states.update((m) => new Map(m).set(uid, state));
  }

  private setTasks(uid: string, tasks: readonly Task[]): void {
    this.cache.update((m) => new Map(m).set(uid, tasks));
  }

  /** Sustituye (o quita, con `null`) una tarea concreta sin tocar el resto. */
  private replaceTask(uid: string, id: string, next: Task | null): void {
    const current = this.cache().get(uid) ?? [];
    this.setTasks(
      uid,
      next === null
        ? current.filter((t) => t.id !== id)
        : current.map((t) => (t.id === id ? next : t))
    );
  }
}
