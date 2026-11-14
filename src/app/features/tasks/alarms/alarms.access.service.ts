import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  InjectionToken,
  Injector,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  ALARM_CHANNEL_ID,
  ALARM_PREFS_KEY,
  AlarmPermission,
  AlarmPrefs,
  DEFAULT_ALARM_PREFS,
  ExactAlarmState,
  MAX_DENIALS,
} from '../../../core/models/alarm';
import { AlarmsConstructorService } from '../../../core/services/alarms.constructor.service';
import { CLOCK } from '../../../core/services/clock';
import { PlatformService } from '../../../core/services/platform.service';
import { toLocalDay } from '../../../core/utils/local-date';
import { TasksAccessService } from '../tasks.access.service';

/** Almacenamiento de las preferencias (local al dispositivo); se inyecta para poder simularlo. */
export const ALARM_STORAGE = new InjectionToken<Pick<Storage, 'getItem' | 'setItem'>>(
  'ALARM_STORAGE',
  { providedIn: 'root', factory: () => window.localStorage }
);

type NotificationApi = typeof import('@tauri-apps/plugin-notification');

const EXACT_STATES: readonly ExactAlarmState[] = ['allowed', 'not-allowed', 'not-needed'];

/**
 * Único contacto con las notificaciones locales y los ajustes del sistema (spec 006). Mantiene los
 * avisos del móvil en línea con las tareas **reconciliando**: programa lo que falta, cancela lo que
 * sobra y reprograma lo que cambió. En navegador no hace nada y no carga el plugin. Nunca escribe en
 * consola (los títulos de las tareas son datos del usuario).
 */
@Injectable({ providedIn: 'root' })
export class AlarmsAccessService {
  private readonly platform = inject(PlatformService);
  private readonly tasks = inject(TasksAccessService);
  private readonly clock = inject(CLOCK);
  private readonly storage = inject(ALARM_STORAGE);
  private readonly router = inject(Router);
  private readonly plan = inject(AlarmsConstructorService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  readonly supported = this.platform.isTauriAndroid();

  private readonly _permission = signal<AlarmPermission>(this.supported ? 'prompt' : 'unsupported');
  private readonly _exactAlarm = signal<ExactAlarmState>('unknown');
  private readonly exactSkipped = signal(false);
  private readonly prefs = signal<AlarmPrefs>(DEFAULT_ALARM_PREFS);
  private readonly scheduled = signal<ReadonlySet<number>>(new Set());
  private readonly now = signal(this.clock());

  readonly permission = this._permission.asReadonly();
  readonly exactAlarm = this._exactAlarm.asReadonly();

  /** Aviso discreto: hay tareas con hora por venir, el permiso no está concedido y no se cerró hoy. */
  readonly bannerVisible = computed(
    () =>
      this.supported &&
      this._permission() !== 'granted' &&
      this.prefs().bannerDismissedDay !== toLocalDay(this.now()) &&
      this.tasks.tasks().some((task) => this.plan.hasAlarm(task, this.now()))
  );

  private initialized = false;
  private launchNotificationId: number | null = null;
  private notificationApi: Promise<NotificationApi> | null = null;
  private channelReady = false;
  private chain: Promise<void> = Promise.resolve();
  private readonly onVisibility = () => {
    if (this.document.visibilityState !== 'visible') return;
    this.now.set(this.clock());
    void this.refresh();
  };

  initialize(): void {
    if (!this.supported || this.initialized) return;
    this.initialized = true;
    this.prefs.set(this.readPrefs());
    this.document.addEventListener('visibilitychange', this.onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', this.onVisibility)
    );
    effect(
      () => {
        this.tasks.tasks();
        untracked(() => {
          void this.reconcile();
          this.openLaunchTask();
        });
      },
      { injector: this.injector }
    );
    void this.start();
  }

  hasScheduled(taskId: string): boolean {
    return this.scheduled().has(this.plan.notificationId(taskId));
  }

  /** Hay que mostrar el aviso previo: sin permiso y con menos de 3 negativas. */
  shouldAskPermission(): boolean {
    return (
      this.supported && this._permission() !== 'granted' && this.prefs().deniedCount < MAX_DENIALS
    );
  }

  shouldOfferExact(): boolean {
    return (
      this._permission() === 'granted' &&
      this._exactAlarm() === 'not-allowed' &&
      !this.exactSkipped()
    );
  }

  skipExact(): void {
    this.exactSkipped.set(true);
  }

  /** Tras «Permitir»: pide el permiso del sistema. Una negativa se anota para no insistir más de 3 veces. */
  async requestPermission(): Promise<AlarmPermission> {
    if (!this.supported) return 'unsupported';
    try {
      const api = await this.api();
      if ((await api.requestPermission()) === 'granted') {
        this._permission.set('granted');
        await this.ensureChannel();
        await this.reconcile();
        return 'granted';
      }
    } catch {
      /* sin consola: se trata como una negativa */
    }
    this.recordDenial();
    return 'denied';
  }

  recordDenial(): void {
    const p = this.prefs();
    this.updatePrefs({ ...p, deniedCount: Math.min(MAX_DENIALS, p.deniedCount + 1) });
    if (this._permission() !== 'granted') this._permission.set('denied');
  }

  dismissBanner(): void {
    this.updatePrefs({ ...this.prefs(), bannerDismissedDay: toLocalDay(this.clock()) });
  }

  async openNotificationSettings(): Promise<void> {
    await this.invokeSettings('open_notification_settings');
  }

  async openExactAlarmSettings(): Promise<void> {
    await this.invokeSettings('open_exact_alarm_settings');
  }

  /** Pone los avisos del móvil en línea con las tareas. Las llamadas se encadenan (sin duplicados). */
  reconcile(): Promise<void> {
    this.chain = this.chain.then(() => this.doReconcile());
    return this.chain;
  }

  private async start(): Promise<void> {
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    await this.refreshPermission();
    await this.refreshExact();
    await this.reconcile();
    await this.readLaunchNotification();
  }

  private async refreshPermission(): Promise<void> {
    let granted = false;
    try {
      granted = await (await this.api()).isPermissionGranted();
    } catch {
      /* sin consola */
    }
    if (granted) {
      this._permission.set('granted');
      await this.ensureChannel();
    } else {
      this._permission.set(this.prefs().deniedCount > 0 ? 'denied' : 'prompt');
    }
  }

  private async refreshExact(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ state?: unknown }>(
        'plugin:app-settings|can_schedule_exact_alarms'
      );
      const state = result?.state;
      this._exactAlarm.set(EXACT_STATES.find((candidate) => candidate === state) ?? 'unknown');
    } catch {
      this._exactAlarm.set('unknown');
    }
  }

  private async ensureChannel(): Promise<void> {
    if (this.channelReady) return;
    try {
      const api = await this.api();
      const { channel } = this.plan.copy;
      await api.createChannel({
        id: ALARM_CHANNEL_ID,
        name: channel.name,
        description: channel.description,
        importance: api.Importance.High,
      });
      this.channelReady = true;
    } catch {
      /* sin consola */
    }
  }

  /**
   * Envía al plugin local el conjunto **completo** de avisos que debe haber. El plugin lo compara con
   * lo que tiene guardado (programa lo nuevo, cancela lo que sobra) y lo restaura tras un reinicio.
   */
  private async doReconcile(): Promise<void> {
    if (!this.supported || this._permission() !== 'granted') return;
    try {
      const now = this.clock();
      this.now.set(now);
      const wanted = this.plan.plan(this.tasks.tasks(), now);
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('plugin:app-settings|schedule_alarms', {
        alarms: wanted.map((alarm) => ({
          id: alarm.notificationId,
          at: alarm.at.getTime(),
          title: alarm.title,
          body: alarm.body,
        })),
      });
      this.scheduled.set(new Set(wanted.map((alarm) => alarm.notificationId)));
    } catch {
      /* sin consola: la siguiente reconciliación lo reintenta */
    }
  }

  /**
   * Si la app se abrió tocando el aviso de una tarea (arranque en frío), recuerda su identificador
   * de notificación; la tarea se abre en cuanto las tareas estén cargadas. Una sola vez.
   */
  private async readLaunchNotification(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{ notificationId?: unknown }>(
        'plugin:app-settings|launch_notification_id'
      );
      const id = result?.notificationId;
      if (typeof id === 'number') this.launchNotificationId = id;
    } catch {
      /* sin consola: se abre la lista */
    }
    this.openLaunchTask();
  }

  private openLaunchTask(): void {
    const id = this.launchNotificationId;
    const tasks = this.tasks.tasks();
    if (id === null || tasks.length === 0) return; // sin aviso de lanzamiento o tareas aún sin cargar
    this.launchNotificationId = null;
    const task = tasks.find((candidate) => this.plan.notificationId(candidate.id) === id);
    if (task) void this.router.navigate(['/', task.id]);
  }

  private async invokeSettings(command: string): Promise<void> {
    if (!this.supported) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke(`plugin:app-settings|${command}`);
    } catch {
      /* sin consola: el usuario puede abrir los ajustes a mano */
    }
  }

  private api(): Promise<NotificationApi> {
    this.notificationApi ??= import('@tauri-apps/plugin-notification');
    return this.notificationApi;
  }

  private updatePrefs(next: AlarmPrefs): void {
    this.prefs.set(next);
    try {
      this.storage.setItem(ALARM_PREFS_KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento: la preferencia dura solo esta apertura */
    }
  }

  private readPrefs(): AlarmPrefs {
    try {
      const raw = this.storage.getItem(ALARM_PREFS_KEY);
      if (!raw) return DEFAULT_ALARM_PREFS;
      const v = JSON.parse(raw) as Partial<Record<keyof AlarmPrefs, unknown>> | null;
      if (
        v !== null &&
        typeof v === 'object' &&
        typeof v.deniedCount === 'number' &&
        Number.isInteger(v.deniedCount) &&
        v.deniedCount >= 0 &&
        v.deniedCount <= MAX_DENIALS &&
        (v.bannerDismissedDay === null || typeof v.bannerDismissedDay === 'string')
      ) {
        return { deniedCount: v.deniedCount, bannerDismissedDay: v.bannerDismissedDay };
      }
    } catch {
      /* contenido corrupto o almacenamiento no disponible */
    }
    return DEFAULT_ALARM_PREFS;
  }
}
