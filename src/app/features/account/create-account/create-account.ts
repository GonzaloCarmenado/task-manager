import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountErrorReason, USERNAME_MAX } from '../../../core/models/account';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountAccessService } from '../account.access.service';
import { AccountConstructorService } from '../account.constructor.service';
import { AccountField } from '../shared/account-field/account-field';
import { AccountHeader } from '../shared/account-header/account-header';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { OfflineBanner } from '../shared/offline-banner/offline-banner';

/** Crear cuenta: vincula la sesión anónima a un nombre de usuario y una contraseña. */
@Component({
  selector: 'app-create-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountHeader, AccountField, OfflineBanner, Icon],
  templateUrl: './create-account.html',
  styleUrl: './create-account.scss',
})
export class CreateAccount {
  private readonly access = inject(AccountAccessService);
  private readonly rules = inject(AccountConstructorService);
  private readonly toasts = inject(AccountToastService);
  private readonly router = inject(Router);

  protected readonly copy = this.rules.text.create;
  protected readonly maxName = USERNAME_MAX;

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly repeat = signal('');
  protected readonly accepted = signal(false);
  protected readonly loading = signal(false);

  /** Campo tocado: ya se ha escrito algo (las reglas pasan de gris a verde o rojo). */
  protected readonly userTouched = signal(false);
  protected readonly passwordTouched = signal(false);
  protected readonly repeatTouched = signal(false);
  /** Campo abandonado (o envío intentado): a partir de ahí se muestran los mensajes de error. */
  private readonly userBlurred = signal(false);
  private readonly passwordBlurred = signal(false);
  private readonly repeatBlurred = signal(false);
  private readonly attempted = signal(false);

  private readonly failure = signal<AccountErrorReason | null>(null);
  protected readonly offline = computed(() => {
    const reason = this.failure();
    return reason === 'network' || reason === 'timeout';
  });
  protected readonly formError = computed(() => {
    const reason = this.failure();
    if (reason === null || reason === 'network' || reason === 'timeout') return null;
    if (reason === 'username-taken' || reason === 'weak-password') return null;
    return this.rules.errorText(reason, 'create');
  });

  protected readonly usernameRules = computed(() =>
    this.rules.usernameRules(this.username(), this.userTouched())
  );
  protected readonly passwordRules = computed(() =>
    this.rules.passwordRules(this.password(), this.username(), this.passwordTouched())
  );
  protected readonly match = computed(() => this.rules.matchState(this.password(), this.repeat()));
  protected readonly repeatRules = computed(() => [
    {
      key: 'match',
      text: this.copy.repeatRule,
      state: this.repeatTouched() ? this.match().state : ('idle' as const),
    },
  ]);

  private readonly usernameValid = computed(() => this.rules.isUsernameValid(this.username()));
  private readonly passwordValid = computed(() =>
    this.rules.isPasswordValid(this.password(), this.username())
  );
  protected readonly canSubmit = computed(
    () =>
      this.usernameValid() &&
      this.passwordValid() &&
      this.match().state === 'ok' &&
      this.accepted() &&
      !this.loading()
  );

  protected readonly usernameError = computed(() => {
    if (this.failure() === 'username-taken')
      return this.rules.errorText('username-taken', 'create');
    return this.shown(this.userBlurred) && !this.usernameValid() ? this.copy.usernameError : null;
  });
  protected readonly passwordError = computed(() => {
    if (this.failure() === 'weak-password') return this.copy.passwordError;
    return this.shown(this.passwordBlurred) && !this.passwordValid()
      ? this.copy.passwordError
      : null;
  });
  protected readonly repeatError = computed(() => {
    const mismatch = this.match().state !== 'ok';
    const something = this.repeat() !== '' || this.attempted();
    return this.shown(this.repeatBlurred) && mismatch && something ? this.copy.repeatError : null;
  });

  private shown(blurred: () => boolean): boolean {
    return blurred() || this.attempted();
  }

  protected onUsername(value: string): void {
    this.username.set(value);
    this.userTouched.set(true);
    this.clearServerFailure();
  }

  protected onPassword(value: string): void {
    this.password.set(value);
    this.passwordTouched.set(true);
    this.clearServerFailure();
  }

  protected onRepeat(value: string): void {
    this.repeat.set(value);
    this.repeatTouched.set(true);
    this.clearServerFailure();
  }

  protected onAccept(event: Event): void {
    this.accepted.set((event.target as HTMLInputElement).checked);
  }

  protected onBlur(field: 'user' | 'password' | 'repeat'): void {
    const flag =
      field === 'user'
        ? this.userBlurred
        : field === 'password'
          ? this.passwordBlurred
          : this.repeatBlurred;
    flag.set(true);
  }

  /** Editar el formulario descarta los fallos del intento anterior (el banner sin conexión se queda). */
  private clearServerFailure(): void {
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
    const result = await this.access.createAccount(this.username(), this.password());
    this.loading.set(false);

    if (!result.ok) {
      this.failure.set(result.reason);
      return;
    }
    this.toasts.showSuccess(this.copy.successTitle, this.copy.successBody);
    await this.router.navigateByUrl('/cuenta', { replaceUrl: true });
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/cuenta');
  }
}
