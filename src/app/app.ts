import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  computed,
  effect,
  inject,
  isDevMode,
  untracked,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthAccessService } from './core/services/auth.access.service';
import { BiometricLockService } from './core/services/biometric-lock.service';
import { BiometricLockScreen } from './shared/components/biometric-lock-screen/biometric-lock-screen';
import { BiometricNotice } from './shared/components/biometric-notice/biometric-notice';
import { BiometricOffer } from './shared/components/biometric-offer/biometric-offer';
import { AccountToast } from './features/account/shared/account-toast/account-toast';
import { SessionStatus } from './shared/components/session-status/session-status';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    SessionStatus,
    BiometricLockScreen,
    BiometricNotice,
    BiometricOffer,
    AccountToast,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthAccessService);
  protected readonly lock = inject(BiometricLockService);
  private readonly injector = inject(Injector);
  private destroyed = false;

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

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destroyed = true));
    // Con la identidad lista, se reanuda un traspaso de tareas que quedó a medias (cierre a mitad de entrar).
    effect(() => {
      if (this.auth.status() === 'ready') untracked(() => void this.resumeTransfer());
    });
  }

  /** La lógica de cuenta se carga bajo demanda: no engorda el paquete inicial. */
  private async resumeTransfer(): Promise<void> {
    const { AccountAccessService } = await import('./features/account/account.access.service');
    if (this.destroyed) return; // la app se cerró mientras se cargaba el módulo
    await this.injector.get(AccountAccessService).resumePendingTransfer();
  }
}
