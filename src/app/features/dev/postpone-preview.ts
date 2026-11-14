import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Task } from '../../core/models/task';
import { addDays, toLocalDay } from '../../core/utils/local-date';
import { PostponeSheet } from '../tasks/postpone/postpone-sheet/postpone-sheet';

const STATES = ['today', 'overdue', 'none', 'far'] as const;

/**
 * SOLO DESARROLLO: muestra la hoja de posponer con una tarea de ejemplo para revisarla en el
 * navegador (`/__dev/postpone/today | overdue | none | far`). La ruta solo existe con `isDevMode()`.
 */
@Component({
  selector: 'app-postpone-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PostponeSheet],
  template: `<app-postpone-sheet [task]="task" />`,
})
export class PostponePreview {
  private readonly requested = inject(ActivatedRoute).snapshot.paramMap.get('state') ?? '';
  private readonly state = STATES.find((s) => s === this.requested) ?? 'today';

  protected readonly task: Task = this.sample();

  private sample(): Task {
    const today = toLocalDay(new Date());
    const base = {
      id: 'preview',
      completedAt: null,
      createdAt: '2026-11-01T10:00:00.000Z',
      postponedCount: 0,
    };
    switch (this.state) {
      case 'overdue':
        return {
          ...base,
          title: 'Atrasada de ejemplo',
          dueDate: addDays(today, -3),
          dueTime: null,
        };
      case 'none':
        return { ...base, title: 'Sin fecha de ejemplo', dueDate: null, dueTime: null };
      case 'far':
        return {
          ...base,
          title: 'Lejana de ejemplo',
          dueDate: addDays(today, 30),
          dueTime: '09:00',
        };
      default:
        return { ...base, title: 'Hoy de ejemplo', dueDate: today, dueTime: '00:05' };
    }
  }
}
