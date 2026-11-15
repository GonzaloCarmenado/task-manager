import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountResult } from '../../core/models/account';
import { AuthSession } from '../../core/models/auth-session';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { TasksAccessService } from '../tasks/tasks.access.service';
import { AccountAccessService } from './account.access.service';

const ACCOUNT: AuthSession = {
  user: { id: 'user-1', isAnonymous: false, username: 'carlos_ritmo' },
  expiresAt: 0,
};
const ANONYMOUS: AuthSession = {
  user: { id: 'anon-1', isAnonymous: true, username: null },
  expiresAt: 0,
};

function setup(initial: AuthSession | null = ANONYMOUS) {
  const session = signal<AuthSession | null>(initial);
  const signOut = vi.fn<() => Promise<AccountResult>>(async () => ({ ok: true }));
  const canSignOut = vi.fn(() => true);
  const linkAccount = vi.fn<(u: string, p: string) => Promise<AccountResult>>(async () => ({
    ok: true,
  }));
  const forget = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthAccessService, useValue: { session, signOut, canSignOut, linkAccount } },
      { provide: TasksAccessService, useValue: { forget } },
    ],
  });
  return {
    service: TestBed.inject(AccountAccessService),
    session,
    signOut,
    canSignOut,
    linkAccount,
    forget,
  };
}

describe('AccountAccessService · sesión', () => {
  it('US-011-04 sin cuenta: isAnonymous y sin nombre de usuario', () => {
    const { service } = setup(ANONYMOUS);
    expect(service.hasAccount()).toBe(false);
    expect(service.isAnonymous()).toBe(true);
    expect(service.username()).toBeNull();
  });

  it('US-011-04 con cuenta: hasAccount y el nombre de usuario de la sesión', () => {
    const { service } = setup(ACCOUNT);
    expect(service.hasAccount()).toBe(true);
    expect(service.isAnonymous()).toBe(false);
    expect(service.username()).toBe('carlos_ritmo');
  });

  it('US-011-04 sin sesión no hay cuenta ni se considera anónima', () => {
    const { service } = setup(null);
    expect(service.hasAccount()).toBe(false);
    expect(service.isAnonymous()).toBe(false);
    expect(service.username()).toBeNull();
  });

  it('US-011-04 reacciona cuando la sesión cambia', () => {
    const { service, session } = setup(ANONYMOUS);
    session.set(ACCOUNT);
    expect(service.username()).toBe('carlos_ritmo');
    session.set(ANONYMOUS);
    expect(service.hasAccount()).toBe(false);
  });
});

describe('AccountAccessService · cerrar sesión', () => {
  it('US-011-04 canSignOut delega en la identidad (sin red no se puede cerrar)', () => {
    const { service, canSignOut } = setup(ACCOUNT);
    expect(service.canSignOut()).toBe(true);
    canSignOut.mockReturnValue(false);
    expect(service.canSignOut()).toBe(false);
  });

  it('US-011-04 signOut delega y vacía de memoria las tareas de la cuenta saliente', async () => {
    const { service, signOut, forget } = setup(ACCOUNT);

    expect(await service.signOut()).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(forget).toHaveBeenCalledWith('user-1');
  });

  it('US-011-04 si el cierre falla no se vacía nada y se devuelve el motivo', async () => {
    const { service, signOut, forget } = setup(ACCOUNT);
    signOut.mockResolvedValue({ ok: false, reason: 'network' });

    expect(await service.signOut()).toEqual({ ok: false, reason: 'network' });
    expect(forget).not.toHaveBeenCalled();
  });

  it('US-011-04 una sesión anónima no puede cerrar sesión y no toca nada', async () => {
    const { service, signOut, forget } = setup(ANONYMOUS);

    expect(await service.signOut()).toEqual({ ok: false, reason: 'unauthorized' });
    expect(signOut).not.toHaveBeenCalled();
    expect(forget).not.toHaveBeenCalled();
  });
});

describe('AccountAccessService · crear cuenta', () => {
  const PASSWORD = ['Mi', 'Clave', 'Segura1'].join('');

  it('US-011-01 vincula la sesión anónima con el nombre normalizado y la contraseña', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);

    expect(await service.createAccount('  Carlos_Ritmo ', PASSWORD)).toEqual({ ok: true });

    expect(linkAccount).toHaveBeenCalledTimes(1);
    expect(linkAccount).toHaveBeenCalledWith('carlos_ritmo', PASSWORD);
  });

  it('US-011-01 conserva las tareas y el progreso: no se vacía nada de memoria', async () => {
    const { service, forget } = setup(ANONYMOUS);
    await service.createAccount('carlos_ritmo', PASSWORD);
    expect(forget).not.toHaveBeenCalled();
  });

  it('US-011-01 un nombre con formato inválido se rechaza sin llamar al servidor', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);

    for (const bad of ['ab', 'a'.repeat(25), 'ana lopez', 'ana@mail', '']) {
      expect(await service.createAccount(bad, PASSWORD), bad).toEqual({
        ok: false,
        reason: 'invalid-username',
      });
    }
    expect(linkAccount).not.toHaveBeenCalled();
  });

  it('US-011-01 una contraseña que no cumple las reglas se rechaza sin llamar al servidor', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);

    expect(await service.createAccount('carlos_ritmo', 'corta')).toEqual({
      ok: false,
      reason: 'weak-password',
    });
    expect(await service.createAccount('carlos_ritmo', 'Carlos_Ritmo')).toEqual({
      ok: false,
      reason: 'weak-password',
    });
    expect(linkAccount).not.toHaveBeenCalled();
  });

  it('US-011-01 devuelve tal cual el motivo del servidor (nombre ocupado, sin red…)', async () => {
    const { service, linkAccount } = setup(ANONYMOUS);
    for (const reason of ['username-taken', 'network', 'timeout', 'rate-limited'] as const) {
      linkAccount.mockResolvedValueOnce({ ok: false, reason });
      expect(await service.createAccount('carlos_ritmo', PASSWORD)).toEqual({ ok: false, reason });
    }
  });

  it('US-011-01 quien ya tiene cuenta, o no hay sesión, no puede crear otra', async () => {
    const withAccount = setup(ACCOUNT);
    expect(await withAccount.service.createAccount('otro_nombre', PASSWORD)).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
    expect(withAccount.linkAccount).not.toHaveBeenCalled();

    const none = setup(null);
    expect(await none.service.createAccount('otro_nombre', PASSWORD)).toEqual({
      ok: false,
      reason: 'unauthorized',
    });
  });
});
