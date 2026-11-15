import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountResult } from '../../../core/models/account';
import { AccountAccessService } from '../account.access.service';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { AccountScreen } from './account-screen';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup(username: string | null = null) {
  const name = signal<string | null>(username);
  const signOut = vi.fn<() => Promise<AccountResult>>(async () => ({ ok: true }));
  const canSignOut = vi.fn(() => true);
  const access = {
    canSignOut,
    hasAccount: () => name() !== null,
    isAnonymous: () => name() === null,
    username: name,
    signOut,
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AccountScreen],
    providers: [provideRouter([]), { provide: AccountAccessService, useValue: access }],
  });
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AccountScreen);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const link = (text: string) =>
    Array.from(el.querySelectorAll('a')).find((a) => a.textContent?.includes(text)) as
      HTMLAnchorElement | undefined;
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as
      HTMLButtonElement | undefined;
  return { fixture, el, access, signOut, canSignOut, navigate, link, button, name };
}

describe('AccountScreen · sin cuenta', () => {
  it('US-011-03 muestra el título «Cuenta» en la cabecera', () => {
    const { el } = setup();
    expect(el.querySelector('app-account-header h1')?.textContent?.trim()).toBe('Cuenta');
  });

  it('US-011-03 explica que los datos viven solo en este móvil', () => {
    const { el } = setup();
    expect(el.textContent).toContain('ALMACENAMIENTO LOCAL ACTIVO');
    expect(el.textContent).toContain('Tus datos viven solo en este móvil');
    expect(el.textContent).toContain(
      'Tus tareas, tu racha y tus puntos de XP se guardan en la memoria de este móvil y se perderían si lo cambias o desinstalas la app.'
    );
  });

  it('US-011-03 la tarjeta «¿Cambias de móvil pronto?» invita a crear una cuenta gratuita', () => {
    const { el } = setup();
    expect(el.textContent).toContain('¿Cambias de móvil pronto?');
    expect(el.textContent).toContain(
      'Si quieres recuperar tus tareas y tu progreso en otro teléfono, crea una cuenta gratuita.'
    );
  });

  it('US-011-03 «Crear cuenta gratuita» lleva a /cuenta/crear e «Iniciar sesión» a /cuenta/entrar', () => {
    const { link } = setup();
    expect(link('Crear cuenta gratuita')?.getAttribute('href')).toBe('/cuenta/crear');
    expect(link('Ya tengo cuenta, iniciar sesión')?.getAttribute('href')).toBe('/cuenta/entrar');
  });

  it('US-011-03 el pie dice que la cuenta es opcional y no necesita correo', () => {
    const { el } = setup();
    expect(el.textContent).toContain('La cuenta es opcional y no necesita correo electrónico.');
  });

  it('US-011-03 sin cuenta no hay ajustes, zona de peligro ni cierre de sesión', () => {
    const { el } = setup();
    expect(el.textContent).not.toContain('AJUSTES DE CUENTA');
    expect(el.textContent).not.toContain('ZONA DE PELIGRO');
    expect(el.textContent).not.toContain('Cerrar sesión');
    expect(el.textContent).not.toContain('Borrar cuenta');
  });

  it('US-011-03 no muestra la rejilla de racha y XP del prototipo', () => {
    const { el } = setup();
    expect(el.querySelector('app-progress-summary')).toBeNull();
    expect(el.querySelector('[data-testid="streak"]')).toBeNull();
  });

  it('US-011-03 los elementos decorativos no se anuncian', () => {
    const { el } = setup();
    expect(el.querySelector('.mascot')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('US-011-03 el botón atrás vuelve a la lista de tareas', () => {
    const { el, navigate } = setup();
    (el.querySelector('button.back') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});

describe('AccountScreen · con cuenta', () => {
  it('US-011-04 muestra el nombre de usuario con @ y que los datos están en la cuenta', () => {
    const { el } = setup('carlos_ritmo');
    expect(el.querySelector('.username')?.textContent?.trim()).toBe('@carlos_ritmo');
    expect(el.textContent).toContain('Tus tareas y tu XP están guardados en tu cuenta');
  });

  it('US-011-04 no muestra el contenido de «sin cuenta»', () => {
    const { el, link } = setup('carlos_ritmo');
    expect(el.textContent).not.toContain('ALMACENAMIENTO LOCAL ACTIVO');
    expect(link('Crear cuenta gratuita')).toBeUndefined();
  });

  it('US-011-04 el panel de ajustes tiene «Cambiar contraseña» y «Cerrar sesión»', () => {
    const { el, link, button } = setup('carlos_ritmo');
    expect(el.textContent).toContain('AJUSTES DE CUENTA');
    expect(link('Cambiar contraseña')?.getAttribute('href')).toBe('/cuenta/contrasena');
    expect(link('Cambiar contraseña')?.textContent).toContain('Protección con clave segura');
    expect(button('Cerrar sesión')?.textContent).toContain('Tus datos seguirán en tu cuenta');
  });

  it('US-011-04 no ofrece cambiar el nombre de usuario', () => {
    const { el } = setup('carlos_ritmo');
    expect(el.textContent).not.toContain('Cambiar nombre de usuario');
  });

  it('US-011-04 la zona de peligro lleva a /cuenta/borrar', () => {
    const { el, link } = setup('carlos_ritmo');
    expect(el.textContent).toContain('ZONA DE PELIGRO');
    expect(el.textContent).toContain('Borrar cuenta permanentemente');
    expect(el.textContent).toContain(
      'Esta acción eliminará tu nombre de usuario, todas tus tareas guardadas, tus rachas y tu nivel de XP. No se puede revertir.'
    );
    expect(link('Borrar cuenta y datos')?.getAttribute('href')).toBe('/cuenta/borrar');
  });

  it('US-011-04 las filas y botones tienen una zona táctil propia (elementos interactivos reales)', () => {
    const { el } = setup('carlos_ritmo');
    expect(el.querySelectorAll('a.row, button.row').length).toBeGreaterThanOrEqual(2);
  });
});

describe('AccountScreen · cerrar sesión', () => {
  it('US-011-04 «Cerrar sesión» abre el diálogo de confirmación', () => {
    const { fixture, el, button } = setup('carlos_ritmo');
    expect(el.querySelector('app-account-logout-dialog')).toBeNull();
    button('Cerrar sesión')?.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('US-011-04 «Cancelar» cierra el diálogo sin tocar la sesión', () => {
    const { fixture, el, button, signOut } = setup('carlos_ritmo');
    button('Cerrar sesión')?.click();
    fixture.detectChanges();
    (
      Array.from(el.querySelectorAll('[role="alertdialog"] button')).find(
        (b) => b.textContent?.trim() === 'Cancelar'
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });

  it('US-011-04 «Sí, cerrar sesión» cierra, avisa «Sesión cerrada» y vuelve a la lista', async () => {
    const { fixture, el, button, signOut, navigate } = setup('carlos_ritmo');
    button('Cerrar sesión')?.click();
    fixture.detectChanges();
    (
      Array.from(el.querySelectorAll('[role="alertdialog"] button')).find(
        (b) => b.textContent?.trim() === 'Sí, cerrar sesión'
      ) as HTMLButtonElement
    ).click();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    fixture.detectChanges();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Sesión cerrada',
    });
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
  });

  const confirmButton = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('[role="alertdialog"] button')).find(
      (b) => b.textContent?.trim() === 'Sí, cerrar sesión'
    ) as HTMLButtonElement;

  it('US-011-04 sin conexión explica el motivo en el diálogo y no cierra nada', async () => {
    const { fixture, el, button, signOut, canSignOut, navigate } = setup('carlos_ritmo');
    canSignOut.mockReturnValue(false);
    button('Cerrar sesión')?.click();
    fixture.detectChanges();
    confirmButton(el).click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alertdialog"] .error')?.textContent).toContain(
      'Sin conexión a Internet'
    );
    expect(signOut).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(AccountToastService).toast()).toBeNull();
  });

  it('US-011-04 el historial retrocede y se asienta antes de cerrar la sesión', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
    });
    const { fixture, el, button, signOut } = setup('carlos_ritmo');
    let backsAtSignOut = -1;
    signOut.mockImplementation(async () => {
      backsAtSignOut = back.mock.calls.length;
      return { ok: true };
    });
    button('Cerrar sesión')?.click();
    fixture.detectChanges();
    confirmButton(el).click();
    await vi.waitFor(() => expect(signOut).toHaveBeenCalled());

    expect(backsAtSignOut).toBe(1);
    back.mockRestore();
  });

  it('US-011-04 si el cierre falla de forma inesperada avisa y no navega', async () => {
    const { fixture, el, button, signOut, navigate } = setup('carlos_ritmo');
    signOut.mockResolvedValue({ ok: false, reason: 'unknown' });
    button('Cerrar sesión')?.click();
    fixture.detectChanges();
    confirmButton(el).click();
    await vi.waitFor(() => expect(signOut).toHaveBeenCalled());
    await fixture.whenStable();

    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'No se ha podido completar la operación. Inténtalo de nuevo.',
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('AccountScreen · estructura', () => {
  it('US-011-03 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountScreen as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
