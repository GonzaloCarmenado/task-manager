import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Celebration, Progress, ProgressRow } from '../../core/models/progress';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { CLOCK } from '../../core/services/clock';
import { SupabaseService } from '../../core/services/supabase';
import { toLocalDay } from '../../core/utils/local-date';
import { ProgressConstructorService } from './progress.constructor.service';

export type ProgressStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Plazo propio de la capa de datos: sin red y con el token caducado las consultas no vuelven solas. */
const TIMEOUT_MS = 8_000;

function isRow(value: unknown): value is ProgressRow {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['total_xp'] === 'number' &&
    typeof v['best_streak'] === 'number' &&
    typeof v['current_streak'] === 'number' &&
    typeof v['xp_today'] === 'number' &&
    (v['last_completed_day'] === null || typeof v['last_completed_day'] === 'string')
  );
}

/**
 * Único punto de contacto con el progreso (`get_progress`). Lo calcula la base de datos: aquí solo
 * se lee, con caché por `userId`, plazo de 8 s y sin inventar XP si el servidor no responde.
 */
@Injectable({ providedIn: 'root' })
export class ProgressAccessService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthAccessService);
  private readonly clock = inject(CLOCK);
  private readonly rules = inject(ProgressConstructorService);

  private readonly cache = signal<ReadonlyMap<string, Progress>>(new Map());
  private readonly states = signal<ReadonlyMap<string, ProgressStatus>>(new Map());
  /** Cada recarga lleva un número: solo la más reciente puede escribir su resultado. */
  private sequence = 0;

  private readonly current = signal<Celebration | null>(null);
  private readonly level = signal<number | null>(null);

  constructor() {
    // Una celebración o subida de nivel pendiente es de quien la ganó: al cambiar de identidad se descarta.
    let previous = this.auth.userId();
    effect(() => {
      const uid = this.auth.userId();
      if (uid === previous) return;
      previous = uid;
      untracked(() => {
        this.current.set(null);
        this.level.set(null);
      });
    });
  }

  readonly progress = computed<Progress | null>(() => {
    const uid = this.auth.userId();
    return uid === null ? null : (this.cache().get(uid) ?? null);
  });

  readonly status = computed<ProgressStatus>(() => {
    const uid = this.auth.userId();
    return uid === null ? 'idle' : (this.states().get(uid) ?? 'idle');
  });

  /** Celebración pendiente de mostrar (o `null`). */
  readonly celebration = this.current.asReadonly();
  /** Nivel al que se acaba de subir (o `null`). */
  readonly levelUp = this.level.asReadonly();

  /** Lee el progreso con el día local. Un fallo conserva el último dato de esta apertura. */
  async load(): Promise<boolean> {
    const uid = this.auth.userId();
    if (uid === null) return false;
    const mine = ++this.sequence;
    if (!this.cache().has(uid)) this.setState(uid, 'loading');

    const data = await this.fetch();
    if (mine !== this.sequence) return data !== null; // otra recarga más nueva manda
    if (data === null) {
      if (!this.cache().has(uid)) this.setState(uid, 'error');
      else this.setState(uid, 'ready');
      return false;
    }
    this.cache.update((m) => new Map(m).set(uid, this.rules.toProgress(data)));
    this.setState(uid, 'ready');
    return true;
  }

  /**
   * Tras completar o desmarcar: recarga y compara con lo de antes. Solo con dato confirmado por el
   * servidor hay celebración; si falla, no se inventa nada.
   */
  async afterToggle(done: boolean, before: Progress | null): Promise<void> {
    const loaded = await this.load();
    const after = this.progress();
    if (!loaded || after === null) return;
    const celebration = this.rules.celebration(before, after, done);
    const visible = this.rules.xpText(celebration) !== null || celebration.streakDays !== null;
    this.current.set(visible ? celebration : null);
    this.level.set(celebration.leveledUpTo);
  }

  /** Borra de memoria lo de un usuario que sale (cierre de sesión o cuenta borrada). */
  forget(userId: string): void {
    this.cache.update((m) => {
      const next = new Map(m);
      next.delete(userId);
      return next;
    });
    this.states.update((m) => {
      const next = new Map(m);
      next.delete(userId);
      return next;
    });
  }

  dismissCelebration(): void {
    this.current.set(null);
  }

  consumeLevelUp(): void {
    this.level.set(null);
  }

  private async fetch(): Promise<ProgressRow | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const { data, error } = await this.supabase.client
        .rpc('get_progress', { p_today: toLocalDay(this.clock()) })
        .abortSignal(controller.signal);
      return error || !isRow(data) ? null : data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private setState(uid: string, state: ProgressStatus): void {
    this.states.update((m) => new Map(m).set(uid, state));
  }
}
