import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountConstructorService } from '../account.constructor.service';

/** Tarjeta discreta «Crea tu respaldo personal» bajo el resumen de nivel. Presentacional. */
@Component({
  selector: 'app-account-reminder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink],
  templateUrl: './account-reminder.html',
  styleUrl: './account-reminder.scss',
})
export class AccountReminder {
  protected readonly copy = inject(AccountConstructorService).text.reminder;
  /** El aspa y «En 14 días» hacen lo mismo: ocultar la tarjeta 14 días. */
  readonly snooze = output<void>();
}
