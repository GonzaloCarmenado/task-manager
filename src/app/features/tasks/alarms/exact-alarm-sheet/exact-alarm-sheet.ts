import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AlarmsConstructorService } from '../../../../core/services/alarms.constructor.service';
import { Icon } from '../../../../shared/components/icon/icon';

/** Hoja que explica el permiso de «alarmas y recordatorios» (spec 006). Presentacional. */
@Component({
  selector: 'app-exact-alarm-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './exact-alarm-sheet.html',
  styleUrl: './exact-alarm-sheet.scss',
})
export class ExactAlarmSheet {
  protected readonly copy = inject(AlarmsConstructorService).copy;

  readonly openSettings = output<void>();
  readonly skip = output<void>();
}
