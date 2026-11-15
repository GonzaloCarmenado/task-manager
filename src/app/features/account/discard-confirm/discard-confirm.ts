import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountConstructorService } from '../account.constructor.service';
import { OverlayBack } from '../shared/overlay-back/overlay-back';

let nextId = 0;

/**
 * Confirmación al usar solo la cuenta. `pending`: se descartan N tareas pendientes (destructivo);
 * `completed`: no hay pendientes pero sí N completadas, que no se suman (variante derivada).
 */
@Component({
  selector: 'app-discard-confirm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './discard-confirm.html',
  styleUrl: './discard-confirm.scss',
})
export class DiscardConfirm {
  private readonly copy = inject(AccountConstructorService).text.localTasks;
  protected readonly titleId = `discard-title-${nextId++}`;

  readonly count = input.required<number>();
  readonly variant = input<'pending' | 'completed'>('pending');
  readonly confirm = output<void>();
  readonly back = output<void>();

  protected readonly title = computed(() =>
    this.variant() === 'pending' ? this.copy.discardTitle : this.copy.completedOnlyTitle
  );
  protected readonly body = computed(() =>
    this.variant() === 'pending'
      ? this.copy.discardBody(this.count())
      : this.copy.completedOnlyBody(this.count())
  );
  protected readonly confirmLabel = computed(() =>
    this.variant() === 'pending' ? this.copy.discardConfirm : this.copy.completedOnlyConfirm
  );
  protected readonly backLabel = computed(() =>
    this.variant() === 'pending' ? this.copy.discardBack : this.copy.cancel
  );

  constructor() {
    inject(OverlayBack).register(() => this.back.emit());
  }
}
