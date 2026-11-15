import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountErrorReason } from '../../../core/models/account';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountAccessService } from '../account.access.service';
import { AccountConstructorService } from '../account.constructor.service';
import { AccountField } from '../shared/account-field/account-field';
import { AccountHeader } from '../shared/account-header/account-header';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { OfflineBanner } from '../shared/offline-banner/offline-banner';

/** Cambiar la contraseña de la cuenta abierta: pide la actual, la nueva y su repetición. */
@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountHeader, AccountField, OfflineBanner, Icon],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword {
  private readonly access = inject(AccountAccessService);
  private readonly rules = inject(AccountConstructorService);
  private readonly toasts = inject(AccountToastService);
  private readonly router = inject(Router);

  protected readonly copy = this.rules.text.changePassword;
  protected readonly shared = this.rules.text.create;

  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly repeat = signal('');
  protected readonly loading = signal(false);

  protected readonly nextTouched = signal(false);
  protected readonly repeatTouched = signal(false);
  private readonly nextBlurred = signal(false);
  private readonly repeatBlurred = signal(false);
  private readonly attempted = signal(false);
  private readonly failure = signal<AccountErrorReason | null>(null);

  protected readonly offline = computed(() => {
    const reason = this.failure();
    return reason === 'network' || reason === 'timeout';
  });
  /** Fallos que no corresponden a un campo concreto: se explican bajo el botón. */
  protected readonly formError = computed(() => {
    const reason = this.failure();
    if (reason === null || this.offline()) return null;
    if (
      reason === 'invalid-credentials' ||
      reason === 'same-password' ||
      reason === 'weak-password'
    )
      return null;
    return this.rules.errorText(reason, 'change-password');
  });

  private readonly username = computed(() => this.access.username() ?? '');
  protected readonly newRules = computed(() =>
    this.rules.passwordRules(this.next(), this.username(), this.nextTouched(), {
      notSameAs: this.current(),
    })
  );
  protected readonly match = computed(() => this.rules.matchState(this.next(), this.repeat()));
  protected readonly repeatRules = computed(() => [
    {
      key: 'match',
      text: this.shared.repeatRule,
      state: this.repeatTouched() ? this.match().state : ('idle' as const),
    },
  ]);

  private readonly newValid = computed(() =>
    this.rules.isPasswordValid(this.next(), this.username(), { notSameAs: this.current() })
  );
  protected readonly canSubmit = computed(
    () => this.current() !== '' && this.newValid() && this.match().state === 'ok' && !this.loading()
  );

  protected readonly currentError = computed(() =>
    this.failure() === 'invalid-credentials'
      ? this.rules.errorText('invalid-credentials', 'change-password')
      : null
  );
  protected readonly nextError = computed(() => {
    const reason = this.failure();
    if (reason === 'same-password') return this.rules.errorText('same-password', 'change-password');
    if (reason === 'weak-password') return this.shared.passwordError;
    const shown = this.nextBlurred() || this.attempted();
    return shown && !this.newValid() ? this.shared.passwordError : null;
  });
  protected readonly repeatError = computed(() => {
    const mismatch = this.match().state !== 'ok';
    const something = this.repeat() !== '' || this.attempted();
    return (this.repeatBlurred() || this.attempted()) && mismatch && something
      ? this.shared.repeatError
      : null;
  });

  protected onCurrent(value: string): void {
    this.current.set(value);
    this.clearFailure();
  }

  protected onNext(value: string): void {
    this.next.set(value);
    this.nextTouched.set(true);
    this.clearFailure();
  }

  protected onRepeat(value: string): void {
    this.repeat.set(value);
    this.repeatTouched.set(true);
    this.clearFailure();
  }

  protected onBlur(field: 'next' | 'repeat'): void {
    (field === 'next' ? this.nextBlurred : this.repeatBlurred).set(true);
  }

  /** Editar el formulario descarta los fallos del intento anterior (el banner sin conexión se queda). */
  private clearFailure(): void {
    if (!this.offline()) this.failure.set(null);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.submit();
  }

  protected async submit(): Promise<void> {
    if (this.loading()) return;
    this.attempted.set(true);
    if (!this.canSubmit()) return;

    this.failure.set(null);
    this.loading.set(true);
    const result = await this.access.changePassword(this.current(), this.next());
    this.loading.set(false);

    if (!result.ok) {
      this.failure.set(result.reason);
      return;
    }
    this.toasts.show(this.rules.text.toast.passwordChanged);
    await this.router.navigateByUrl('/cuenta', { replaceUrl: true });
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/cuenta');
  }
}
