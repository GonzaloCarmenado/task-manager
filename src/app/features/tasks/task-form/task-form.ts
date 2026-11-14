import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TITLE_MAX, Task, TaskInput } from '../../../core/models/task';
import { AlarmsConstructorService } from '../../../core/services/alarms.constructor.service';
import { CLOCK } from '../../../core/services/clock';
import { Icon } from '../../../shared/components/icon/icon';
import { AlarmPermissionPrompt } from '../alarms/alarm-permission-prompt/alarm-permission-prompt';
import { AlarmsAccessService } from '../alarms/alarms.access.service';
import {
  PostponeConstructorService,
  PostponeTarget,
} from '../postpone/postpone.constructor.service';
import { PostponeSheet } from '../postpone/postpone-sheet/postpone-sheet';
import { TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';
import { TasksNoticeService } from '../tasks-notice.service';

/** Formulario de tarea: crear (`/nueva`) y editar (`/:id`), con borrado confirmado dentro de la pantalla. */
@Component({
  selector: 'app-task-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, AlarmPermissionPrompt, PostponeSheet],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  protected readonly copy = inject(TasksConstructorService);
  private readonly access = inject(TasksAccessService);
  private readonly router = inject(Router);
  private readonly alarms = inject(AlarmsAccessService);
  private readonly alarmsCopy = inject(AlarmsConstructorService);
  private readonly clock = inject(CLOCK);
  private readonly postponeRules = inject(PostponeConstructorService);
  private readonly notices = inject(TasksNoticeService);
  private readonly document = inject(DOCUMENT);
  private readonly taskId = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly max = TITLE_MAX;
  protected readonly isEdit = this.taskId !== null;
  protected readonly today = this.copy.todayDay();
  protected readonly tomorrow = this.copy.tomorrowDay();

  protected readonly title = signal('');
  protected readonly dueDate = signal<string | null>(this.isEdit ? null : this.today);
  protected readonly dueTime = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingDelete = signal(false);
  protected readonly promptVisible = signal(false);
  protected readonly promptBusy = signal(false);
  /** Tarea que se está posponiendo (hoja abierta). */
  protected readonly postponing = signal<Task | null>(null);

  private readonly trimmed = computed(() => this.title().trim());
  /** Lo que se guarda: sin los espacios de los extremos (el contador y la validación coinciden). */
  protected readonly titleLength = computed(() => this.trimmed().length);

  /** Motivo por el que no se puede guardar (o `null` si el título es válido). */
  protected readonly titleProblem = computed(() => {
    const length = this.trimmed().length;
    if (length === 0) return this.copy.form.titleRequired;
    return length > TITLE_MAX ? this.copy.form.titleTooLong : null;
  });
  protected readonly isEmptyTitle = computed(() => this.trimmed().length === 0);
  protected readonly canSave = computed(() => this.titleProblem() === null && !this.saving());

  constructor() {
    if (this.taskId === null) return;
    const task = this.access.get(this.taskId);
    if (task) {
      this.fill(task);
      return;
    }
    // Entrada directa a una tarea todavía no cargada: se carga y, si no existe, se vuelve a la lista.
    void this.access.load().then(() => {
      const loaded = this.taskId === null ? undefined : this.access.get(this.taskId);
      if (loaded) this.fill(loaded);
      else void this.router.navigate(['/']);
    });
  }

  protected onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected setDate(day: string | null): void {
    this.dueDate.set(day === '' ? null : day);
    if (this.dueDate() === null) this.dueTime.set(null);
  }

  protected onDate(event: Event): void {
    this.setDate((event.target as HTMLInputElement).value);
  }

  protected onTime(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dueTime.set(value === '' ? null : value);
  }

  protected clearTime(): void {
    this.dueTime.set(null);
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set(null);
    const input = {
      title: this.trimmed(),
      dueDate: this.dueDate(),
      dueTime: this.dueDate() === null ? null : this.dueTime(),
    };
    const result =
      this.taskId === null
        ? await this.access.create(input)
        : await this.access.update(this.taskId, input);
    this.saving.set(false);
    if (!result.ok) {
      this.error.set(this.copy.form.saveError);
      return;
    }
    if (this.shouldAskAlarmPermission(input)) this.promptVisible.set(true);
    else void this.router.navigate(['/']);
  }

  /** Tras «Permitir»: pide el permiso del sistema y vuelve a la lista. */
  protected async allowAlarms(): Promise<void> {
    this.promptBusy.set(true);
    await this.alarms.requestPermission();
    this.promptBusy.set(false);
    this.promptVisible.set(false);
    void this.router.navigate(['/']);
  }

  /** «Ahora no»: se anota la negativa y se vuelve a la lista (queda el aviso discreto). */
  protected skipAlarms(): void {
    this.alarms.recordDenial();
    this.promptVisible.set(false);
    void this.router.navigate(['/']);
  }

  /** El aviso previo solo se ofrece al guardar una tarea con hora futura, y hasta 3 veces. */
  private shouldAskAlarmPermission(input: TaskInput): boolean {
    if (input.dueDate === null || input.dueTime === null) return false;
    if (!this.alarms.shouldAskPermission()) return false;
    const probe: Task = {
      id: '',
      title: input.title,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      completedAt: null,
      createdAt: '',
      postponedCount: 0,
    };
    return this.alarmsCopy.hasAlarm(probe, this.clock());
  }

  protected startPostpone(): void {
    const task = this.taskId === null ? undefined : this.access.get(this.taskId);
    if (task) this.postponing.set(task);
  }

  /** Pospone y vuelve a la lista con el aviso; si falla, se queda y avisa. */
  protected async postpone(task: Task, target: PostponeTarget): Promise<void> {
    this.postponing.set(null);
    this.error.set(null);
    const result = await this.access.postpone(task.id, target);
    if (!result.ok) {
      this.error.set(this.postponeRules.failNotice);
      return;
    }
    this.notices.show(this.postponeRules.noticeText(target, this.clock()), false);
    await this.sheetHistorySettled();
    void this.router.navigate(['/']);
  }

  /** Al cerrar la hoja se retira su entrada del historial: se espera a que termine antes de navegar. */
  private sheetHistorySettled(): Promise<void> {
    const view = this.document.defaultView;
    if (!view) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        view.removeEventListener('popstate', done);
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(done, 150);
      view.addEventListener('popstate', done);
    });
  }

  protected cancel(): void {
    void this.router.navigate(['/']);
  }

  protected askDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected keepTask(): void {
    this.confirmingDelete.set(false);
  }

  protected async confirmDelete(): Promise<void> {
    if (this.taskId === null) return;
    this.confirmingDelete.set(false);
    this.error.set(null);
    const result = await this.access.remove(this.taskId);
    if (result.ok) void this.router.navigate(['/']);
    else this.error.set(this.copy.form.deleteError);
  }

  private fill(task: Task): void {
    this.title.set(task.title);
    this.dueDate.set(task.dueDate);
    this.dueTime.set(task.dueTime);
  }
}
