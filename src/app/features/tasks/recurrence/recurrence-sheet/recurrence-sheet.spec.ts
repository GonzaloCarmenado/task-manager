import { TestBed } from '@angular/core/testing';
import { Recurrence } from '../../../../core/models/recurrence';
import { CLOCK } from '../../../../core/services/clock';
import { OverlayBack } from '../../../account/shared/overlay-back/overlay-back';
import { RecurrenceSheet } from './recurrence-sheet';

// 2026-11-16 es lunes. «Hoy» es sábado 14.
const FIRST = '2026-11-16';
const NOW = new Date(2026, 10, 14, 10, 0, 0);

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup(rule: Recurrence | null = null) {
  let onBack: () => void = () => undefined;
  const register = vi.fn((cb: () => void) => {
    onBack = cb;
    return { close: async () => undefined };
  });
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RecurrenceSheet],
    providers: [
      { provide: OverlayBack, useValue: { register } },
      { provide: CLOCK, useValue: () => NOW },
    ],
  });
  const fixture = TestBed.createComponent(RecurrenceSheet);
  fixture.componentRef.setInput('rule', rule);
  fixture.componentRef.setInput('firstDate', FIRST);
  const applied: (Recurrence | null)[] = [];
  const dismissed: number[] = [];
  fixture.componentInstance.apply.subscribe((r) => applied.push(r));
  fixture.componentInstance.dismiss.subscribe(() => dismissed.push(1));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const click = (selector: string, index = 0): void => {
    (el.querySelectorAll<HTMLElement>(selector)[index] as HTMLElement).click();
    fixture.detectChanges();
  };
  const clickText = (selector: string, text: string): void => {
    const target = [...el.querySelectorAll<HTMLElement>(selector)].find((e) =>
      e.textContent?.includes(text)
    );
    if (!target) throw new Error(`no hay ${selector} con «${text}»`);
    target.click();
    fixture.detectChanges();
  };
  return { fixture, el, applied, dismissed, register, click, clickText, back: () => onBack() };
}

const text = (el: HTMLElement): string => (el.textContent ?? '').replace(/\s+/g, ' ');

describe('RecurrenceSheet · frecuencia', () => {
  it('US-012-01 ofrece «No se repite», «Todos los días» y «Días de la semana»', () => {
    const { el } = setup();
    const labels = [...el.querySelectorAll('[role="radio"]')].map((r) => r.textContent?.trim());
    expect(labels).toEqual(['No se repite', 'Todos los días', 'Días de la semana']);
  });

  it('US-012-01 marca la opción actual: sin regla, «No se repite»', () => {
    const { el } = setup();
    const checked = [...el.querySelectorAll('[role="radio"][aria-checked="true"]')];
    expect(checked.map((r) => r.textContent?.trim())).toEqual(['No se repite']);
  });

  it('US-012-01 con una regla semanal abre en «Días de la semana» con sus días marcados', () => {
    const { el } = setup({
      kind: 'weekly',
      interval: 1,
      weekdays: [1, 4],
      monthDay: null,
      startDate: FIRST,
      until: null,
    });
    expect(el.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain(
      'Días de la semana'
    );
    const pressed = [...el.querySelectorAll('.day[aria-pressed="true"]')].map((b) =>
      b.getAttribute('aria-label')
    );
    expect(pressed).toEqual(['lunes', 'jueves']);
  });

  it('US-012-01 los siete días de la semana solo aparecen con «Días de la semana»', () => {
    const { el, clickText } = setup();
    expect(el.querySelectorAll('.day')).toHaveLength(0);

    clickText('[role="radio"]', 'Días de la semana');

    const days = [...el.querySelectorAll('.day')];
    expect(days.map((d) => d.textContent?.trim())).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
    expect(days.map((d) => d.getAttribute('aria-label'))).toEqual([
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ]);
  });

  it('US-012-01 al elegir «Días de la semana» viene marcado el día de la fecha', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Días de la semana');
    const pressed = [...el.querySelectorAll('.day[aria-pressed="true"]')].map((b) =>
      b.getAttribute('aria-label')
    );
    expect(pressed).toEqual(['lunes']);
  });

  it('US-012-01 tocar un día lo marca y lo desmarca', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Días de la semana');
    click('.day', 3); // jueves
    expect(el.querySelectorAll('.day[aria-pressed="true"]')).toHaveLength(2);
    click('.day', 3);
    expect(el.querySelectorAll('.day[aria-pressed="true"]')).toHaveLength(1);
  });
});

describe('RecurrenceSheet · validación y resumen', () => {
  it('US-012-01 sin ningún día marcado, «Listo» queda desactivado y se explica por qué', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Días de la semana');
    click('.day', 0); // quita el lunes

    expect(el.querySelector<HTMLButtonElement>('.done')?.disabled).toBe(true);
    expect(text(el)).toContain('Elige al menos un día');
  });

  it('US-012-01 con un día marcado, «Listo» está activo y no hay aviso', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Días de la semana');
    expect(el.querySelector<HTMLButtonElement>('.done')?.disabled).toBe(false);
    expect(text(el)).not.toContain('Elige al menos un día');
  });

  it('US-012-01 muestra el resumen y la primera ocurrencia', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Días de la semana');
    click('.day', 3); // jueves

    expect(text(el)).toContain('Se repetirá los lunes y jueves');
    expect(text(el)).toContain('Primera ocurrencia: lunes 16 de noviembre');
  });

  it('US-012-01 «No se repite» no muestra resumen', () => {
    const { el } = setup();
    expect(el.querySelector('.summary')).toBeNull();
  });
});

describe('RecurrenceSheet · acciones', () => {
  it('US-012-01 «Listo» con «Todos los días» emite la regla diaria desde la fecha', () => {
    const { applied, clickText, click } = setup();
    clickText('[role="radio"]', 'Todos los días');
    click('.done');

    expect(applied).toEqual([
      { kind: 'daily', interval: 1, weekdays: [], monthDay: null, startDate: FIRST, until: null },
    ]);
  });

  it('US-012-01 «Listo» con días emite la regla semanal con los días ordenados', () => {
    const { applied, clickText, click } = setup();
    clickText('[role="radio"]', 'Días de la semana');
    click('.day', 4); // viernes
    click('.done');

    expect(applied[0]).toMatchObject({ kind: 'weekly', weekdays: [1, 5], startDate: FIRST });
  });

  it('US-012-01 «Listo» con «No se repite» emite null (quita la repetición)', () => {
    const { applied, clickText, click } = setup({
      kind: 'daily',
      interval: 1,
      weekdays: [],
      monthDay: null,
      startDate: FIRST,
      until: null,
    });
    clickText('[role="radio"]', 'No se repite');
    click('.done');

    expect(applied).toEqual([null]);
  });

  it('US-012-01 «Descartar» y cerrar descartan sin aplicar nada', () => {
    const a = setup();
    a.click('.discard');
    expect(a.dismissed).toHaveLength(1);
    expect(a.applied).toEqual([]);

    const b = setup();
    b.click('.close');
    expect(b.dismissed).toHaveLength(1);
  });

  it('US-012-01 tocar el velo descarta, pero tocar dentro de la hoja no', () => {
    const { el, fixture, dismissed } = setup();
    (el.querySelector('.sheet') as HTMLElement).click();
    fixture.detectChanges();
    expect(dismissed).toHaveLength(0);

    (el.querySelector('.backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect(dismissed).toHaveLength(1);
  });

  it('US-012-01 el botón atrás de Android la cierra (capa registrada en OverlayBack)', () => {
    const { register, dismissed, back } = setup();
    expect(register).toHaveBeenCalledTimes(1);
    back();
    expect(dismissed).toHaveLength(1);
  });

  it('US-012-01 es un diálogo modal con título y usa OnPush', () => {
    const { el } = setup();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(text(el)).toContain('Configurar repetición');
    expect((RecurrenceSheet as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
