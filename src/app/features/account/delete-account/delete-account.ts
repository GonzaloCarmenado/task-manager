import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountErrorReason } from '../../../core/models/account';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountAccessService } from '../account.access.service';
import { AccountConstructorService } from '../account.constructor.service';
import { AccountField } from '../shared/account-field/account-field';
import { AccountHeader } from '../shared/account-header/account-header';
import { AccountToastService } from '../shared/account-toast/account-toast.service';

/** Borrar la cuenta y todos sus datos: pide la contraseña y una confirmación explícita. */
@Component({
  selector: 'app-delete-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountHeader, AccountField, Icon],
  templateUrl: './delete-account.html',
  styleUrl: './delete-account.scss',
})
export class DeleteAccount {
  private readonly access = inject(AccountAccessService);
  private readonly rules = inject(AccountConstructorService);
  private readonly toasts = inject(AccountToastService);
  private readonly router = inject(Router);

  protected readonly copy = this.rules.text.deleteAccount;
  protected readonly danger = this.rules.text.account;
  protected readonly shared = this.rules.text.create;

  protected readonly password = signal('');
  protected readonly accepted = signal(false);
  protected readonly loading = signal(false);
  private readonly failure = signal<AccountErrorReason | null>(null);

  protected readonly canSubmit = computed(
    () => this.password() !== '' && this.accepted() && !this.loading()
  );
  protected readonly passwordError = computed(() =>
    this.failure() === 'invalid-credentials'
      ? this.rules.errorText('invalid-credentials', 'delete')
      : null
  );
  /** Cualquier otro fallo (sin red, sin respuesta, servidor): no se ha borrado nada. */
  protected readonly formError = computed(() => {
    const reason = this.failure();
    if (reason === null || reason === 'invalid-credentials') return null;
    return this.rules.errorText(reason, 'delete');
  });

  protected onPassword(value: string): void {
    this.password.set(value);
    this.failure.set(null);
  }

  protected onAccept(event: Event): void {
    this.accepted.set((event.target as HTMLInputElement).checked);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.submit();
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.failure.set(null);
    this.loading.set(true);
    const result = await this.access.deleteAccount(this.password());
    this.loading.set(false);

    if (!result.ok) {
      this.failure.set(result.reason);
      return;
    }
    this.toasts.show(this.rules.text.toast.accountDeleted);
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/cuenta');
  }
}
