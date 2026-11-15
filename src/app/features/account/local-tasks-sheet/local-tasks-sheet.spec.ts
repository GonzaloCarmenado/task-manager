import { TestBed } from '@angular/core/testing';
import { LocalTasksSheet } from './local-tasks-sheet';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(count = 3) {
  const fixture = TestBed.createComponent(LocalTasksSheet);
  fixture.componentRef.setInput('count', count);
  fixture.detectChanges();
  const bring = vi.fn();
  const useOnly = vi.fn();
  const cancel = vi.fn();
  fixture.componentInstance.bring.subscribe(bring);
  fixture.componentInstance.useOnly.subscribe(useOnly);
  fixture.componentInstance.cancel.subscribe(cancel);
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text)
    ) as HTMLButtonElement;
  return { fixture, el, bring, useOnly, cancel, button };
}

describe('LocalTasksSheet', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LocalTasksSheet] }).compileComponents();
  });

  it('US-011-02 es un diálogo modal con título accesible', () => {
    const { el } = render();
    const dialog = el.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = el.querySelector('h2') as HTMLElement;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent?.trim()).toBe('¿Qué quieres hacer con las tareas de este móvil?');
  });

  it('US-011-02 cabecera, explicación y caja de recuento con «Pendientes»', () => {
    const { el } = render(3);
    expect(el.textContent).toContain('Tareas encontradas');
    expect(el.textContent).toContain(
      'Este dispositivo tiene tareas creadas sin cuenta. Decide qué hacer con ellas al entrar en tu cuenta.'
    );
    expect(el.querySelector('.count-text')?.textContent?.trim()).toBe(
      '3 tareas locales sin cuenta'
    );
    expect(el.querySelector('.count-badge')?.textContent?.trim()).toBe('Pendientes');
  });

  it('US-011-02 el recuento y los textos van en singular con una tarea', () => {
    const { el } = render(1);
    expect(el.querySelector('.count-text')?.textContent?.trim()).toBe('1 tarea local sin cuenta');
    expect(el.textContent).toContain('Se añadirá 1 tarea pendiente de este móvil a tu cuenta.');
  });

  it('US-011-02 la opción A trae las pendientes, con su nota de XP y completadas, y no es «Recomendado»', () => {
    const { el } = render(3);
    expect(el.textContent).toContain('Traer mis tareas pendientes a mi cuenta');
    expect(el.textContent).toContain('Se añadirán 3 tareas pendientes de este móvil a tu cuenta.');
    expect(el.textContent).toContain(
      'Nota: El XP y las tareas ya completadas de este móvil no se sumarán.'
    );
    expect(el.textContent).not.toContain('Recomendado');
  });

  it('US-011-02 la opción A viene seleccionada y se marca como tal', () => {
    const { el } = render();
    const a = el.querySelector('button.option-bring') as HTMLButtonElement;
    expect(a.getAttribute('aria-pressed')).toBe('true');
    expect(a.classList.contains('selected')).toBe(true);
  });

  it('US-011-02 la opción B «Usar solo mi cuenta» pide confirmar el descarte', () => {
    const { el, button, useOnly, bring } = render();
    expect(el.textContent).toContain(
      'Las tareas de este móvil se descartarán para mostrar únicamente tu cuenta.'
    );
    button('Usar solo mi cuenta').click();
    expect(useOnly).toHaveBeenCalledTimes(1);
    expect(bring).not.toHaveBeenCalled();
  });

  it('US-011-02 «Traer tareas y continuar» emite bring', () => {
    const { button, bring } = render();
    button('Traer tareas y continuar').click();
    expect(bring).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 «Cancelar inicio de sesión», el velo y el botón atrás cancelan', () => {
    const a = render();
    a.button('Cancelar inicio de sesión').click();
    expect(a.cancel).toHaveBeenCalledTimes(1);

    const b = render();
    (b.el.querySelector('.scrim') as HTMLElement).click();
    expect(b.cancel).toHaveBeenCalledTimes(1);

    const c = render();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(c.cancel).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((LocalTasksSheet as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
