import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TITLE_MAX, Task } from '../../../core/models/task';
import { Icon } from '../../../shared/components/icon/icon';
import { TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';

/** Formulario de tarea: crear (`/nueva`) y editar (`/:id`), con borrado confirmado dentro de la pantalla. */
@Component({
  selector: 'app-task-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './task-form.html',
  styleUrl: './task-form.scss',
})
export class TaskForm {
  protected readonly copy = inject(TasksConstructorService);
  private readonly access = inject(TasksAccessService);
  private readonly router = inject(Router);
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
    if (result.ok) void this.router.navigate(['/']);
    else this.error.set(this.copy.form.saveError);
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
