import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Task } from '../../../core/models/task';
import { AlarmsConstructorService } from '../../../core/services/alarms.constructor.service';
import { CLOCK } from '../../../core/services/clock';
import { Icon } from '../../../shared/components/icon/icon';
import { Illustration } from '../../../shared/components/illustration/illustration';
import { AccountAccessService } from '../../account/account.access.service';
import { AccountReminder } from '../../account/account-reminder/account-reminder';
import { ProfileButton } from '../../account/profile-button/profile-button';
import { Celebration } from '../../progress/celebration/celebration';
import { ProgressAccessService } from '../../progress/progress.access.service';
import { ProgressSummary } from '../../progress/progress-summary/progress-summary';
import { AlarmsBanner } from '../alarms/alarms-banner/alarms-banner';
import { AlarmsAccessService } from '../alarms/alarms.access.service';
import { ExactAlarmSheet } from '../alarms/exact-alarm-sheet/exact-alarm-sheet';
import {
  PostponeConstructorService,
  PostponeTarget,
} from '../postpone/postpone.constructor.service';
import { PostponeSheet } from '../postpone/postpone-sheet/postpone-sheet';
import { TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';
import { TasksNoticeService } from '../tasks-notice.service';

/** Lista de tareas agrupadas por fecha. Solo orquesta la UI: los datos vienen del servicio de acceso. */
@Component({
  selector: 'app-tasks-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    Illustration,
    AlarmsBanner,
    ExactAlarmSheet,
    PostponeSheet,
    ProgressSummary,
    Celebration,
    ProfileButton,
    AccountReminder,
  ],
  templateUrl: './tasks-list.html',
  styleUrl: './tasks-list.scss',
})
export class TasksList {
  protected readonly access = inject(TasksAccessService);
  protected readonly copy = inject(TasksConstructorService);
  protected readonly alarms = inject(AlarmsAccessService);
  private readonly alarmsCopy = inject(AlarmsConstructorService);
  private readonly postponeRules = inject(PostponeConstructorService);
  protected readonly progress = inject(ProgressAccessService);
  protected readonly account = inject(AccountAccessService);
  private readonly clock = inject(CLOCK);
  private readonly notices = inject(TasksNoticeService);
  protected readonly notice = this.notices.notice;
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** «Hoy»: se recalcula al volver a primer plano por si ha cambiado el día. */
  private readonly day = signal(this.copy.todayDay());

  protected readonly grouped = computed(() => {
    this.day();
    return this.copy.group(this.access.tasks());
  });
  protected readonly expanded = signal(false);
  /** Tarea cuya hoja de posponer está abierta. */
  protected readonly postponing = signal<Task | null>(null);

  private readonly onVisibility = () => {
    if (this.document.visibilityState !== 'visible') return;
    this.day.set(this.copy.todayDay());
    void this.access.load();
  };

  constructor() {
    void this.access.load();
    void this.progress.load();
    // Al subir de nivel se abre la pantalla de subida (una sola vez).
    effect(() => {
      const level = this.progress.levelUp();
      if (level !== null) void this.router.navigate(['/nivel', level]);
    });
    this.document.addEventListener('visibilitychange', this.onVisibility);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', this.onVisibility)
    );
  }

  protected retry(): void {
    void this.access.load();
  }

  protected create(): void {
    void this.router.navigate(['/nueva']);
  }

  protected open(task: Task): void {
    void this.router.navigate(['/', task.id]);
  }

  protected toggleCompleted(): void {
    this.expanded.update((v) => !v);
  }

  protected async toggle(task: Task): Promise<void> {
    const done = task.completedAt === null;
    const before = this.progress.progress();
    const result = await this.access.setCompleted(task.id, done);
    if (result.ok) {
      void this.progress.afterToggle(done, before);
      this.notices.show(done ? this.copy.list.doneNotice : this.copy.list.undoneNotice, false);
    } else {
      this.notices.show(this.copy.list.failNotice, true);
    }
  }

  protected startPostpone(task: Task): void {
    this.postponing.set(task);
  }

  protected async postpone(task: Task, target: PostponeTarget): Promise<void> {
    this.postponing.set(null);
    const result = await this.access.postpone(task.id, target);
    if (result.ok) {
      this.notices.show(this.postponeRules.noticeText(target, this.clock()), false);
    } else {
      this.notices.show(this.postponeRules.failNotice, true);
    }
  }

  /** `on` con aviso programado, `off` con hora futura pero sin permiso, y nada en navegador. */
  protected alarmState(task: Task): 'on' | 'off' | null {
    if (!this.alarms.supported) return null;
    if (this.alarms.hasScheduled(task.id)) return 'on';
    const withoutPermission = this.alarms.permission() !== 'granted';
    return withoutPermission && this.alarmsCopy.hasAlarm(task, this.clock()) ? 'off' : null;
  }

  protected alarmLabel(task: Task): string {
    const { indicator } = this.alarmsCopy.copy;
    return this.alarmState(task) === 'on'
      ? indicator.scheduled(task.dueTime ?? '')
      : indicator.none;
  }

  protected openNotificationSettings(): void {
    void this.alarms.openNotificationSettings();
  }

  protected openExactAlarmSettings(): void {
    void this.alarms.openExactAlarmSettings();
    this.alarms.skipExact();
  }

  protected isOverdue(task: Task): boolean {
    return this.copy.isOverdue(task);
  }

  protected dayLabel(day: string | null): string {
    return day === null ? '' : this.copy.dayLabel(day);
  }
}
