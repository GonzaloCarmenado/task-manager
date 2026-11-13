import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LockPhase } from '../../core/models/biometric';
import { BiometricLockScreen } from '../../shared/components/biometric-lock-screen/biometric-lock-screen';
import { BiometricNotice } from '../../shared/components/biometric-notice/biometric-notice';
import { BiometricOffer } from '../../shared/components/biometric-offer/biometric-offer';

const PHASES: readonly LockPhase[] = ['prompting', 'cancelled', 'failed', 'lockout'];

/**
 * SOLO DESARROLLO: muestra la oferta, el aviso y cada fase del bloqueo para revisarlos en el
 * navegador (`/__dev/biometric/offer | notice | lock-prompting | lock-cancelled | lock-failed |
 * lock-lockout`). La ruta solo se registra con `isDevMode()`; no existe en producción.
 */
@Component({
  selector: 'app-biometric-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BiometricLockScreen, BiometricNotice, BiometricOffer],
  template: `
    @switch (view) {
      @case ('offer') {
        <app-biometric-offer />
      }
      @case ('notice') {
        <app-biometric-notice />
      }
      @default {
        <app-biometric-lock-screen [phase]="phase" />
      }
    }
  `,
})
export class BiometricPreview {
  private readonly state = inject(ActivatedRoute).snapshot.paramMap.get('state') ?? '';

  protected readonly view = this.state === 'offer' || this.state === 'notice' ? this.state : 'lock';
  protected readonly phase: LockPhase =
    PHASES.find((phase) => `lock-${phase}` === this.state) ?? 'cancelled';
}
