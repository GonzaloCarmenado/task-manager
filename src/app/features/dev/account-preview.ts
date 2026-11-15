import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AccountResult, LocalTasksSnapshot } from '../../core/models/account';
import { AccountAccessService } from '../account/account.access.service';
import { AccountConstructorService } from '../account/account.constructor.service';
import { AccountLogoutDialog } from '../account/account-logout-dialog/account-logout-dialog';
import { AccountScreen } from '../account/account-screen/account-screen';
import { CreateAccount } from '../account/create-account/create-account';
import { SignIn } from '../account/sign-in/sign-in';
import { AccountField } from '../account/shared/account-field/account-field';
import { AccountHeader } from '../account/shared/account-header/account-header';
import { AccountToastService } from '../account/shared/account-toast/account-toast.service';
import { OfflineBanner } from '../account/shared/offline-banner/offline-banner';

const STATES = ['fields', 'errors', 'valid', 'toast'] as const;
type PreviewState = (typeof STATES)[number];

/** Resultado simulado de crear cuenta: `normal` (ok), `taken` (nombre ocupado), `offline` o `slow` (sin fin). */
function sampleCreate(state: string): () => Promise<AccountResult> {
  if (state === 'taken') return async () => ({ ok: false, reason: 'username-taken' });
  if (state === 'offline') return async () => ({ ok: false, reason: 'network' });
  if (state === 'slow') return () => new Promise<AccountResult>(() => undefined);
  return async () => ({ ok: true });
}

/**
 * Inicio de sesión simulado: `form` (entra sin tareas locales), `error`, `limit`, `offline`, `sheet`
 * (2 pendientes y 1 completada) y `completed` (solo 3 completadas).
 */
function sampleSignIn(state: string) {
  const snapshot = signal<LocalTasksSnapshot | null>(null);
  const pending = [
    { title: 'Comprar pan', dueDate: null, dueTime: null },
    { title: 'Llamar al banco', dueDate: null, dueTime: null },
  ];
  return {
    signInSnapshot: snapshot,
    transferPending: signal(false),
    startSignIn: async (): Promise<AccountResult> => {
      if (state === 'error') return { ok: false, reason: 'invalid-credentials' };
      if (state === 'limit') return { ok: false, reason: 'rate-limited' };
      if (state === 'offline') return { ok: false, reason: 'network' };
      if (state === 'sheet') snapshot.set({ pending, completed: 1 });
      else if (state === 'completed') snapshot.set({ pending: [], completed: 3 });
      else snapshot.set({ pending: [], completed: 0 });
      return { ok: true };
    },
    finishSignIn: async (): Promise<AccountResult> => ({ ok: true }),
    cancelSignIn: () => snapshot.set(null),
  };
}

/** Datos de ejemplo de la pantalla Cuenta: `anonymous`, `account` o `dialog` (con cuenta y el diálogo abierto). */
function sampleAccess(state: string) {
  const withAccount = state === 'account' || state === 'dialog';
  return {
    hasAccount: () => withAccount,
    isAnonymous: () => !withAccount,
    username: () => (withAccount ? 'carlos_ritmo' : null),
    canSignOut: () => true,
    signOut: async () => ({ ok: true as const }),
    createAccount: sampleCreate(state),
    ...sampleSignIn(state),
  };
}

/**
 * SOLO DESARROLLO: muestra los componentes de cuenta con datos de ejemplo y sin backend para revisarlos
 * en el navegador (`/__dev/account/<pantalla>/<estado>`). La ruta solo existe con `isDevMode()`.
 * Pantalla `base`: campos y cabecera. Estados: `fields`, `errors`, `valid` y `toast`.
 * Pantalla `cuenta`: la pantalla Cuenta con datos de ejemplo. Estados: `anonymous`, `account` y `dialog`.
 * Pantalla `crear`: Crear cuenta con un servicio simulado. Estados: `normal`, `taken`, `offline` y `slow`.
 * Pantalla `entrar`: Iniciar sesión. Estados: `form`, `error`, `limit`, `offline`, `sheet` y `completed`.
 */
@Component({
  selector: 'app-account-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountHeader,
    AccountField,
    OfflineBanner,
    AccountScreen,
    AccountLogoutDialog,
    CreateAccount,
    SignIn,
  ],
  providers: [
    {
      provide: AccountAccessService,
      useFactory: () => sampleAccess(inject(ActivatedRoute).snapshot.paramMap.get('state') ?? ''),
    },
  ],
  template: `
    @if (screen === 'crear') {
      <app-create-account />
    } @else if (screen === 'entrar') {
      <app-sign-in />
    } @else if (screen === 'cuenta') {
      <app-account-screen />
      @if (requested === 'dialog') {
        <app-account-logout-dialog />
      }
    } @else {
      <app-account-header title="Crear cuenta" />
      <main class="page">
        @if (state === 'errors') {
          <app-offline-banner />
        }
        <app-account-field
          data-preview="card"
          label="Nombre de usuario"
          icon="at"
          placeholder="ej. carlos_ritmo"
          autocomplete="username"
          trailingIcon="id-card"
          [hint]="username().length + '/24'"
          [rules]="rules.usernameRules(username(), touched)"
          [error]="state === 'errors' ? copy.usernameError : null"
          [(value)]="username"
        />
        <app-account-field
          data-preview="card"
          label="Contraseña"
          icon="key"
          type="password"
          placeholder="••••••••••••"
          autocomplete="new-password"
          hint="Mín. 8"
          [rules]="rules.passwordRules(password(), username(), touched)"
          [error]="state === 'errors' ? copy.passwordError : null"
          [(value)]="password"
        />
        <app-account-field
          data-preview="card"
          label="Repetir contraseña"
          icon="verified-user"
          type="password"
          placeholder="••••••••••••"
          autocomplete="new-password"
          [hint]="match().label"
          [hintTone]="match().state"
          [error]="state === 'errors' ? copy.repeatError : null"
          [(value)]="repeat"
        />
        <app-account-field
          data-preview="block"
          variant="block"
          label="Nombre de usuario"
          icon="id-card"
          side="Identificador único"
          placeholder="tu nombre de usuario"
          autocomplete="username"
          [(value)]="signInUser"
        />
        <app-account-field
          data-preview="block"
          variant="block"
          label="Contraseña"
          icon="lock"
          type="password"
          autocomplete="current-password"
          [(value)]="signInPassword"
        />
      </main>
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--color-bg);
      font-family: var(--font-family);
    }
    .page {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-margin) var(--space-margin) 40px;
    }
  `,
})
export class AccountPreview {
  protected readonly rules = inject(AccountConstructorService);
  protected readonly copy = this.rules.text.create;
  private readonly toasts = inject(AccountToastService);

  private readonly route = inject(ActivatedRoute).snapshot.paramMap;
  protected readonly screen = this.route.get('screen') ?? 'base';
  protected readonly requested = this.route.get('state') ?? '';
  protected readonly state: PreviewState = STATES.find((s) => s === this.requested) ?? 'fields';

  protected readonly touched = this.state !== 'fields';
  protected readonly username = signal(
    this.state === 'errors' ? 'ab' : this.state === 'fields' ? '' : 'carlos_ritmo'
  );
  protected readonly password = signal(
    this.state === 'errors' ? 'corta' : this.state === 'fields' ? '' : 'MiClaveSegura'
  );
  protected readonly repeat = signal(
    this.state === 'errors' ? 'otra' : this.state === 'fields' ? '' : 'MiClaveSegura'
  );
  protected readonly signInUser = signal('');
  protected readonly signInPassword = signal('');
  protected readonly match = computed(() => this.rules.matchState(this.password(), this.repeat()));

  constructor() {
    if (this.state === 'toast') this.toasts.show(this.rules.text.toast.passwordChanged);
  }
}
