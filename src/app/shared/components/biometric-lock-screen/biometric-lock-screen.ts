import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LockPhase } from '../../../core/models/biometric';
import { Icon } from '../icon/icon';
import { BiometricLockScreenConstructorService } from './biometric-lock-screen.constructor.service';

/**
 * Pantalla de bloqueo (spec 004). Presentacional: recibe la fase y emite «unlock».
 * No muestra ningún dato de la app.
 */
@Component({
  selector: 'app-biometric-lock-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './biometric-lock-screen.html',
  styleUrl: './biometric-lock-screen.scss',
})
export class BiometricLockScreen {
  protected readonly copy = inject(BiometricLockScreenConstructorService);

  readonly phase = input.required<LockPhase>();
  readonly unlock = output<void>();

  protected readonly phaseCopy = computed(() => this.copy.phaseCopy(this.phase()));
}
