import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountResult } from '../../../core/models/account';
import { AccountAccessService } from '../account.access.service';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { DeleteAccount } from './delete-account';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const PASS = ['Clave', 'Segura', '123'].join('');

function setup() {
  const deleteAccount = vi.fn<(p: string) => Promise<AccountResult>>(async () => ({ ok: true }));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DeleteAccount],
    providers: [provideRouter([]), { provide: AccountAccessService, useValue: { deleteAccount } }],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(DeleteAccount);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;

  const input = () => el.querySelector('input.input') as HTMLInputElement;
  const typePassword = (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const accept = () => {
    (el.querySelector('input.accept') as HTMLInputElement).click();
    fixture.detectChanges();
  };
  const submit = () => el.querySelector('button.submit') as HTMLButtonElement;
  const ready = () => {
    typePassword(PASS);
    accept();
  };
  const clickSubmit = async () => {
    submit().click();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return {
    fixture,
    el,
    deleteAccount,
    navigate,
    input,
    typePassword,
    accept,
    submit,
    ready,
    clickSubmit,
  };
}

describe('DeleteAccount · pantalla', () => {
  it('US-011-06 la cabecera se titula «Borrar cuenta»', () => {
    expect(setup().el.querySelector('app-account-header h1')?.textContent?.trim()).toBe(
      'Borrar cuenta'
    );
  });

  it('US-011-06 empieza con la caja de peligro de la pantalla Cuenta (mismo título y texto)', () => {
    const { el } = setup();
    expect(el.querySelector('.danger-title')?.textContent?.trim()).toBe(
      'Borrar cuenta permanentemente'
    );
    expect(el.querySelector('.danger-body')?.textContent?.trim()).toBe(
      'Esta acción eliminará tu nombre de usuario, todas tus tareas guardadas, tus rachas y tu nivel de XP. No se puede revertir.'
    );
  });

  it('US-011-06 pide la contraseña en una tarjeta de campo, con autocompletado y mostrar/ocultar', () => {
    const { el, input } = setup();
    expect(el.querySelector('app-account-field label')?.textContent?.trim()).toBe('Contraseña');
    expect(input().type).toBe('password');
    expect(input().getAttribute('autocomplete')).toBe('current-password');
    expect(el.querySelector('button.toggle')).not.toBeNull();
  });

  it('US-011-06 el bloque de confirmación lleva su casilla y la frase en negrita', () => {
    const { el } = setup();
    expect(el.querySelector('label.check input.accept[type="checkbox"]')).not.toBeNull();
    expect(el.querySelector('.confirm-text')?.textContent).toContain(
      'Entiendo que se borrarán mi cuenta y todos mis datos para siempre.'
    );
    expect(el.querySelector('.confirm-text strong')?.textContent?.trim()).toBe(
      'Entiendo que se borrarán mi cuenta y todos mis datos para siempre.'
    );
  });

  it('US-011-06 «Borrar mi cuenta» espera a la contraseña y a la casilla', () => {
    const { submit, typePassword, accept } = setup();
    expect(submit().disabled).toBe(true);
    typePassword(PASS);
    expect(submit().disabled).toBe(true); // falta la casilla
    accept();
    expect(submit().disabled).toBe(false);
    typePassword('');
    expect(submit().disabled).toBe(true);
  });

  it('US-011-06 el botón es «Borrar mi cuenta» y hay «Cancelar y volver»', () => {
    const { el, submit } = setup();
    expect(submit().textContent?.trim()).toBe('Borrar mi cuenta');
    expect(el.textContent).toContain('Cancelar y volver');
  });
});

describe('DeleteAccount · envío y estados', () => {
  it('US-011-06 envía la contraseña escrita', async () => {
    const { ready, clickSubmit, deleteAccount } = setup();
    ready();
    await clickSubmit();
    expect(deleteAccount).toHaveBeenCalledTimes(1);
    expect(deleteAccount).toHaveBeenCalledWith(PASS);
  });

  it('US-011-06 mientras borra: «Borrando tu cuenta…», deshabilitado y sin doble envío', async () => {
    const { fixture, el, ready, submit, deleteAccount } = setup();
    let release: (r: AccountResult) => void = () => undefined;
    deleteAccount.mockReturnValue(new Promise<AccountResult>((resolve) => (release = resolve)));
    ready();
    submit().click();
    fixture.detectChanges();

    expect(submit().textContent?.trim()).toBe('Borrando tu cuenta…');
    expect(submit().disabled).toBe(true);
    expect(el.querySelector('.spinner')).not.toBeNull();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(deleteAccount).toHaveBeenCalledTimes(1);

    release({ ok: true });
    await fixture.whenStable();
  });

  it('US-011-06 éxito: avisa «Cuenta eliminada» y vuelve a la lista', async () => {
    const { ready, clickSubmit, navigate } = setup();
    ready();
    await clickSubmit();
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Cuenta eliminada',
    });
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
  });

  it('US-011-06 contraseña incorrecta: error bajo el campo y no se borra nada', async () => {
    const { el, ready, clickSubmit, deleteAccount, navigate, input } = setup();
    deleteAccount.mockResolvedValue({ ok: false, reason: 'invalid-credentials' });
    ready();
    await clickSubmit();

    expect(el.querySelector('app-account-field p.error')?.textContent?.trim()).toBe(
      'La contraseña no es correcta.'
    );
    expect(input().value).toBe(PASS);
    expect(navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(AccountToastService).toast()).toBeNull();
  });

  it('US-011-06 editar la contraseña quita el error', async () => {
    const { el, ready, clickSubmit, deleteAccount, typePassword } = setup();
    deleteAccount.mockResolvedValue({ ok: false, reason: 'invalid-credentials' });
    ready();
    await clickSubmit();
    typePassword(PASS + '4');
    expect(el.querySelector('app-account-field p.error')).toBeNull();
  });

  it.each(['network', 'timeout', 'unknown'] as const)(
    'US-011-06 el fallo «%s»: banner «No se ha borrado nada» y se puede reintentar',
    async (reason) => {
      const { el, ready, clickSubmit, deleteAccount, navigate, submit } = setup();
      deleteAccount.mockResolvedValueOnce({ ok: false, reason });
      ready();
      await clickSubmit();

      expect(el.querySelector('.form-error[role="alert"]')?.textContent?.trim()).toBe(
        'No se ha borrado nada. Inténtalo de nuevo.'
      );
      expect(navigate).not.toHaveBeenCalled();
      expect(submit().disabled).toBe(false);

      await clickSubmit();
      expect(deleteAccount).toHaveBeenCalledTimes(2);
      expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
    }
  );

  it('US-011-06 «Cancelar y volver» y el botón atrás regresan a Cuenta sin borrar nada', () => {
    const { el, navigate, deleteAccount } = setup();
    (el.querySelector('button.cancel') as HTMLButtonElement).click();
    (el.querySelector('app-account-header button.back') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenNthCalledWith(1, '/cuenta');
    expect(navigate).toHaveBeenNthCalledWith(2, '/cuenta');
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});

describe('DeleteAccount · estructura', () => {
  it('US-011-06 usa ChangeDetectionStrategy.OnPush', () => {
    expect((DeleteAccount as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
