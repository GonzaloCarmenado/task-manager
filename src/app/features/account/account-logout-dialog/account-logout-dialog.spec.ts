import { TestBed } from '@angular/core/testing';
import { AccountLogoutDialog } from './account-logout-dialog';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AccountLogoutDialog);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  const confirm = vi.fn();
  const cancel = vi.fn();
  fixture.componentInstance.confirm.subscribe(confirm);
  fixture.componentInstance.cancel.subscribe(cancel);
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, confirm, cancel };
}

describe('AccountLogoutDialog', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccountLogoutDialog] }).compileComponents();
  });

  it('US-011-04 es un diálogo de alerta modal con título accesible', () => {
    const { el } = render();
    const dialog = el.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = el.querySelector('h2') as HTMLElement;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent?.trim()).toBe('¿Cerrar sesión?');
  });

  it('US-011-04 explica que los datos permanecen en la cuenta', () => {
    const { el } = render();
    expect(el.querySelector('.body')?.textContent?.trim()).toBe(
      'Tus tareas y tu progreso permanecerán guardados en tu cuenta. Este teléfono quedará sin tareas hasta que vuelvas a iniciar sesión.'
    );
  });

  it('US-011-04 «Sí, cerrar sesión» confirma y «Cancelar» cancela', () => {
    const { el, confirm, cancel } = render();
    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    const yes = buttons.find((b) => b.textContent?.trim() === 'Sí, cerrar sesión');
    const no = buttons.find((b) => b.textContent?.trim() === 'Cancelar');
    expect(yes).toBeDefined();
    expect(no).toBeDefined();

    yes?.click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    no?.click();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('US-011-04 tocar el velo cancela sin cambios', () => {
    const { el, cancel, confirm } = render();
    (el.querySelector('.scrim') as HTMLElement).click();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('US-011-04 el botón atrás de Android cancela sin cambios', () => {
    const { cancel, confirm } = render();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('US-011-04 mientras cierra, los botones se bloquean y no se confirma dos veces', () => {
    const { el, confirm } = render({ busy: true });
    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.every((b) => b.disabled)).toBe(true);
    buttons[0].click();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('US-011-04 si falla (sin red), explica el motivo y deja reintentar', () => {
    const { el } = render({ error: 'Sin conexión a Internet. Inténtalo de nuevo.' });
    const alert = el.querySelector('.error[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Sin conexión a Internet');
    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.every((b) => !b.disabled)).toBe(true);
  });

  it('US-011-04 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountLogoutDialog as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
