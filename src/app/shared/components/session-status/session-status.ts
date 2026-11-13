import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AuthErrorReason, AuthStatus } from '../../../core/models/auth-status';
import { Icon } from '../icon/icon';
import { SessionStatusConstructorService } from './session-status.constructor.service';

type View = 'loading' | 'error' | 'none';

/**
 * Pantallas de arranque de la sesión: carga (indeterminada) y error con 5 variantes.
 * Presentacional: recibe el estado y emite «retry». `idle` se trata como `loading`.
 */
@Component({
  selector: 'app-session-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './session-status.html',
  styleUrl: './session-status.scss',
})
export class SessionStatus {
  protected readonly copy = inject(SessionStatusConstructorService);

  readonly status = input.required<AuthStatus>();
  readonly reason = input<AuthErrorReason | null>(null);
  readonly autoRetryPending = input(false);
  readonly retry = output<void>();

  protected readonly view = computed<View>(() => {
    switch (this.status()) {
      case 'idle':
      case 'loading':
        return 'loading';
      case 'error':
        return 'error';
      case 'ready':
        return 'none';
    }
  });

  protected readonly errorCopy = computed(() => this.copy.errorCopy(this.reason() ?? 'unknown'));

  /** 6 motivos → 5 variantes: `disabled` comparte la de servicio no disponible. */
  protected readonly variant = computed(() => {
    const reason = this.reason() ?? 'unknown';
    return reason === 'disabled' ? 'service_unavailable' : reason;
  });
}
