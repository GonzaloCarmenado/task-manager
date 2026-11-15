import { Injectable, computed, inject, signal } from '@angular/core';
import { Recurrence, SeriesRow, TaskSeries } from '../../core/models/recurrence';
import { COMPLETED_DAYS, Task, TaskInput, TaskRow } from '../../core/models/task';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { CLOCK } from '../../core/services/clock';
import { SupabaseService } from '../../core/services/supabase';
import { addDays, formatTime, toLocalDay } from '../../core/utils/local-date';
import { firstOnOrAfter, isRecurrenceValid, nextAfter } from '../../core/utils/recurrence';
import {
  PostponeConstructorService,
  PostponeTarget,
} from './postpone/postpone.constructor.service';

export type TasksStatus = 'idle' | 'loading' | 'ready' | 'error';
export type TasksErrorReason = 'network' | 'unknown';
export type TaskOpResult = { ok: true } | { ok: false; reason: TasksErrorReason };
/**
 * Resultado de completar o desmarcar. Con una ocurrencia completada, `next` es el día de la siguiente
 * (`null` = la serie termina); en el resto no existe.
 */
export type CompleteResult =
  { ok: true; next?: string | null } | { ok: false; reason: TasksErrorReason };

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
    typeof v['postponed_count'] === 'number' &&
    (v['due_date'] === null || typeof v['due_date'] === 'string') &&
    (v['due_time'] === null || typeof v['due_time'] === 'string') &&
    (v['completed_at'] === null || typeof v['completed_at'] === 'string') &&
    (v['series_id'] === null || typeof v['series_id'] === 'string') &&
    (v['series_date'] === null || typeof v['series_date'] === 'string')
  );
}

function isSeriesRow(value: unknown): value is SeriesRow {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['title'] === 'string' &&
    (v['due_time'] === null || typeof v['due_time'] === 'string') &&
    (v['kind'] === 'daily' || v['kind'] === 'weekly' || v['kind'] === 'monthly') &&
    typeof v['interval_n'] === 'number' &&
    Array.isArray(v['weekdays']) &&
    v['weekdays'].every((d) => typeof d === 'number') &&
    (v['month_day'] === null || typeof v['month_day'] === 'number') &&
    typeof v['start_date'] === 'string' &&
    (v['until_date'] === null || typeof v['until_date'] === 'string')
  );
}

function toSeries(row: SeriesRow): TaskSeries {
  return {
    id: row.id,
    title: row.title,
    dueTime: formatTime(row.due_time),
    recurrence: {
      kind: row.kind,
      interval: row.interval_n,
      weekdays: [...row.weekdays].sort((a, b) => a - b),
      monthDay: row.month_day,
      startDate: row.start_date,
      until: row.until_date,
    },
  };
}

function toSeriesList(data: unknown): TaskSeries[] {
  return Array.isArray(data) ? data.filter(isSeriesRow).map(toSeries) : [];
}

/** Valores de la serie a guardar (la hora ya sin segundos, tal como la envía el formulario). */
function toSeriesValues(title: string, dueTime: string | null, rule: Recurrence) {
  return {
    title,
    due_time: dueTime,
    kind: rule.kind,
    interval_n: rule.interval,
    weekdays: [...rule.weekdays],
    month_day: rule.monthDay,
    start_date: rule.startDate,
    until_date: rule.until,
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    dueTime: formatTime(row.due_time),
    completedAt: row.completed_at,
    createdAt: row.created_at,
    postponedCount: row.postponed_count,
    seriesId: row.series_id,
    seriesDate: row.series_date,
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
  private readonly postponeRules = inject(PostponeConstructorService);

  private readonly cache = signal<ReadonlyMap<string, readonly Task[]>>(new Map());
  private readonly states = signal<ReadonlyMap<string, UserState>>(new Map());
  /** Series (reglas de repetición) de cada usuario, por id. */
  private readonly seriesCache = signal<ReadonlyMap<string, ReadonlyMap<string, TaskSeries>>>(
    new Map()
  );
  /** Cambios (crear, editar, completar, borrar) a la espera del servidor. */
  private inFlight = 0;
  /** Sube con cada cambio (al empezar y al acabar): una recarga lanzada antes de un cambio no lo pisa. */
  private epoch = 0;

  /** Tareas del usuario actual (nunca las de otro). */
  readonly tasks = computed<readonly Task[]>(() => {
    const uid = this.auth.userId();
    return uid === null ? [] : (this.cache().get(uid) ?? []);
  });

  /** Series del usuario actual (nunca las de otro). */
  readonly series = computed<ReadonlyMap<string, TaskSeries>>(() => {
    const uid = this.auth.userId();
    return uid === null ? new Map() : (this.seriesCache().get(uid) ?? new Map());
  });

  readonly status = computed<TasksStatus>(() => this.stateOf()?.status ?? 'idle');
  readonly errorReason = computed<TasksErrorReason | null>(() => this.stateOf()?.reason ?? null);

  /** Borra de memoria lo de un usuario que sale (cierre de sesión o cuenta borrada). */
  forget(userId: string): void {
    this.cache.update((map) => {
      const next = new Map(map);
      next.delete(userId);
      return next;
    });
    this.states.update((map) => {
      const next = new Map(map);
      next.delete(userId);
      return next;
    });
    this.seriesCache.update((map) => {
      const next = new Map(map);
      next.delete(userId);
      return next;
    });
  }

  get(id: string): Task | undefined {
    return this.tasks().find((t) => t.id === id);
  }

  /** Serie de una ocurrencia (`undefined` si la tarea es suelta). */
  seriesOf(task: Task): TaskSeries | undefined {
    return task.seriesId === null ? undefined : this.series().get(task.seriesId);
  }

  async load(): Promise<void> {
    const uid = this.auth.userId();
    if (uid === null) return;

    // Solo se muestra «cargando» si no hay datos previos de este usuario: sin parpadeos al volver.
    if (!this.cache().has(uid)) this.setState(uid, { status: 'loading', reason: null });

    const since = new Date(this.clock().getTime() - COMPLETED_DAYS * DAY_MS).toISOString();
    const epoch = this.epoch;
    const [outcome, seriesOutcome] = await Promise.all([
      this.run((signal) =>
        this.supabase.client
          .from('tasks')
          .select('*')
          .or(`completed_at.is.null,completed_at.gte.${since}`)
          .order('created_at', { ascending: true })
          .abortSignal(signal)
      ),
      this.run((signal) =>
        this.supabase.client.from('task_series').select('*').abortSignal(signal)
      ),
    ]);

    const failure = !outcome.ok ? outcome : !seriesOutcome.ok ? seriesOutcome : null;
    if (failure === null && outcome.ok && seriesOutcome.ok) {
      // Si hubo un cambio mientras tanto (en vuelo o ya confirmado), la respuesta puede ser anterior a él: no se pisa.
      const fresh = this.inFlight === 0 && this.epoch === epoch;
      if (fresh) {
        this.setTasks(uid, toTasks(outcome.data));
        this.setSeries(uid, toSeriesList(seriesOutcome.data));
      }
      this.setState(uid, { status: 'ready', reason: null });
      if (fresh) await this.repairSeries(uid);
    } else if (failure !== null && !this.cache().has(uid)) {
      this.setState(uid, { status: 'error', reason: failure.reason });
    }
  }

  /**
   * Crear la siguiente ocurrencia y completar la actual no es atómico: si la app se cerró entre los dos pasos,
   * la serie se queda sin pendiente. Aquí se repara. El índice único del servidor impide duplicar.
   */
  private async repairSeries(uid: string): Promise<void> {
    const today = toLocalDay(this.clock());
    for (const series of this.seriesFor(uid).values()) {
      if (this.inFlight > 0) return;
      const known = (this.cache().get(uid) ?? []).filter((t) => t.seriesId === series.id);
      if (known.some((t) => t.completedAt === null)) continue;
      const last = known
        .map((t) => t.seriesDate)
        .filter((d): d is string => d !== null)
        .sort()
        .at(-1);
      const anchor = last ?? addDays(series.recurrence.startDate, -1);
      const next = nextAfter(series.recurrence, anchor, today);
      if (next !== null) await this.insertOccurrence(uid, series, next);
    }
  }

  /** Crea la ocurrencia de `day` con el título y la hora de la serie. Un fallo (incluido un duplicado) se ignora. */
  private async insertOccurrence(uid: string, series: TaskSeries, day: string): Promise<void> {
    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('tasks')
        .insert({
          title: series.title,
          due_date: day,
          due_time: series.dueTime,
          series_id: series.id,
          series_date: day,
        })
        .select()
        .abortSignal(signal)
        .single()
    );
    if (outcome.ok && isRow(outcome.data)) {
      this.setTasks(uid, [...(this.cache().get(uid) ?? []), toTask(outcome.data)]);
    }
  }

  async create(input: TaskInput): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    if (uid === null) return { ok: false, reason: 'unknown' };
    if (input.recurrence) return this.createSeries(uid, input, input.recurrence);

    const outcome = await this.runMutation((signal) =>
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

  /** Crea la serie y su primera ocurrencia. Si falla la segunda, se intenta borrar la serie. */
  private async createSeries(
    uid: string,
    input: TaskInput,
    rule: Recurrence
  ): Promise<TaskOpResult> {
    if (input.dueDate === null || !isRecurrenceValid(rule)) return { ok: false, reason: 'unknown' };
    const title = input.title.trim();

    const created = await this.insertSeries(title, input.dueTime, rule);
    if (!created.ok) return created;

    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('tasks')
        .insert({
          title,
          due_date: input.dueDate,
          due_time: input.dueTime,
          series_id: created.series.id,
          series_date: input.seriesDate ?? input.dueDate,
        })
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!outcome.ok || !isRow(outcome.data)) {
      await this.deleteSeries(created.series.id);
      return this.failed(outcome);
    }

    this.putSeries(uid, created.series);
    this.setTasks(uid, [...(this.cache().get(uid) ?? []), toTask(outcome.data)]);
    return { ok: true };
  }

  private async insertSeries(
    title: string,
    dueTime: string | null,
    rule: Recurrence
  ): Promise<{ ok: true; series: TaskSeries } | { ok: false; reason: TasksErrorReason }> {
    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('task_series')
        .insert(toSeriesValues(title, dueTime, rule))
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!outcome.ok || !isSeriesRow(outcome.data)) {
      return { ok: false, reason: outcome.ok ? 'unknown' : outcome.reason };
    }
    return { ok: true, series: toSeries(outcome.data) };
  }

  private deleteSeries(id: string): Promise<Outcome> {
    return this.runMutation((signal) =>
      this.supabase.client.from('task_series').delete().eq('id', id).abortSignal(signal)
    );
  }

  async update(id: string, input: TaskInput): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    if (uid === null) return { ok: false, reason: 'unknown' };

    const outcome = await this.runMutation((signal) =>
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
  async setCompleted(id: string, done: boolean): Promise<CompleteResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };

    const now = this.clock();
    const completedAt = done ? now.toISOString() : null;
    // El día local lo envía el cliente: la base de datos no conoce la zona horaria del usuario.
    const completedDay = done ? toLocalDay(now) : null;
    const before = this.cache().get(uid) ?? [];
    const undoingOccurrence = !done && previous.seriesId !== null;
    if (undoingOccurrence) {
      // El disparador borra en el servidor la pendiente generada después: aquí también desaparece.
      this.setTasks(
        uid,
        before
          .filter(
            (t) => !(t.seriesId === previous.seriesId && t.completedAt === null && t.id !== id)
          )
          .map((t) => (t.id === id ? { ...previous, completedAt } : t))
      );
    } else {
      this.replaceTask(uid, id, { ...previous, completedAt });
    }

    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('tasks')
        .update({ completed_at: completedAt, completed_day: completedDay })
        .eq('id', id)
        .abortSignal(signal)
    );
    if (!outcome.ok) {
      if (undoingOccurrence) this.setTasks(uid, before);
      else this.replaceTask(uid, id, previous);
      return { ok: false, reason: outcome.reason };
    }

    const series = this.seriesFor(uid).get(previous.seriesId ?? '');
    if (!done || series === undefined || previous.seriesDate === null) return { ok: true };

    // La siguiente: tras la fecha prevista de esta y no anterior a hoy. Si no se puede crear ahora,
    // la autorreparación de `load()` lo hace después.
    const next = nextAfter(series.recurrence, previous.seriesDate, toLocalDay(now));
    if (next !== null) await this.insertOccurrence(uid, series, next);
    return { ok: true, next };
  }

  /** «Solo esta»: cambia la fila de la ocurrencia (título, fecha, hora), no la serie. Una ocurrencia siempre tiene fecha. */
  async updateOccurrence(id: string, input: TaskInput): Promise<TaskOpResult> {
    const previous = this.get(id);
    if (previous === undefined) return { ok: false, reason: 'unknown' };
    if (previous.seriesId !== null && input.dueDate === null) {
      return { ok: false, reason: 'unknown' };
    }
    return this.update(id, input);
  }

  /**
   * «Toda la serie»: título, hora y regla pasan a la serie (el día del formulario es su nuevo inicio) y la
   * pendiente se recoloca en el primer día válido desde hoy o desde ese día. Sirve también para convertir una
   * tarea suelta en serie y, sin regla, para quitar la repetición.
   */
  async updateSeries(id: string, input: TaskInput): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };

    const rule = input.recurrence ?? null;
    if (rule === null) {
      return previous.seriesId === null
        ? this.update(id, input)
        : this.detachFromSeries(uid, previous, input);
    }
    if (input.dueDate === null || !isRecurrenceValid(rule)) return { ok: false, reason: 'unknown' };

    const today = toLocalDay(this.clock());
    const first = firstOnOrAfter(rule, input.dueDate > today ? input.dueDate : today);
    if (first === null) return { ok: false, reason: 'unknown' };
    const title = input.title.trim();

    if (previous.seriesId === null) {
      const created = await this.insertSeries(title, input.dueTime, rule);
      if (!created.ok) return created;
      const outcome = await this.runMutation((signal) =>
        this.supabase.client
          .from('tasks')
          .update({
            title,
            due_date: first,
            due_time: input.dueTime,
            series_id: created.series.id,
            series_date: first,
          })
          .eq('id', id)
          .select()
          .abortSignal(signal)
          .single()
      );
      if (!outcome.ok || !isRow(outcome.data)) {
        await this.deleteSeries(created.series.id);
        return this.failed(outcome);
      }
      this.putSeries(uid, created.series);
      this.replaceTask(uid, id, toTask(outcome.data));
      return { ok: true };
    }

    const patched = await this.runMutation((signal) =>
      this.supabase.client
        .from('task_series')
        .update(toSeriesValues(title, input.dueTime, rule))
        .eq('id', previous.seriesId)
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!patched.ok || !isSeriesRow(patched.data)) return this.failed(patched);
    this.putSeries(uid, toSeries(patched.data));

    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('tasks')
        .update({ title, due_time: input.dueTime, due_date: first, series_date: first })
        .eq('id', id)
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!outcome.ok || !isRow(outcome.data)) return this.failed(outcome);
    this.replaceTask(uid, id, toTask(outcome.data));
    return { ok: true };
  }

  /** Quita la repetición: borra la serie (la fila queda suelta) y guarda los valores del formulario. */
  private async detachFromSeries(
    uid: string,
    previous: Task,
    input: TaskInput
  ): Promise<TaskOpResult> {
    const removed = await this.deleteSeries(previous.seriesId ?? '');
    if (!removed.ok) return this.failed(removed);
    this.dropSeries(uid, previous.seriesId ?? '');
    this.replaceTask(uid, previous.id, { ...previous, seriesId: null });

    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('tasks')
        .update({ ...toValues(input), series_id: null, series_date: null })
        .eq('id', previous.id)
        .select()
        .abortSignal(signal)
        .single()
    );
    if (!outcome.ok || !isRow(outcome.data)) return this.failed(outcome);
    this.replaceTask(uid, previous.id, toTask(outcome.data));
    return { ok: true };
  }

  /** «Solo esta»: borra la ocurrencia y crea la siguiente. */
  async removeOccurrence(id: string): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };

    const result = await this.remove(id);
    const series = this.seriesFor(uid).get(previous.seriesId ?? '');
    if (!result.ok || series === undefined || previous.seriesDate === null) return result;

    const next = nextAfter(series.recurrence, previous.seriesDate, toLocalDay(this.clock()));
    if (next !== null) await this.insertOccurrence(uid, series, next);
    return { ok: true };
  }

  /**
   * «Toda la serie»: borra primero la serie (la ocurrencia queda suelta) y después la ocurrencia; si lo segundo
   * falla, queda como tarea suelta y se puede borrar de nuevo. Las completadas se conservan.
   */
  async removeSeries(id: string): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };
    if (previous.seriesId === null) return this.remove(id);

    const removed = await this.deleteSeries(previous.seriesId);
    if (!removed.ok) return this.failed(removed);
    this.dropSeries(uid, previous.seriesId);
    this.replaceTask(uid, id, { ...previous, seriesId: null });
    return this.remove(id);
  }

  /** Optimista: cambia fecha y hora al instante y vuelve atrás si el servidor falla. */
  async postpone(id: string, target: PostponeTarget): Promise<TaskOpResult> {
    const uid = this.auth.userId();
    const previous = this.get(id);
    if (uid === null || previous === undefined) return { ok: false, reason: 'unknown' };

    const postponedCount =
      previous.postponedCount + (this.postponeRules.countsAsPostponed(previous, target) ? 1 : 0);
    this.replaceTask(uid, id, {
      ...previous,
      dueDate: target.dueDate,
      dueTime: target.dueTime,
      postponedCount,
    });

    const outcome = await this.runMutation((signal) =>
      this.supabase.client
        .from('tasks')
        .update({
          due_date: target.dueDate,
          due_time: target.dueTime,
          postponed_count: postponedCount,
        })
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

    const outcome = await this.runMutation((signal) =>
      this.supabase.client.from('tasks').delete().eq('id', id).abortSignal(signal)
    );
    if (outcome.ok) return { ok: true };

    this.setTasks(uid, [...(this.cache().get(uid) ?? []), previous]);
    return { ok: false, reason: outcome.reason };
  }

  private async runMutation(
    build: (signal: AbortSignal) => PromiseLike<{ data: unknown; error: unknown }>
  ): Promise<Outcome> {
    this.inFlight += 1;
    this.epoch += 1;
    try {
      return await this.run(build);
    } finally {
      this.inFlight -= 1;
      this.epoch += 1;
    }
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

  private seriesFor(uid: string): ReadonlyMap<string, TaskSeries> {
    return this.seriesCache().get(uid) ?? new Map();
  }

  private setSeries(uid: string, list: readonly TaskSeries[]): void {
    this.seriesCache.update((m) => new Map(m).set(uid, new Map(list.map((s) => [s.id, s]))));
  }

  private putSeries(uid: string, series: TaskSeries): void {
    this.seriesCache.update((m) =>
      new Map(m).set(uid, new Map(this.seriesFor(uid)).set(series.id, series))
    );
  }

  private dropSeries(uid: string, id: string): void {
    const next = new Map(this.seriesFor(uid));
    next.delete(id);
    this.seriesCache.update((m) => new Map(m).set(uid, next));
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
