import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { OverlayBack } from '../../../account/shared/overlay-back/overlay-back';
import { RecurrenceConstructorService } from '../recurrence.constructor.service';

export type SeriesChoiceMode = 'edit' | 'delete';

/** Hoja «Esta tarea se repite»: ¿solo esta ocurrencia o toda la serie? Presentacional. */
@Component({
  selector: 'app-series-choice-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './series-choice-sheet.html',
  styleUrl: './series-choice-sheet.scss',
})
export class SeriesChoiceSheet {
  protected readonly copy = inject(RecurrenceConstructorService);

  readonly mode = input.required<SeriesChoiceMode>();
  readonly single = output<void>();
  readonly series = output<void>();
  readonly cancel = output<void>();

  protected readonly texts = computed(() =>
    this.mode() === 'edit' ? this.copy.choice.edit : this.copy.choice.delete
  );

  constructor() {
    // El botón atrás de Android cancela la hoja, no la pantalla de debajo.
    inject(OverlayBack).register(() => this.cancel.emit());
  }
}
