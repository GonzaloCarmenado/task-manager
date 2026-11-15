import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountAccessService } from '../account.access.service';
import { AccountConstructorService } from '../account.constructor.service';
import { AccountLogoutDialog } from '../account-logout-dialog/account-logout-dialog';
import { AccountHeader } from '../shared/account-header/account-header';
import { AccountToastService } from '../shared/account-toast/account-toast.service';

/** Pantalla Cuenta: sin cuenta (datos locales y accesos) o con cuenta (usuario, ajustes y zona de peligro). */
@Component({
  selector: 'app-account-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountHeader, AccountLogoutDialog, Icon, RouterLink],
  templateUrl: './account-screen.html',
  styleUrl: './account-screen.scss',
})
export class AccountScreen {
  protected readonly access = inject(AccountAccessService);
  private readonly rules = inject(AccountConstructorService);
  private readonly toasts = inject(AccountToastService);
  private readonly router = inject(Router);

  protected readonly copy = this.rules.text.account;
  private readonly dialog = viewChild(AccountLogoutDialog);
  protected readonly logout = signal(false);
  protected readonly logoutBusy = signal(false);
  protected readonly logoutError = signal<string | null>(null);

  protected goBack(): void {
    void this.router.navigateByUrl('/');
  }

  protected openLogout(): void {
    this.logoutError.set(null);
    this.logout.set(true);
  }

  protected closeLogout(): void {
    if (this.logoutBusy()) return;
    this.logout.set(false);
    this.logoutError.set(null);
  }

  protected async confirmLogout(): Promise<void> {
    if (!this.access.canSignOut()) {
      this.logoutError.set(this.rules.errorText('network', 'create'));
      return;
    }
    // Al cerrar sesión la app pasa a «cargando» y destruye esta pantalla: el diálogo se cierra antes y
    // el historial se asienta, o el retroceso del diálogo deshace la navegación posterior.
    this.logoutBusy.set(true);
    await this.dialog()?.close();
    this.logout.set(false);
    const result = await this.access.signOut();
    this.logoutBusy.set(false);
    if (!result.ok) {
      this.toasts.show(this.rules.errorText(result.reason, 'create'));
      return;
    }
    this.toasts.show(this.rules.text.toast.signedOut);
    await this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
