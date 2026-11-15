import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountConstructorService } from '../account.constructor.service';
import { OverlayBack } from '../shared/overlay-back/overlay-back';

let nextId = 0;

/**
 * Hoja «Tareas de este móvil»: se muestra tras comprobar las credenciales cuando hay tareas pendientes
 * sin cuenta. Presentacional: emite la decisión; el botón atrás de Android equivale a cancelar.
 */
@Component({
  selector: 'app-local-tasks-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './local-tasks-sheet.html',
  styleUrl: './local-tasks-sheet.scss',
})
export class LocalTasksSheet {
  protected readonly copy = inject(AccountConstructorService).text.localTasks;
  protected readonly titleId = `local-tasks-title-${nextId++}`;

  /** Número de tareas pendientes de este móvil. */
  readonly count = input.required<number>();
  readonly bring = output<void>();
  readonly useOnly = output<void>();
  readonly cancel = output<void>();

  constructor() {
    inject(OverlayBack).register(() => this.cancel.emit());
  }
}
