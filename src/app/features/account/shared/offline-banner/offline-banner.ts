import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { AccountConstructorService } from '../../account.constructor.service';

/** Aviso de «sin conexión» de los formularios de cuenta, con «Reintentar ahora». */
@Component({
  selector: 'app-offline-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './offline-banner.html',
  styleUrl: './offline-banner.scss',
})
export class OfflineBanner {
  protected readonly copy = inject(AccountConstructorService).text.create;
  readonly retry = output<void>();
}
