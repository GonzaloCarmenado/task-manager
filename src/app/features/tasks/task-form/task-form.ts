import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Recurrence } from '../../../core/models/recurrence';
import { TITLE_MAX, Task, TaskInput } from '../../../core/models/task';
import { AlarmsConstructorService } from '../../../core/services/alarms.constructor.service';
import { CLOCK } from '../../../core/services/clock';
import { firstOnOrAfter } from '../../../core/utils/recurrence';
import { Icon } from '../../../shared/components/icon/icon';
import { AlarmPermissionPrompt } from '../alarms/alarm-permission-prompt/alarm-permission-prompt';
import { AlarmsAccessService } from '../alarms/alarms.access.service';
import {
  PostponeConstructorService,
  PostponeTarget,
} from '../postpone/postpone.constructor.service';
import { PostponeSheet } from '../postpone/postpone-sheet/postpone-sheet';
import { OverlayBack } from '../../account/shared/overlay-back/overlay-back';
import { RecurrenceConstructorService } from '../recurrence/recurrence.constructor.service';
import { RecurrenceSheet } from '../recurrence/recurrence-sheet/recurrence-sheet';
import { SeriesChoiceSheet } from '../recurrence/series-choice-sheet/series-choice-sheet';
import { TaskOpResult, TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';
import { TasksNoticeService } from '../tasks-notice.service';

/** Formulario de tarea: crear (`/nueva`) y editar (`/:id`), con borrado confirmado dentro de la pantalla. */
@Component({
  selector: 'app-task-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, AlarmPermissionPrompt, PostponeSheet, RecurrenceSheet, SeriesChoiceSheet],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  protected readonly copy = inject(TasksConstructorService);
  protected readonly repeatCopy = inject(RecurrenceConstructorService);
  private readonly access = inject(TasksAccessService);
  private readonly router = inject(Router);
  private readonly alarms = inject(AlarmsAccessService);
  private readonly alarmsCopy = inject(AlarmsConstructorService);
  private readonly clock = inject(CLOCK);
  private readonly postponeRules = inject(PostponeConstructorService);
  private readonly notices = inject(TasksNoticeService);
  private readonly overlay = inject(OverlayBack);
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
  /** Regla de repetición elegida (`null` = no se repite). */
  protected readonly recurrence = signal<Recurrence | null>(null);
  protected readonly choosingRepeat = signal(false);
  /** Se quitó la fecha de una tarea con repetición: se avisa de que ya no se repite. */
  protected readonly repeatCleared = signal(false);
  /** Regla con la que se abrió la tarea (para saber si cambió). */
  private originalRule: Recurrence | null = null;
  /** Tarea tal como se abrió (para saber si cambió algo y si es una ocurrencia). */
  private originalTask: Task | null = null;
  /** Hoja «Solo esta / Toda la serie» abierta al guardar o al borrar una ocurrencia. */
  protected readonly choice = signal<'edit' | 'delete' | null>(null);
  /** Lo que se guardará cuando se elija el alcance de la edición. */
  private pendingEdit: { input: TaskInput; rule: Recurrence | null } | null = null;

  protected readonly repeatText = computed(() => {
    const rule = this.recurrence();
    return rule === null ? this.repeatCopy.row.none : this.repeatCopy.describe(rule);
  });

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
    if (this.dueDate() === null) {
      this.dueTime.set(null);
      // Repetir exige fecha: sin ella la tarea ya no se repite.
      if (this.recurrence() !== null) {
        this.recurrence.set(null);
        this.repeatCleared.set(true);
      }
    } else {
      this.repeatCleared.set(false);
    }
  }

  protected startRepeat(): void {
    if (this.dueDate() !== null) this.choosingRepeat.set(true);
  }

  protected applyRepeat(rule: Recurrence | null): void {
    this.recurrence.set(rule);
    this.repeatCleared.set(false);
    this.choosingRepeat.set(false);
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
    const date = this.dueDate();
    const chosen = this.recurrence();
    // La regla empieza en la fecha final del formulario, aunque se cambiara después de elegirla.
    const rule: Recurrence | null =
      date !== null && chosen !== null ? { ...chosen, startDate: date } : null;
    const first = rule === null || date === null ? null : firstOnOrAfter(rule, date);
    if (rule !== null && first === null) {
      this.saving.set(false);
      this.error.set(this.copy.form.saveError);
      return;
    }
    const input: TaskInput = {
      title: this.trimmed(),
      dueDate: this.taskId === null && first !== null ? first : date,
      dueTime: date === null ? null : this.dueTime(),
    };
    if (this.taskId !== null && this.originalTask?.seriesId && sameRule(rule, this.originalRule)) {
      const before = this.originalTask;
      const changed =
        input.title !== before.title ||
        input.dueDate !== before.dueDate ||
        input.dueTime !== before.dueTime;
      this.saving.set(false);
      if (!changed) {
        void this.router.navigate(['/']);
        return;
      }
      this.pendingEdit = { input, rule };
      this.choice.set('edit');
      return;
    }
    const result = await this.persist(input, rule);
    this.saving.set(false);
    if (!result.ok) {
      this.error.set(this.copy.form.saveError);
      return;
    }
    if (this.shouldAskAlarmPermission(input)) this.promptVisible.set(true);
    else void this.router.navigate(['/']);
  }

  /** Crea o edita según haya o no repetición. */
  private async persist(input: TaskInput, rule: Recurrence | null): Promise<TaskOpResult> {
    if (this.taskId === null) {
      return this.access.create(rule === null ? input : { ...input, recurrence: rule });
    }
    const existing = this.access.get(this.taskId);
    const inSeries = existing?.seriesId !== null && existing?.seriesId !== undefined;
    if (!inSeries) {
      return rule === null
        ? this.access.update(this.taskId, input)
        : this.access.updateSeries(this.taskId, { ...input, recurrence: rule });
    }
    return this.access.updateSeries(this.taskId, { ...input, recurrence: rule });
  }

  /** «Solo esta» / «Toda la serie» al editar: aplica el cambio con ese alcance. */
  protected async confirmEdit(scope: 'single' | 'series'): Promise<void> {
    const pending = this.pendingEdit;
    if (this.taskId === null || pending === null) return;
    this.choice.set(null);
    this.saving.set(true);
    this.error.set(null);
    const result =
      scope === 'single'
        ? await this.access.updateOccurrence(this.taskId, pending.input)
        : await this.access.updateSeries(this.taskId, {
            ...pending.input,
            recurrence: pending.rule,
          });
    this.saving.set(false);
    if (!result.ok) {
      this.error.set(this.copy.form.saveError);
      return;
    }
    this.pendingEdit = null;
    await this.overlay.closeAll();
    void this.router.navigate(['/']);
  }

  protected cancelChoice(): void {
    this.choice.set(null);
    this.pendingEdit = null;
  }

  /** «Solo esta» / «Toda la serie» al borrar. */
  protected async confirmSeriesDelete(scope: 'single' | 'series'): Promise<void> {
    if (this.taskId === null) return;
    this.choice.set(null);
    this.error.set(null);
    const result =
      scope === 'single'
        ? await this.access.removeOccurrence(this.taskId)
        : await this.access.removeSeries(this.taskId);
    if (!result.ok) {
      this.error.set(this.copy.form.deleteError);
      return;
    }
    await this.overlay.closeAll();
    void this.router.navigate(['/']);
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
      seriesId: null,
      seriesDate: null,
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
    if (this.originalTask?.seriesId) this.choice.set('delete');
    else this.confirmingDelete.set(true);
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
    this.originalTask = task;
    const series = task.seriesId === null ? undefined : this.access.seriesOf(task);
    this.originalRule = series?.recurrence ?? null;
    this.recurrence.set(this.originalRule);
  }
}

/** Misma repetición, sin contar el día de inicio (que sigue a la fecha del formulario). */
function sameRule(a: Recurrence | null, b: Recurrence | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.kind === b.kind &&
    a.interval === b.interval &&
    a.monthDay === b.monthDay &&
    a.until === b.until &&
    a.weekdays.join() === b.weekdays.join()
  );
}
