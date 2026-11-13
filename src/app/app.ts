import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthAccessService } from './core/services/auth.access.service';
import { BiometricLockService } from './core/services/biometric-lock.service';
import { BiometricLockScreen } from './shared/components/biometric-lock-screen/biometric-lock-screen';
import { BiometricNotice } from './shared/components/biometric-notice/biometric-notice';
import { BiometricOffer } from './shared/components/biometric-offer/biometric-offer';
import { SessionStatus } from './shared/components/session-status/session-status';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SessionStatus, BiometricLockScreen, BiometricNotice, BiometricOffer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthAccessService);
  protected readonly lock = inject(BiometricLockService);

  /** SOLO DESARROLLO: la vista previa de estados no debe quedar tapada por la pantalla de sesión. */
  private readonly devPreview = isDevMode() && inject(Location).path().startsWith('/__dev/');

  /** La app no muestra contenido sin identidad: solo con `ready` (o en la vista previa de desarrollo). */
  protected readonly showApp = computed(() => this.devPreview || this.auth.status() === 'ready');

  /** Qué se superpone a la app: el bloqueo manda sobre el aviso y este sobre la oferta. */
  protected readonly overlay = computed<'lock' | 'notice' | 'offer' | null>(() => {
    if (this.lock.overlayVisible()) return 'lock';
    if (this.lock.noticeVisible()) return 'notice';
    if (this.lock.offerVisible()) return 'offer';
    return null;
  });
}
