import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthErrorReason } from '../../core/models/auth-status';
import { SessionStatus } from '../../shared/components/session-status/session-status';

const REASONS: readonly AuthErrorReason[] = [
  'network',
  'rate_limited',
  'disabled',
  'timeout',
  'service_unavailable',
  'unknown',
];

/**
 * SOLO DESARROLLO: muestra `SessionStatus` en cada estado para revisarlo en el navegador.
 * La ruta (`/__dev/session-status/:state`, `?auto=1` para el aviso de reintento automático)
 * solo se registra con `isDevMode()`; no existe en producción ni forma parte de la interfaz.
 */
@Component({
  selector: 'app-session-status-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SessionStatus],
  template: `
    <app-session-status [status]="status" [reason]="reason" [autoRetryPending]="autoRetryPending" />
  `,
})
export class SessionStatusPreview {
  private readonly route = inject(ActivatedRoute);

  private readonly state = this.route.snapshot.paramMap.get('state') ?? 'unknown';

  protected readonly status = this.state === 'loading' ? 'loading' : 'error';
  protected readonly reason: AuthErrorReason | null =
    this.state === 'loading'
      ? null
      : (REASONS.find((reason) => reason === this.state) ?? 'unknown');
  protected readonly autoRetryPending = this.route.snapshot.queryParamMap.get('auto') === '1';
}
