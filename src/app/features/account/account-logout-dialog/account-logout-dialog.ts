import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Icon } from '../../../shared/components/icon/icon';
import { AccountConstructorService } from '../account.constructor.service';
import { OverlayBack } from '../shared/overlay-back/overlay-back';

let nextId = 0;

/** Confirmación de «Cerrar sesión». Presentacional: la pantalla hace el cierre y el aviso. */
@Component({
  selector: 'app-account-logout-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './account-logout-dialog.html',
  styleUrl: './account-logout-dialog.scss',
})
export class AccountLogoutDialog {
  protected readonly copy = inject(AccountConstructorService).text.logoutDialog;
  protected readonly titleId = `account-logout-title-${nextId++}`;

  /** Hay un cierre en curso: se bloquean los botones. */
  readonly busy = input(false);
  /** Motivo del último fallo (p. ej. sin conexión); permite reintentar. */
  readonly error = input<string | null>(null);
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  private readonly overlay = inject(OverlayBack).register(() => this.cancel.emit());

  /** Cierra la capa por código y espera a que el historial se asiente (antes de navegar). */
  close(): Promise<void> {
    return this.overlay.close();
  }

  protected onConfirm(): void {
    if (!this.busy()) this.confirm.emit();
  }
}
