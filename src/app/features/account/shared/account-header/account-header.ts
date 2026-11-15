import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';

/** Cabecera fija de las pantallas de cuenta: botón atrás, título y círculo decorativo. */
@Component({
  selector: 'app-account-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './account-header.html',
  styleUrl: './account-header.scss',
})
export class AccountHeader {
  readonly title = input.required<string>();
  readonly back = output<void>();
}
