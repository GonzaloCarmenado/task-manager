import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { AccountToastService } from './account-toast.service';

/** Aviso flotante inferior de las pantallas de cuenta. Se monta una sola vez en `app.html`. */
@Component({
  selector: 'app-account-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './account-toast.html',
  styleUrl: './account-toast.scss',
})
export class AccountToast {
  protected readonly service = inject(AccountToastService);
}
