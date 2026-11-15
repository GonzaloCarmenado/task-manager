import { TestBed } from '@angular/core/testing';
import { DiscardConfirm } from './discard-confirm';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(count: number, variant: 'pending' | 'completed' = 'pending') {
  const fixture = TestBed.createComponent(DiscardConfirm);
  fixture.componentRef.setInput('count', count);
  fixture.componentRef.setInput('variant', variant);
  fixture.detectChanges();
  const confirm = vi.fn();
  const back = vi.fn();
  fixture.componentInstance.confirm.subscribe(confirm);
  fixture.componentInstance.back.subscribe(back);
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text)
    ) as HTMLButtonElement;
  return { el, confirm, back, button };
}

describe('DiscardConfirm', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DiscardConfirm] }).compileComponents();
  });

  it('US-011-02 es un diálogo de alerta modal con título accesible', () => {
    const { el } = render(2);
    const dialog = el.querySelector('[role="alertdialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = el.querySelector('h2') as HTMLElement;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent?.trim()).toBe('¿Descartar tareas de este móvil?');
  });

  it('US-011-02 avisa de que no se puede deshacer, con el número de tareas', () => {
    expect(render(2).el.textContent).toContain(
      'Esta acción no se puede deshacer. Las 2 tareas pendientes de este móvil se perderán y se cargará tu cuenta.'
    );
    expect(render(1).el.textContent).toContain('La tarea pendiente de este móvil se perderá');
  });

  it('US-011-02 «Sí, descartar tareas locales» confirma y «Volver a opciones» vuelve', () => {
    const { button, confirm, back } = render(2);
    button('Sí, descartar tareas locales').click();
    expect(confirm).toHaveBeenCalledTimes(1);
    button('Volver a opciones').click();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 el botón atrás de Android equivale a «Volver a opciones»', () => {
    const { back, confirm } = render(2);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(back).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('US-011-02 variante «solo completadas»: otra pregunta, otro texto y otros botones', () => {
    const { el, button, confirm, back } = render(4, 'completed');
    expect(el.querySelector('h2')?.textContent?.trim()).toBe(
      '¿Continuar sin las tareas de este móvil?'
    );
    expect(el.textContent).toContain(
      'Las 4 tareas completadas de este móvil y su XP no se sumarán a tu cuenta. No se puede deshacer.'
    );
    button('Sí, continuar').click();
    expect(confirm).toHaveBeenCalledTimes(1);
    button('Cancelar inicio de sesión').click();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((DiscardConfirm as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
