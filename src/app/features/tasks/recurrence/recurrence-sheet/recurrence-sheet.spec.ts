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
  it('US-012-01 ofrece las seis frecuencias', () => {
    const { el } = setup();
    const labels = [...el.querySelectorAll('[role="radio"]')].map((r) => r.textContent?.trim());
    expect(labels).toEqual([
      'No se repite',
      'Todos los días',
      'Días de la semana',
      'Cada N días',
      'Cada N semanas',
      'Un día del mes',
    ]);
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

describe('RecurrenceSheet · intervalos y día del mes (US-012-05)', () => {
  const value = (el: HTMLElement): string =>
    el.querySelector('.stepper .value')?.textContent?.trim() ?? '';

  it('US-012-05 «Cada N días» muestra un selector con 2 por defecto y su resumen', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Cada N días');

    expect(value(el)).toBe('2');
    expect(text(el)).toContain('Se repetirá cada 2 días');
    expect(el.querySelectorAll('.day')).toHaveLength(0);
  });

  it('US-012-05 los botones + y − cambian el intervalo dentro de 1 a 30', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Cada N días');
    click('.stepper .plus');
    expect(value(el)).toBe('3');

    for (let i = 0; i < 5; i += 1) click('.stepper .minus');
    expect(value(el)).toBe('1');

    for (let i = 0; i < 40; i += 1) click('.stepper .plus');
    expect(value(el)).toBe('30');
  });

  it('US-012-05 los botones + y − miden al menos 44 px de zona táctil (clase compartida con los días)', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Cada N días');
    expect(el.querySelector('.stepper .plus')?.getAttribute('aria-label')).toBe('Más');
    expect(el.querySelector('.stepper .minus')?.getAttribute('aria-label')).toBe('Menos');
  });

  it('US-012-05 «Cada N semanas» muestra el selector y también los siete días', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Cada N semanas');

    expect(value(el)).toBe('2');
    expect(el.querySelectorAll('.day')).toHaveLength(7);
    expect(text(el)).toContain('Se repetirá cada 2 semanas, los lunes');
  });

  it('US-012-05 «Cada N semanas» sin ningún día desactiva «Listo»', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Cada N semanas');
    click('.day', 0);
    expect(el.querySelector<HTMLButtonElement>('.done')?.disabled).toBe(true);
    expect(text(el)).toContain('Elige al menos un día');
  });

  it('US-012-05 «Un día del mes» abre con el día de la fecha y deja elegir de 1 a 31', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Un día del mes');

    expect(value(el)).toBe('16');
    expect(text(el)).toContain('Se repetirá el día 16 de cada mes');

    for (let i = 0; i < 40; i += 1) click('.stepper .plus');
    expect(value(el)).toBe('31');
    for (let i = 0; i < 40; i += 1) click('.stepper .minus');
    expect(value(el)).toBe('1');
  });

  it('US-012-05 desde el día 29 avisa de que en los meses cortos será el último día', () => {
    const { el, clickText, click } = setup();
    clickText('[role="radio"]', 'Un día del mes');
    expect(text(el)).not.toContain('será el último día del mes');

    for (let i = 0; i < 13; i += 1) click('.stepper .plus'); // 16 → 29
    expect(text(el)).toContain('En los meses que no tengan ese día, será el último día del mes.');
  });

  it('US-012-05 «Listo» emite la regla con el intervalo o el día elegidos', () => {
    const a = setup();
    a.clickText('[role="radio"]', 'Cada N días');
    a.click('.stepper .plus');
    a.click('.done');
    expect(a.applied[0]).toMatchObject({ kind: 'daily', interval: 3, startDate: FIRST });

    const b = setup();
    b.clickText('[role="radio"]', 'Un día del mes');
    b.click('.done');
    expect(b.applied[0]).toMatchObject({ kind: 'monthly', monthDay: 16, interval: 1 });
  });

  it('US-012-05 abrir con una regla cada 2 semanas muestra su intervalo y sus días', () => {
    const { el } = setup({
      kind: 'weekly',
      interval: 2,
      weekdays: [5],
      monthDay: null,
      startDate: FIRST,
      until: null,
    });
    expect(el.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain(
      'Cada N semanas'
    );
    expect(value(el)).toBe('2');
    expect(
      [...el.querySelectorAll('.day[aria-pressed="true"]')].map((b) => b.getAttribute('aria-label'))
    ).toEqual(['viernes']);
  });
});

describe('RecurrenceSheet · finalización (US-012-06)', () => {
  const endDate = (el: HTMLElement): HTMLInputElement | null =>
    el.querySelector<HTMLInputElement>('input.end-date');
  const setEnd = (fixture: { detectChanges(): void }, el: HTMLElement, value: string): void => {
    const input = endDate(el) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  it('US-012-06 «No se repite» no muestra la finalización', () => {
    const { el } = setup();
    expect(el.querySelector('.ending')).toBeNull();
  });

  it('US-012-06 por defecto es «Nunca» y no hay selector de fecha', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Todos los días');

    expect(el.querySelector('.end[aria-pressed="true"]')?.textContent).toContain('Nunca');
    expect(endDate(el)).toBeNull();
  });

  it('US-012-06 «El día…» muestra el selector con la primera ocurrencia como mínimo y valor', () => {
    const { el, clickText } = setup();
    clickText('[role="radio"]', 'Todos los días');
    clickText('.end', 'El día');

    expect(endDate(el)?.min).toBe(FIRST);
    expect(endDate(el)?.value).toBe(FIRST);
    expect(el.querySelector('.end[aria-pressed="true"]')?.textContent).toContain('El día');
  });

  it('US-012-06 una fecha de fin anterior a la primera ocurrencia es un error y desactiva «Listo»', () => {
    const { fixture, el, clickText } = setup();
    clickText('[role="radio"]', 'Todos los días');
    clickText('.end', 'El día');
    setEnd(fixture, el, '2026-11-15');

    expect(text(el)).toContain('La fecha de fin no puede ser anterior a la primera ocurrencia');
    expect(el.querySelector<HTMLButtonElement>('.done')?.disabled).toBe(true);
  });

  it('US-012-06 «Listo» con una fecha de fin válida la incluye en la regla y el resumen', () => {
    const { fixture, el, applied, clickText, click } = setup();
    clickText('[role="radio"]', 'Todos los días');
    clickText('.end', 'El día');
    setEnd(fixture, el, '2026-12-30');

    expect(text(el)).toContain('hasta el 30 de diciembre');
    click('.done');
    expect(applied[0]).toMatchObject({ kind: 'daily', until: '2026-12-30' });
  });

  it('US-012-06 volver a «Nunca» quita la fecha de fin', () => {
    const { el, applied, clickText, click } = setup();
    clickText('[role="radio"]', 'Todos los días');
    clickText('.end', 'El día');
    clickText('.end', 'Nunca');
    click('.done');

    expect(endDate(el)).toBeNull();
    expect(applied[0]).toMatchObject({ until: null });
  });

  it('US-012-06 con una regla que ya tiene fecha de fin, abre en «El día…» con su fecha', () => {
    const { el } = setup({
      kind: 'daily',
      interval: 1,
      weekdays: [],
      monthDay: null,
      startDate: FIRST,
      until: '2026-12-30',
    });
    expect(el.querySelector('.end[aria-pressed="true"]')?.textContent).toContain('El día');
    expect(endDate(el)?.value).toBe('2026-12-30');
  });
});
