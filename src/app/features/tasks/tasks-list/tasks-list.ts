import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Task } from '../../../core/models/task';
import { Icon } from '../../../shared/components/icon/icon';
import { TasksAccessService } from '../tasks.access.service';
import { TasksConstructorService } from '../tasks.constructor.service';

const NOTICE_MS = 3_000;

interface Notice {
  readonly text: string;
  readonly error: boolean;
}

/** Lista de tareas agrupadas por fecha. Solo orquesta la UI: los datos vienen del servicio de acceso. */
@Component({
  selector: 'app-tasks-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './tasks-list.html',
  styleUrl: './tasks-list.scss',
})
export class TasksList {
  protected readonly access = inject(TasksAccessService);
  protected readonly copy = inject(TasksConstructorService);
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
  protected readonly notice = signal<Notice | null>(null);

  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly onVisibility = () => {
    if (this.document.visibilityState !== 'visible') return;
    this.day.set(this.copy.todayDay());
    void this.access.load();
  };

  constructor() {
    void this.access.load();
    this.document.addEventListener('visibilitychange', this.onVisibility);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', this.onVisibility);
      clearTimeout(this.noticeTimer);
    });
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
    const result = await this.access.setCompleted(task.id, done);
    if (result.ok) {
      this.showNotice(done ? this.copy.list.doneNotice : this.copy.list.undoneNotice, false);
    } else {
      this.showNotice(this.copy.list.failNotice, true);
    }
  }

  protected isOverdue(task: Task): boolean {
    return this.copy.isOverdue(task);
  }

  protected dayLabel(day: string | null): string {
    return day === null ? '' : this.copy.dayLabel(day);
  }

  private showNotice(text: string, error: boolean): void {
    clearTimeout(this.noticeTimer);
    this.notice.set({ text, error });
    this.noticeTimer = setTimeout(() => this.notice.set(null), NOTICE_MS);
  }
}
