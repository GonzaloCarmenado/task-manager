import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { BiometricNoticeConstructorService } from './biometric-notice.constructor.service';

/** Aviso de que el bloqueo con huella se desactivó solo (spec 004). Presentacional: emite «acknowledge». */
@Component({
  selector: 'app-biometric-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './biometric-notice.html',
  styleUrl: './biometric-notice.scss',
})
export class BiometricNotice {
  protected readonly copy = inject(BiometricNoticeConstructorService);

  readonly acknowledge = output<void>();
}
