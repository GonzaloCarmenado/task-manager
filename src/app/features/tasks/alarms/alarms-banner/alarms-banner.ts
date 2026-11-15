import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AlarmsConstructorService } from '../../../../core/services/alarms.constructor.service';
import { Icon } from '../../../../shared/components/icon/icon';

/** Aviso discreto de «alarmas desactivadas» (spec 006). Presentacional: emite activar o cerrar. */
@Component({
  selector: 'app-alarms-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './alarms-banner.html',
  styleUrl: './alarms-banner.scss',
})
export class AlarmsBanner {
  protected readonly copy = inject(AlarmsConstructorService).copy;

  readonly activate = output<void>();
  readonly dismiss = output<void>();
}
