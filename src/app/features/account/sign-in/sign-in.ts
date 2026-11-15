import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountErrorReason } from '../../../core/models/account';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountAccessService, SignInMode } from '../account.access.service';
import { AccountConstructorService } from '../account.constructor.service';
import { DiscardConfirm } from '../discard-confirm/discard-confirm';
import { LocalTasksSheet } from '../local-tasks-sheet/local-tasks-sheet';
import { AccountField } from '../shared/account-field/account-field';
import { AccountHeader } from '../shared/account-header/account-header';
import { OverlayBack } from '../shared/overlay-back/overlay-back';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { OfflineBanner } from '../shared/offline-banner/offline-banner';

/** Qué capa se muestra encima del formulario tras comprobar las credenciales. */
type Step = 'form' | 'sheet' | 'discard' | 'completed';

/** Iniciar sesión en una cuenta existente, preguntando antes qué hacer con las tareas de este móvil. */
@Component({
  selector: 'app-sign-in',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountHeader, AccountField, OfflineBanner, LocalTasksSheet, DiscardConfirm, Icon],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  private readonly access = inject(AccountAccessService);
  private readonly rules = inject(AccountConstructorService);
  private readonly toasts = inject(AccountToastService);
  private readonly router = inject(Router);
  private readonly overlays = inject(OverlayBack);

  protected readonly copy = this.rules.text.signIn;
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);
  protected readonly step = signal<Step>('form');
  private readonly failure = signal<AccountErrorReason | null>(null);

  protected readonly offline = computed(() => {
    const reason = this.failure();
    return reason === 'network' || reason === 'timeout';
  });
  /** Aviso «Acceso no válido»: cualquier fallo que no sea de conexión (mensaje genérico, sin pistas). */
  protected readonly errorText = computed(() => {
    const reason = this.failure();
    if (reason === null || this.offline()) return null;
    return this.rules.errorText(reason, 'signin');
  });
  private readonly filled = computed(() => this.username().trim() !== '' && this.password() !== '');

  protected readonly pendingCount = computed(
    () => this.access.signInSnapshot()?.pending.length ?? 0
  );
  protected readonly completedCount = computed(() => this.access.signInSnapshot()?.completed ?? 0);

  protected onUsername(value: string): void {
    this.username.set(value);
    this.clearFailure();
  }

  protected onPassword(value: string): void {
    this.password.set(value);
    this.clearFailure();
  }

  private clearFailure(): void {
    if (!this.offline()) this.failure.set(null);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.submit();
  }

  protected async submit(): Promise<void> {
    if (this.loading()) return;
    if (!this.filled()) {
      // Campos vacíos: mismo aviso genérico, sin molestar al servidor ni al límite de intentos.
      this.failure.set('invalid-credentials');
      return;
    }
    this.failure.set(null);
    this.loading.set(true);
    const result = await this.access.startSignIn(this.username(), this.password());
    this.loading.set(false);
    if (!result.ok) {
      this.failure.set(result.reason);
      return;
    }
    const snapshot = this.access.signInSnapshot();
    if (snapshot !== null && snapshot.pending.length > 0) this.step.set('sheet');
    else if (snapshot !== null && snapshot.completed > 0) this.step.set('completed');
    else await this.finish('none');
  }

  /** Cierra todas las capas y el historial se asienta antes de navegar, o el retroceso deshace la navegación. */
  protected async finish(mode: SignInMode): Promise<void> {
    const result = await this.access.finishSignIn(mode);
    await this.overlays.closeAll();
    this.step.set('form');
    if (!result.ok) {
      this.failure.set(result.reason);
      return;
    }
    const added = mode === 'merge' && !this.access.transferPending();
    this.toasts.show(added ? this.rules.text.toast.tasksAdded : this.rules.text.toast.signedIn);
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }

  protected askDiscard(): void {
    this.step.set('discard');
  }

  protected backToOptions(): void {
    this.step.set('sheet');
  }

  protected cancelFlow(): void {
    this.access.cancelSignIn();
    this.step.set('form');
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/cuenta');
  }
}
