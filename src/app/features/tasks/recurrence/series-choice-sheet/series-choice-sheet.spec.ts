import { TestBed } from '@angular/core/testing';
import { OverlayBack } from '../../../account/shared/overlay-back/overlay-back';
import { SeriesChoiceMode, SeriesChoiceSheet } from './series-choice-sheet';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup(mode: SeriesChoiceMode) {
  let onBack: () => void = () => undefined;
  const register = vi.fn((cb: () => void) => {
    onBack = cb;
    return { close: async () => undefined };
  });
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SeriesChoiceSheet],
    providers: [{ provide: OverlayBack, useValue: { register } }],
  });
  const fixture = TestBed.createComponent(SeriesChoiceSheet);
  fixture.componentRef.setInput('mode', mode);
  const events: string[] = [];
  fixture.componentInstance.single.subscribe(() => events.push('single'));
  fixture.componentInstance.series.subscribe(() => events.push('series'));
  fixture.componentInstance.cancel.subscribe(() => events.push('cancel'));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const click = (selector: string): void => {
    el.querySelector<HTMLElement>(selector)?.click();
    fixture.detectChanges();
  };
  const text = (): string => (el.textContent ?? '').replace(/\s+/g, ' ');
  return { fixture, el, events, register, click, text, back: () => onBack() };
}

describe('SeriesChoiceSheet · editar', () => {
  it('US-012-03 pregunta si el cambio es solo para esta ocurrencia o para toda la serie', () => {
    const { text, el } = setup('edit');
    expect(text()).toContain('Esta tarea se repite');
    expect(text()).toContain('Solo esta');
    expect(text()).toContain('Toda la serie');
    expect(el.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  });

  it('US-012-03 los textos no dicen «para hoy» ni «todas las futuras»', () => {
    const { text } = setup('edit');
    expect(text()).not.toContain('hoy');
    expect(text()).not.toContain('todas las futuras');
  });

  it('US-012-03 «Solo esta» y «Toda la serie» emiten su opción', () => {
    const a = setup('edit');
    a.click('.single');
    expect(a.events).toEqual(['single']);

    const b = setup('edit');
    b.click('.all');
    expect(b.events).toEqual(['series']);
  });

  it('US-012-03 «Cancelar» y el velo cancelan, pero tocar dentro de la hoja no', () => {
    const a = setup('edit');
    a.click('.cancel');
    expect(a.events).toEqual(['cancel']);
    expect(a.text()).toContain('Cancelar');

    const b = setup('edit');
    b.click('.sheet');
    expect(b.events).toEqual([]);
    b.click('.backdrop');
    expect(b.events).toEqual(['cancel']);
  });

  it('US-012-03 el botón atrás de Android la cancela (capa registrada en OverlayBack)', () => {
    const { register, events, back } = setup('edit');
    expect(register).toHaveBeenCalledTimes(1);
    back();
    expect(events).toEqual(['cancel']);
  });
});

describe('SeriesChoiceSheet · borrar', () => {
  it('US-012-03 explica qué borra cada opción y que lo completado se conserva', () => {
    const { text } = setup('delete');
    expect(text()).toContain('Esta tarea se repite');
    expect(text()).toContain('Solo esta');
    expect(text()).toContain('Toda la serie');
    expect(text()).toContain('Las ocurrencias ya completadas se conservan');
    expect(text()).not.toContain('todas las tareas futuras');
  });

  it('US-012-03 en borrar, el botón de salida es «Volver atrás»', () => {
    const { text, click, events } = setup('delete');
    expect(text()).toContain('Volver atrás');
    click('.cancel');
    expect(events).toEqual(['cancel']);
  });

  it('US-012-03 «Toda la serie» al borrar es la acción destructiva y emite series', () => {
    const { el, click, events } = setup('delete');
    expect(el.querySelector('.all')?.classList.contains('danger')).toBe(true);
    click('.all');
    expect(events).toEqual(['series']);
  });

  it('US-012-03 usa ChangeDetectionStrategy.OnPush', () => {
    expect((SeriesChoiceSheet as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
