import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountResult, LocalTasksSnapshot } from '../../../core/models/account';
import { AccountAccessService, SignInMode } from '../account.access.service';
import { AccountToastService } from '../shared/account-toast/account-toast.service';
import { SignIn } from './sign-in';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const NAME = 'carlos_ritmo';
const PASS = ['Clave', 'Segura', '123'].join('');
const NONE: LocalTasksSnapshot = { pending: [], completed: 0 };
const task = (title: string) => ({ title, dueDate: null, dueTime: null });

function setup(snapshot: LocalTasksSnapshot = NONE) {
  const snap = signal<LocalTasksSnapshot | null>(null);
  const transferPending = signal(false);
  const startSignIn = vi.fn<(u: string, p: string) => Promise<AccountResult>>(async () => {
    snap.set(snapshot);
    return { ok: true };
  });
  const finishSignIn = vi.fn<(m: SignInMode) => Promise<AccountResult>>(async () => ({ ok: true }));
  const cancelSignIn = vi.fn(() => snap.set(null));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SignIn],
    providers: [
      provideRouter([]),
      {
        provide: AccountAccessService,
        useValue: {
          startSignIn,
          finishSignIn,
          cancelSignIn,
          signInSnapshot: snap,
          transferPending,
        },
      },
    ],
  });
  const order: string[] = [];
  const navigate = vi
    .spyOn(TestBed.inject(Router), 'navigateByUrl')
    .mockImplementation(async () => {
      order.push('navigate');
      return true;
    });
  vi.spyOn(window.history, 'go').mockImplementation(() => {
    order.push('history');
    queueMicrotask(() => window.dispatchEvent(new PopStateEvent('popstate')));
  });
  vi.spyOn(window.history, 'back').mockImplementation(() => undefined);

  const fixture = TestBed.createComponent(SignIn);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;

  const inputs = () => Array.from(el.querySelectorAll('input.input')) as HTMLInputElement[];
  const type = (index: number, value: string) => {
    const input = inputs()[index];
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => el.querySelector('button.submit') as HTMLButtonElement;
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as
      HTMLButtonElement | undefined;
  const fill = () => {
    type(0, NAME);
    type(1, PASS);
  };
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 30));
    fixture.detectChanges();
  };
  const signIn = async () => {
    fill();
    submit().click();
    await settle();
  };

  return {
    fixture,
    el,
    startSignIn,
    finishSignIn,
    cancelSignIn,
    transferPending,
    navigate,
    order,
    inputs,
    type,
    submit,
    button,
    fill,
    settle,
    signIn,
  };
}

describe('SignIn · formulario', () => {
  it('US-011-02 la cabecera se titula «Iniciar sesión» y hay tarjeta de bienvenida', () => {
    const { el } = setup();
    expect(el.querySelector('app-account-header h1')?.textContent?.trim()).toBe('Iniciar sesión');
    expect(el.querySelector('.welcome-badge')?.textContent?.trim()).toBe('RECUPERA TU NIVEL');
    expect(el.querySelector('.welcome-title')?.textContent?.trim()).toBe('Bienvenido de nuevo');
    expect(el.querySelector('.welcome-body')?.textContent?.trim()).toBe(
      'Inicia sesión para recuperar tus tareas y tu racha.'
    );
  });

  it('US-011-02 dos entradas en bloque con su etiqueta, texto lateral y autocompletado', () => {
    const { el, inputs } = setup();
    const fields = Array.from(el.querySelectorAll('app-account-field'));
    expect(fields).toHaveLength(2);
    expect(fields.map((f) => f.getAttribute('ng-reflect-variant') ?? 'block')).toBeTruthy();
    expect(el.querySelectorAll('.field[data-variant="block"]')).toHaveLength(2);
    expect(el.querySelector('.side')?.textContent?.trim()).toBe('Identificador único');

    const [user, pass] = inputs();
    expect(user.getAttribute('placeholder')).toBe('tu nombre de usuario');
    expect(user.getAttribute('autocomplete')).toBe('username');
    expect(user.getAttribute('autocapitalize')).toBe('none');
    expect(pass.getAttribute('autocomplete')).toBe('current-password');
    expect(pass.type).toBe('password');
    expect(el.querySelector('button.toggle')).not.toBeNull();
  });

  it('US-011-02 no hay recuperación de contraseña ni textos de seguridad', () => {
    const { el } = setup();
    expect(el.textContent).not.toMatch(/olvid/i);
    expect(el.textContent).not.toMatch(/segur/i);
    expect(el.querySelector('a')).toBeNull();
  });

  it('US-011-02 «Iniciar sesión» tiene siempre el aspecto principal; vacío muestra el aviso sin llamar', () => {
    const { el, fixture, submit, startSignIn, type } = setup();
    expect(submit().disabled).toBe(false);
    submit().click();
    fixture.detectChanges();
    expect(startSignIn).not.toHaveBeenCalled();
    expect(el.querySelector('.notice[role="alert"]')?.textContent).toContain('Acceso no válido');

    type(0, NAME);
    expect(el.querySelector('.notice')).toBeNull();
  });

  it('US-011-02 «Cancelar» y el botón atrás vuelven a Cuenta sin comprobar nada', () => {
    const { el, button, navigate, startSignIn } = setup();
    (button('Cancelar') as HTMLButtonElement).click();
    (el.querySelector('app-account-header button.back') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenNthCalledWith(1, '/cuenta');
    expect(navigate).toHaveBeenNthCalledWith(2, '/cuenta');
    expect(startSignIn).not.toHaveBeenCalled();
  });
});

describe('SignIn · errores y estados', () => {
  it('US-011-02 credenciales incorrectas: aviso genérico y se conserva lo escrito', async () => {
    const { el, startSignIn, signIn, inputs } = setup();
    startSignIn.mockResolvedValue({ ok: false, reason: 'invalid-credentials' });
    await signIn();

    const notice = el.querySelector('.notice[role="alert"]') as HTMLElement;
    expect(notice.textContent).toContain('Acceso no válido');
    expect(notice.textContent).toContain(
      'Nombre de usuario o contraseña incorrectos. Comprueba tus datos e inténtalo de nuevo.'
    );
    expect(inputs().map((i) => i.value)).toEqual([NAME, PASS]);
  });

  it('US-011-02 demasiados intentos: mismo bloque con el texto del límite', async () => {
    const { el, startSignIn, signIn } = setup();
    startSignIn.mockResolvedValue({ ok: false, reason: 'rate-limited' });
    await signIn();
    expect(el.querySelector('.notice')?.textContent).toContain(
      'Demasiados intentos. Espera unos minutos.'
    );
  });

  it('US-011-02 sin conexión: banner, conserva lo escrito y reintenta con «Reintentar ahora»', async () => {
    const { fixture, el, startSignIn, signIn, settle, inputs, finishSignIn } = setup();
    startSignIn.mockResolvedValueOnce({ ok: false, reason: 'network' });
    await signIn();
    expect(el.querySelector('app-offline-banner')).not.toBeNull();
    expect(inputs().map((i) => i.value)).toEqual([NAME, PASS]);

    (el.querySelector('app-offline-banner button.retry') as HTMLButtonElement).click();
    await settle();
    fixture.detectChanges();
    expect(startSignIn).toHaveBeenCalledTimes(2);
    expect(el.querySelector('app-offline-banner')).toBeNull();
    expect(finishSignIn).toHaveBeenCalledWith('none');
  });

  it('US-011-02 al editar un campo desaparece el aviso de error', async () => {
    const { el, startSignIn, signIn, type } = setup();
    startSignIn.mockResolvedValue({ ok: false, reason: 'invalid-credentials' });
    await signIn();
    expect(el.querySelector('.notice')).not.toBeNull();
    type(1, PASS + '4');
    expect(el.querySelector('.notice')).toBeNull();
  });

  it('US-011-02 mientras comprueba: «Comprobando…», deshabilitado y sin doble envío', async () => {
    const { fixture, el, startSignIn, fill, submit, settle } = setup();
    let release: (r: AccountResult) => void = () => undefined;
    startSignIn.mockReturnValue(new Promise<AccountResult>((resolve) => (release = resolve)));
    fill();
    submit().click();
    fixture.detectChanges();

    expect(submit().textContent?.trim()).toBe('Comprobando…');
    expect(submit().disabled).toBe(true);
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(startSignIn).toHaveBeenCalledTimes(1);

    release({ ok: false, reason: 'invalid-credentials' });
    await settle();
  });
});

describe('SignIn · tareas de este móvil', () => {
  it('US-011-02 sin tareas locales entra directo a la lista con «Sesión iniciada»', async () => {
    const { el, finishSignIn, signIn, navigate } = setup(NONE);
    await signIn();

    expect(finishSignIn).toHaveBeenCalledWith('none');
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Sesión iniciada',
    });
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
    expect(el.querySelector('app-local-tasks-sheet')).toBeNull();
  });

  it('US-011-02 con pendientes pregunta antes de entrar (hoja con el recuento)', async () => {
    const { el, finishSignIn, signIn, navigate } = setup({
      pending: [task('a'), task('b')],
      completed: 1,
    });
    await signIn();

    expect(el.querySelector('app-local-tasks-sheet')).not.toBeNull();
    expect(el.querySelector('.count-text')?.textContent?.trim()).toBe(
      '2 tareas locales sin cuenta'
    );
    expect(finishSignIn).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('US-011-02 «Traer tareas y continuar»: entra trayéndolas y avisa «Tareas añadidas a tu cuenta»', async () => {
    const { el, button, finishSignIn, signIn, settle, navigate } = setup({
      pending: [task('a')],
      completed: 0,
    });
    await signIn();
    button('Traer tareas y continuar')?.click();
    await settle();

    expect(finishSignIn).toHaveBeenCalledWith('merge');
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Tareas añadidas a tu cuenta',
    });
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
    expect(el.querySelector('app-local-tasks-sheet')).toBeNull();
  });

  it('US-011-02 si el traspaso quedó a medias avisa solo «Sesión iniciada»', async () => {
    const { button, signIn, settle, transferPending } = setup({
      pending: [task('a')],
      completed: 0,
    });
    transferPending.set(true);
    await signIn();
    button('Traer tareas y continuar')?.click();
    await settle();
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Sesión iniciada',
    });
  });

  it('US-011-02 «Usar solo mi cuenta» pide confirmar encima de la hoja; confirmar descarta y entra', async () => {
    const { el, button, finishSignIn, signIn, settle, navigate } = setup({
      pending: [task('a'), task('b')],
      completed: 0,
    });
    await signIn();
    button('Usar solo mi cuenta')?.click();
    await settle();

    expect(el.querySelector('app-discard-confirm [role="alertdialog"]')).not.toBeNull();
    expect(el.querySelector('app-local-tasks-sheet')).not.toBeNull();
    expect(finishSignIn).not.toHaveBeenCalled();

    button('Sí, descartar tareas locales')?.click();
    await settle();

    expect(finishSignIn).toHaveBeenCalledWith('discard');
    expect(TestBed.inject(AccountToastService).toast()).toEqual({
      kind: 'small',
      text: 'Sesión iniciada',
    });
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
  });

  it('US-011-02 «Volver a opciones» cierra la confirmación y deja la hoja', async () => {
    const { el, button, signIn, settle, finishSignIn } = setup({
      pending: [task('a')],
      completed: 0,
    });
    await signIn();
    button('Usar solo mi cuenta')?.click();
    await settle();
    button('Volver a opciones')?.click();
    await settle();

    expect(el.querySelector('app-discard-confirm')).toBeNull();
    expect(el.querySelector('app-local-tasks-sheet')).not.toBeNull();
    expect(finishSignIn).not.toHaveBeenCalled();
  });

  it('US-011-02 cancelar en la hoja deja la sesión anónima intacta y el formulario como estaba', async () => {
    const { el, button, cancelSignIn, signIn, settle, inputs, navigate, finishSignIn } = setup({
      pending: [task('a')],
      completed: 0,
    });
    await signIn();
    button('Cancelar inicio de sesión')?.click();
    await settle();

    expect(cancelSignIn).toHaveBeenCalledTimes(1);
    expect(finishSignIn).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('app-local-tasks-sheet')).toBeNull();
    expect(inputs().map((i) => i.value)).toEqual([NAME, PASS]);
  });

  it('US-011-02 el botón atrás de Android en la hoja cancela el inicio de sesión', async () => {
    const { el, cancelSignIn, signIn, settle } = setup({ pending: [task('a')], completed: 0 });
    await signIn();
    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();
    expect(cancelSignIn).toHaveBeenCalledTimes(1);
    expect(el.querySelector('app-local-tasks-sheet')).toBeNull();
  });

  it('US-011-02 solo hay completadas: confirmación derivada; continuar entra sin ellas', async () => {
    const { el, button, finishSignIn, signIn, settle } = setup({ pending: [], completed: 3 });
    await signIn();

    expect(el.querySelector('app-local-tasks-sheet')).toBeNull();
    expect(el.querySelector('app-discard-confirm h2')?.textContent?.trim()).toBe(
      '¿Continuar sin las tareas de este móvil?'
    );
    button('Sí, continuar')?.click();
    await settle();
    expect(finishSignIn).toHaveBeenCalledWith('none');
  });

  it('US-011-02 en la confirmación derivada, cancelar descarta lo comprobado', async () => {
    const { el, button, cancelSignIn, signIn, settle } = setup({ pending: [], completed: 3 });
    await signIn();
    button('Cancelar inicio de sesión')?.click();
    await settle();
    expect(cancelSignIn).toHaveBeenCalledTimes(1);
    expect(el.querySelector('app-discard-confirm')).toBeNull();
  });

  it('US-011-02 las capas se retiran del historial antes de navegar a la lista', async () => {
    const { button, signIn, settle, order } = setup({ pending: [task('a')], completed: 0 });
    await signIn();
    button('Traer tareas y continuar')?.click();
    await settle();
    expect(order).toEqual(['history', 'navigate']);
  });

  it('US-011-02 si no se puede completar la entrada: cierra las capas, avisa y no navega', async () => {
    const { el, button, finishSignIn, signIn, settle, navigate } = setup({
      pending: [task('a')],
      completed: 0,
    });
    finishSignIn.mockResolvedValue({ ok: false, reason: 'unauthorized' });
    await signIn();
    button('Traer tareas y continuar')?.click();
    await settle();

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('app-local-tasks-sheet')).toBeNull();
    expect(el.querySelector('.notice[role="alert"]')).not.toBeNull();
  });
});

describe('SignIn · estructura', () => {
  it('US-011-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((SignIn as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
