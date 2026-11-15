import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountErrorReason, AccountResult } from '../../../core/models/account';
import { AccountAccessService } from '../account.access.service';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { CreateAccount } from './create-account';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const NAME = 'carlos_ritmo';
const PASSWORD = ['Mi', 'Clave', 'Segura1'].join('');

function setup() {
  const createAccount = vi.fn<(u: string, p: string) => Promise<AccountResult>>(async () => ({
    ok: true,
  }));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CreateAccount],
    providers: [provideRouter([]), { provide: AccountAccessService, useValue: { createAccount } }],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CreateAccount);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;

  const inputs = () => Array.from(el.querySelectorAll('input.input')) as HTMLInputElement[];
  const type = (index: number, value: string) => {
    const input = inputs()[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const blur = (index: number) => {
    inputs()[index].dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const accept = () => {
    (el.querySelector('input.accept') as HTMLInputElement).click();
    fixture.detectChanges();
  };
  const submit = () => el.querySelector('button.submit') as HTMLButtonElement;
  const fill = (name = NAME, password = PASSWORD, repeat = PASSWORD) => {
    type(0, name);
    type(1, password);
    type(2, repeat);
  };
  const fields = () => Array.from(el.querySelectorAll('app-account-field')) as HTMLElement[];
  const hint = (i: number) => fields()[i].querySelector('.hint')?.textContent?.trim();
  const errorOf = (i: number) => fields()[i].querySelector('p.error')?.textContent?.trim();
  const ruleStates = (i: number) =>
    Array.from(fields()[i].querySelectorAll('li')).map((li) => li.getAttribute('data-state'));
  const clickSubmit = async () => {
    submit().click();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  return {
    fixture,
    el,
    createAccount,
    navigate,
    inputs,
    type,
    blur,
    accept,
    submit,
    fill,
    hint,
    errorOf,
    ruleStates,
    clickSubmit,
  };
}

describe('CreateAccount · formulario', () => {
  it('US-011-01 tiene tres campos con su etiqueta, indicación y autocompletado', () => {
    const { el, inputs, hint } = setup();
    const labels = Array.from(el.querySelectorAll('app-account-field label')).map((l) =>
      l.textContent?.trim()
    );
    expect(labels).toEqual(['Nombre de usuario', 'Contraseña', 'Repetir contraseña']);
    expect(hint(0)).toBe('0/24');
    expect(hint(1)).toBe('Mín. 8');
    expect(hint(2)).toBe('Sin verificar');

    const [user, pass, repeat] = inputs();
    expect(user.getAttribute('autocomplete')).toBe('username');
    expect(user.getAttribute('autocapitalize')).toBe('none');
    expect(user.getAttribute('spellcheck')).toBe('false');
    expect(user.getAttribute('placeholder')).toBe('ej. carlos_ritmo');
    expect(pass.getAttribute('autocomplete')).toBe('new-password');
    expect(repeat.getAttribute('autocomplete')).toBe('new-password');
    expect(pass.type).toBe('password');
    expect(repeat.type).toBe('password');
  });

  it('US-011-01 el contador del nombre se actualiza al escribir', () => {
    const { type, hint } = setup();
    type(0, 'carlos');
    expect(hint(0)).toBe('6/24');
  });

  it('US-011-01 las reglas están en reposo y pasan a verde/rojo al tocar el campo', () => {
    const { type, ruleStates } = setup();
    expect(ruleStates(0)).toEqual(['idle', 'idle']);
    expect(ruleStates(1)).toEqual(['idle', 'idle']);

    type(0, 'ab');
    expect(ruleStates(0)).toEqual(['error', 'ok']);
    type(0, NAME);
    expect(ruleStates(0)).toEqual(['ok', 'ok']);

    type(1, 'corta');
    expect(ruleStates(1)).toEqual(['error', 'ok']);
    type(1, PASSWORD);
    expect(ruleStates(1)).toEqual(['ok', 'ok']);
  });

  it('US-011-01 «Distinta del nombre de usuario» compara sin distinguir mayúsculas', () => {
    const { type, ruleStates } = setup();
    type(0, 'Carlos_Ritmo');
    type(1, 'carlos_ritmo');
    expect(ruleStates(1)).toEqual(['ok', 'error']);
  });

  it('US-011-01 los errores no salen antes de perder el foco y sí después', () => {
    const { type, blur, errorOf } = setup();
    type(0, 'ab');
    expect(errorOf(0)).toBeUndefined();
    blur(0);
    expect(errorOf(0)).toBe('El formato de usuario no es válido.');

    type(1, 'corta');
    expect(errorOf(1)).toBeUndefined();
    blur(1);
    expect(errorOf(1)).toBe('La contraseña debe cumplir con los requisitos.');
  });

  it('US-011-01 la repetición muestra «Coinciden» o «No coinciden» y su error al perder el foco', () => {
    const { type, blur, hint, errorOf, ruleStates } = setup();
    type(1, PASSWORD);
    type(2, 'otra');
    expect(hint(2)).toBe('No coinciden');
    expect(ruleStates(2)).toEqual(['error']);
    blur(2);
    expect(errorOf(2)).toBe('Las contraseñas no coinciden.');

    type(2, PASSWORD);
    expect(hint(2)).toBe('Coinciden');
    expect(ruleStates(2)).toEqual(['ok']);
    expect(errorOf(2)).toBeUndefined();
  });

  it('US-011-01 cada contraseña tiene su botón de mostrar u ocultar', () => {
    const { el } = setup();
    const toggles = el.querySelectorAll('button.toggle');
    expect(toggles).toHaveLength(2);
    toggles.forEach((t) =>
      expect(t.getAttribute('aria-label')).toBe('Mostrar u ocultar contraseña')
    );
  });

  it('US-011-01 explica que no hay correos ni verificaciones', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Sin correos ni verificaciones.');
    expect(el.textContent).toContain('Solo tu nombre de usuario y tu contraseña.');
    expect(el.textContent).not.toContain('PRIVACIDAD MÁXIMA');
  });
});

describe('CreateAccount · aviso y botón', () => {
  it('US-011-04 el aviso advierte de que no hay recuperación, con la frase en negrita', () => {
    const { el } = setup();
    expect(el.textContent).toContain('Aviso importante sobre tu cuenta');
    expect(el.querySelector('.notice-text')?.textContent).toContain(
      'Si olvidas tu contraseña no podremos recuperar tu cuenta.'
    );
    expect(el.querySelector('.notice-text strong')?.textContent?.trim()).toBe(
      'Entiendo que no hay forma de recuperarla.'
    );
  });

  it('US-011-04 toda la fila del aviso es la etiqueta de la casilla', () => {
    const { el } = setup();
    const label = el.querySelector('label.check') as HTMLLabelElement;
    expect(label.querySelector('input.accept[type="checkbox"]')).not.toBeNull();
    expect(label.textContent).toContain('Entiendo que no hay forma de recuperarla.');
  });

  it('US-011-04 «Crear cuenta» está deshabilitado al principio', () => {
    expect(setup().submit().disabled).toBe(true);
  });

  it('US-011-04 con todo válido pero sin la casilla sigue deshabilitado', () => {
    const { fill, submit } = setup();
    fill();
    expect(submit().disabled).toBe(true);
  });

  it('US-011-04 con la casilla pero con errores sigue deshabilitado', () => {
    const { fill, accept, submit } = setup();
    fill('ab');
    accept();
    expect(submit().disabled).toBe(true);
  });

  it('US-011-04 se habilita solo con todo válido y la casilla marcada', () => {
    const { fill, accept, submit, type } = setup();
    fill();
    accept();
    expect(submit().disabled).toBe(false);

    type(2, 'otra');
    expect(submit().disabled).toBe(true);
  });

  it('US-011-04 el botón principal es «Crear cuenta» y hay «Cancelar y volver»', () => {
    const { el, submit } = setup();
    expect(submit().textContent?.trim()).toBe('Crear cuenta');
    expect(el.textContent).toContain('Cancelar y volver');
    expect(el.textContent).toContain('Mantienes tus tareas locales intactas en este dispositivo.');
  });

  it('US-011-04 enviar con el formulario incompleto no llama al servidor y muestra los errores', () => {
    const { el, fixture, createAccount, errorOf } = setup();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(createAccount).not.toHaveBeenCalled();
    expect(errorOf(0)).toBe('El formato de usuario no es válido.');
    expect(errorOf(1)).toBe('La contraseña debe cumplir con los requisitos.');
  });
});

describe('CreateAccount · envío y estados', () => {
  it('US-011-01 envía el nombre y la contraseña escritos', async () => {
    const { fill, accept, clickSubmit, createAccount } = setup();
    fill();
    accept();
    await clickSubmit();
    expect(createAccount).toHaveBeenCalledTimes(1);
    expect(createAccount).toHaveBeenCalledWith(NAME, PASSWORD);
  });

  it('US-011-01 mientras crea: botón «Creando tu cuenta…», deshabilitado y sin doble envío', async () => {
    const { fixture, el, fill, accept, submit, createAccount } = setup();
    let finish: (r: AccountResult) => void = () => undefined;
    createAccount.mockReturnValue(new Promise<AccountResult>((resolve) => (finish = resolve)));
    fill();
    accept();

    submit().click();
    fixture.detectChanges();
    expect(submit().textContent?.trim()).toBe('Creando tu cuenta…');
    expect(submit().disabled).toBe(true);
    expect(el.querySelector('.spinner')).not.toBeNull();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(createAccount).toHaveBeenCalledTimes(1);

    finish({ ok: true });
    await fixture.whenStable();
  });

  it('US-011-01 éxito: avisa «¡Cuenta creada con éxito!» y vuelve a Cuenta', async () => {
    const { fill, accept, clickSubmit, navigate } = setup();
    fill();
    accept();
    await clickSubmit();

    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'success',
      title: '¡Cuenta creada con éxito!',
      text: 'Tus tareas y tu progreso siguen aquí.',
    });
    expect(navigate).toHaveBeenCalledWith('/cuenta', { replaceUrl: true });
  });

  it('US-011-01 nombre no disponible: lo indica en el campo y conserva todo lo escrito', async () => {
    const { fill, accept, clickSubmit, createAccount, errorOf, inputs, submit, navigate, type } =
      setup();
    createAccount.mockResolvedValue({ ok: false, reason: 'username-taken' });
    fill();
    accept();
    await clickSubmit();

    expect(errorOf(0)).toBe('Nombre de usuario no disponible');
    expect(inputs().map((i) => i.value)).toEqual([NAME, PASSWORD, PASSWORD]);
    expect(navigate).not.toHaveBeenCalled();
    expect(submit().disabled).toBe(false);

    type(0, 'otro_nombre');
    expect(errorOf(0)).toBeUndefined();
  });

  it('US-011-01 sin conexión: banner con «Reintentar ahora», conserva lo escrito y reintenta', async () => {
    const { fixture, el, fill, accept, clickSubmit, createAccount, inputs, navigate } = setup();
    createAccount.mockResolvedValueOnce({ ok: false, reason: 'network' });
    fill();
    accept();
    await clickSubmit();

    expect(el.querySelector('app-offline-banner')).not.toBeNull();
    expect(inputs().map((i) => i.value)).toEqual([NAME, PASSWORD, PASSWORD]);
    expect(navigate).not.toHaveBeenCalled();

    (el.querySelector('app-offline-banner button.retry') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(createAccount).toHaveBeenCalledTimes(2);
    expect(el.querySelector('app-offline-banner')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/cuenta', { replaceUrl: true });
  });

  it('US-011-01 sin respuesta del servidor también se trata como sin conexión', async () => {
    const { el, fill, accept, clickSubmit, createAccount } = setup();
    createAccount.mockResolvedValue({ ok: false, reason: 'timeout' });
    fill();
    accept();
    await clickSubmit();
    expect(el.querySelector('app-offline-banner')).not.toBeNull();
  });

  it('US-011-01 contraseña rechazada por el servidor: error en el campo de contraseña', async () => {
    const { fill, accept, clickSubmit, createAccount, errorOf } = setup();
    createAccount.mockResolvedValue({ ok: false, reason: 'weak-password' });
    fill();
    accept();
    await clickSubmit();
    expect(errorOf(1)).toBe('La contraseña debe cumplir con los requisitos.');
  });

  it.each<AccountErrorReason>(['rate-limited', 'unknown', 'unauthorized'])(
    'US-011-01 el fallo «%s» se explica bajo el botón, sin detalles técnicos',
    async (reason) => {
      const { el, fill, accept, clickSubmit, createAccount, navigate } = setup();
      createAccount.mockResolvedValue({ ok: false, reason });
      fill();
      accept();
      await clickSubmit();

      const message = el.querySelector('.form-error[role="alert"]');
      expect(message?.textContent?.trim().length).toBeGreaterThan(10);
      expect(navigate).not.toHaveBeenCalled();
    }
  );

  it('US-011-01 «Cancelar y volver» y el botón atrás de la cabecera vuelven a Cuenta sin crear nada', () => {
    const { el, navigate, createAccount } = setup();
    (el.querySelector('button.cancel') as HTMLButtonElement).click();
    (el.querySelector('app-account-header button.back') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, '/cuenta');
    expect(navigate).toHaveBeenNthCalledWith(2, '/cuenta');
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('US-011-01 la cabecera se titula «Crear cuenta»', () => {
    expect(setup().el.querySelector('app-account-header h1')?.textContent?.trim()).toBe(
      'Crear cuenta'
    );
  });
});

describe('CreateAccount · estructura', () => {
  it('US-011-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((CreateAccount as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
