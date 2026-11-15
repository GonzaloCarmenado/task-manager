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
  const forget = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthAccessService, useValue: { session, signOut, canSignOut } },
      { provide: TasksAccessService, useValue: { forget } },
    ],
  });
  return { service: TestBed.inject(AccountAccessService), session, signOut, canSignOut, forget };
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
