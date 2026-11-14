import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { AlarmsConstructorService } from '../../../../core/services/alarms.constructor.service';
import { Icon } from '../../../../shared/components/icon/icon';

/** Aviso previo al permiso de notificaciones (spec 006). Presentacional: emite la respuesta elegida. */
@Component({
  selector: 'app-alarm-permission-prompt',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './alarm-permission-prompt.html',
  styleUrl: './alarm-permission-prompt.scss',
})
export class AlarmPermissionPrompt {
  protected readonly copy = inject(AlarmsConstructorService).copy;

  /** Hay una petición del sistema en curso: se bloquean las acciones. */
  readonly busy = input(false);
  readonly allow = output<void>();
  readonly later = output<void>();
}
