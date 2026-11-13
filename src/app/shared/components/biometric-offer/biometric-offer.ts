import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { BiometricOfferConstructorService } from './biometric-offer.constructor.service';

/** Oferta de activar el bloqueo con huella (spec 004). Presentacional: emite la respuesta elegida. */
@Component({
  selector: 'app-biometric-offer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './biometric-offer.html',
  styleUrl: './biometric-offer.scss',
})
export class BiometricOffer {
  protected readonly copy = inject(BiometricOfferConstructorService);

  /** Hay una activación en curso (aviso del sistema abierto): se bloquean las acciones. */
  readonly activating = input(false);
  readonly accept = output<void>();
  readonly later = output<void>();
  readonly never = output<void>();
}
