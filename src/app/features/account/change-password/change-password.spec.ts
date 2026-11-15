import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountResult } from '../../../core/models/account';
import { AccountAccessService } from '../account.access.service';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { ChangePassword } from './change-password';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const CURRENT = ['Vieja', 'Clave', '123'].join('');
const NEXT = ['Nueva', 'Clave', '456'].join('');

function setup() {
  const changePassword = vi.fn<(c: string, n: string) => Promise<AccountResult>>(async () => ({
    ok: true,
  }));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ChangePassword],
    providers: [
      provideRouter([]),
      {
        provide: AccountAccessService,
        useValue: { changePassword, username: signal<string | null>('carlos_ritmo') },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ChangePassword);
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
  const submit = () => el.querySelector('button.submit') as HTMLButtonElement;
  const fields = () => Array.from(el.querySelectorAll('app-account-field')) as HTMLElement[];
  const hint = (i: number) => fields()[i].querySelector('.hint')?.textContent?.trim();
  const errorOf = (i: number) => fields()[i].querySelector('p.error')?.textContent?.trim();
  const ruleStates = (i: number) =>
    Array.from(fields()[i].querySelectorAll('li')).map((li) => li.getAttribute('data-state'));
  const fill = (current = CURRENT, next = NEXT, repeat = NEXT) => {
    type(0, current);
    type(1, next);
    type(2, repeat);
  };
  const clickSubmit = async () => {
    submit().click();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  return {
    fixture,
    el,
    changePassword,
    navigate,
    inputs,
    type,
    blur,
    submit,
    hint,
    errorOf,
    ruleStates,
    fill,
    clickSubmit,
  };
}

describe('ChangePassword · formulario', () => {
  it('US-011-05 la cabecera se titula «Cambiar contraseña» y hay tres tarjetas de campo', () => {
    const { el } = setup();
    expect(el.querySelector('app-account-header h1')?.textContent?.trim()).toBe(
      'Cambiar contraseña'
    );
    const labels = Array.from(el.querySelectorAll('app-account-field label')).map((l) =>
      l.textContent?.trim()
    );
    expect(labels).toEqual(['Contraseña actual', 'Contraseña nueva', 'Repetir contraseña nueva']);
  });

  it('US-011-05 autocompletado correcto y contraseñas ocultas con botón de mostrar', () => {
    const { el, inputs } = setup();
    const [current, next, repeat] = inputs();
    expect(current.getAttribute('autocomplete')).toBe('current-password');
    expect(next.getAttribute('autocomplete')).toBe('new-password');
    expect(repeat.getAttribute('autocomplete')).toBe('new-password');
    expect([current, next, repeat].every((i) => i.type === 'password')).toBe(true);
    expect(el.querySelectorAll('button.toggle')).toHaveLength(3);
  });

  it('US-011-05 la contraseña actual no lleva reglas; la nueva lleva tres', () => {
    const { el, ruleStates } = setup();
    expect(el.querySelectorAll('app-account-field')[0].querySelectorAll('li')).toHaveLength(0);
    const texts = Array.from(
      el.querySelectorAll('app-account-field')[1].querySelectorAll('li')
    ).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(texts).toHaveLength(3);
    expect(texts.join('|')).toContain('De 8 a 64 caracteres');
    expect(texts.join('|')).toContain('Distinta del nombre de usuario');
    expect(texts.join('|')).toContain('Distinta de la contraseña actual');
    expect(ruleStates(1)).toEqual(['idle', 'idle', 'idle']);
  });

  it('US-011-05 las reglas de la nueva pasan a verde o rojo al escribir', () => {
    const { type, ruleStates } = setup();
    type(0, CURRENT);
    type(1, 'corta');
    expect(ruleStates(1)).toEqual(['error', 'ok', 'ok']);
    type(1, CURRENT);
    expect(ruleStates(1)).toEqual(['ok', 'ok', 'error']);
    type(1, NEXT);
    expect(ruleStates(1)).toEqual(['ok', 'ok', 'ok']);
  });

  it('US-011-05 la repetición indica «Coinciden» o «No coinciden»', () => {
    const { type, hint } = setup();
    expect(hint(2)).toBe('Sin verificar');
    type(1, NEXT);
    type(2, 'otra');
    expect(hint(2)).toBe('No coinciden');
    type(2, NEXT);
    expect(hint(2)).toBe('Coinciden');
  });

  it('US-011-05 «Cambiar contraseña» se habilita solo con la actual escrita y la nueva válida y repetida', () => {
    const { fill, submit, type } = setup();
    expect(submit().disabled).toBe(true);
    fill('', NEXT, NEXT);
    expect(submit().disabled).toBe(true); // falta la actual
    fill(CURRENT, NEXT, NEXT);
    expect(submit().disabled).toBe(false);
    type(2, 'otra');
    expect(submit().disabled).toBe(true);
    fill(CURRENT, CURRENT, CURRENT);
    expect(submit().disabled).toBe(true); // igual a la actual
  });

  it('US-011-05 los errores del campo nuevo salen al perder el foco', () => {
    const { type, blur, errorOf } = setup();
    type(1, 'corta');
    expect(errorOf(1)).toBeUndefined();
    blur(1);
    expect(errorOf(1)).toBe('La contraseña debe cumplir con los requisitos.');
  });
});

describe('ChangePassword · envío y estados', () => {
  it('US-011-05 envía la actual y la nueva', async () => {
    const { fill, clickSubmit, changePassword } = setup();
    fill();
    await clickSubmit();
    expect(changePassword).toHaveBeenCalledTimes(1);
    expect(changePassword).toHaveBeenCalledWith(CURRENT, NEXT);
  });

  it('US-011-05 mientras cambia: «Cambiando tu contraseña…», deshabilitado y sin doble envío', async () => {
    const { fixture, el, fill, submit, changePassword } = setup();
    let release: (r: AccountResult) => void = () => undefined;
    changePassword.mockReturnValue(new Promise<AccountResult>((resolve) => (release = resolve)));
    fill();
    submit().click();
    fixture.detectChanges();

    expect(submit().textContent?.trim()).toBe('Cambiando tu contraseña…');
    expect(submit().disabled).toBe(true);
    expect(el.querySelector('.spinner')).not.toBeNull();
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(changePassword).toHaveBeenCalledTimes(1);

    release({ ok: true });
    await fixture.whenStable();
  });

  it('US-011-05 éxito: avisa «Contraseña cambiada» y vuelve a Cuenta', async () => {
    const { fill, clickSubmit, navigate } = setup();
    fill();
    await clickSubmit();
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Contraseña cambiada',
    });
    expect(navigate).toHaveBeenCalledWith('/cuenta', { replaceUrl: true });
  });

  it('US-011-05 contraseña actual incorrecta: error bajo ese campo y lo escrito se conserva', async () => {
    const { fill, clickSubmit, changePassword, errorOf, inputs, navigate } = setup();
    changePassword.mockResolvedValue({ ok: false, reason: 'invalid-credentials' });
    fill();
    await clickSubmit();

    expect(errorOf(0)).toBe('La contraseña actual no es correcta.');
    expect(inputs().map((i) => i.value)).toEqual([CURRENT, NEXT, NEXT]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('US-011-05 el servidor rechaza la nueva por igual o débil: error bajo la nueva', async () => {
    const { fill, clickSubmit, changePassword, errorOf } = setup();
    changePassword.mockResolvedValueOnce({ ok: false, reason: 'same-password' });
    fill();
    await clickSubmit();
    expect(errorOf(1)).toBe('La nueva contraseña debe ser distinta de la actual.');

    changePassword.mockResolvedValueOnce({ ok: false, reason: 'weak-password' });
    await clickSubmit();
    expect(errorOf(1)).toBe('La contraseña debe cumplir con los requisitos.');
  });

  it('US-011-05 editar la actual quita su error', async () => {
    const { fill, clickSubmit, changePassword, errorOf, type } = setup();
    changePassword.mockResolvedValue({ ok: false, reason: 'invalid-credentials' });
    fill();
    await clickSubmit();
    expect(errorOf(0)).toBeDefined();
    type(0, CURRENT + '4');
    expect(errorOf(0)).toBeUndefined();
  });

  it('US-011-05 sin conexión: banner, conserva lo escrito y reintenta con «Reintentar ahora»', async () => {
    const { fixture, el, fill, clickSubmit, changePassword, inputs, navigate } = setup();
    changePassword.mockResolvedValueOnce({ ok: false, reason: 'network' });
    fill();
    await clickSubmit();
    expect(el.querySelector('app-offline-banner')).not.toBeNull();
    expect(inputs().map((i) => i.value)).toEqual([CURRENT, NEXT, NEXT]);

    (el.querySelector('app-offline-banner button.retry') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalledTimes(2);
    expect(el.querySelector('app-offline-banner')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/cuenta', { replaceUrl: true });
  });

  it('US-011-05 otros fallos se explican bajo el botón sin detalles técnicos', async () => {
    const { el, fill, clickSubmit, changePassword } = setup();
    changePassword.mockResolvedValue({ ok: false, reason: 'unknown' });
    fill();
    await clickSubmit();
    expect(
      el.querySelector('.form-error[role="alert"]')?.textContent?.trim().length
    ).toBeGreaterThan(10);
  });

  it('US-011-05 «Cancelar y volver» y el botón atrás regresan a Cuenta sin cambiar nada', () => {
    const { el, navigate, changePassword } = setup();
    (el.querySelector('button.cancel') as HTMLButtonElement).click();
    (el.querySelector('app-account-header button.back') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenNthCalledWith(1, '/cuenta');
    expect(navigate).toHaveBeenNthCalledWith(2, '/cuenta');
    expect(changePassword).not.toHaveBeenCalled();
  });
});

describe('ChangePassword · estructura', () => {
  it('US-011-05 usa ChangeDetectionStrategy.OnPush', () => {
    expect((ChangePassword as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
