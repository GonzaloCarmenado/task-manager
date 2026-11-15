import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RecurrencePreview } from './recurrence-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(state: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RecurrencePreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ state }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(RecurrencePreview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const checked = (el: HTMLElement): string =>
  el.querySelector('[role="radio"][aria-checked="true"]')?.textContent?.trim() ?? '';

describe('RecurrencePreview (solo desarrollo)', () => {
  it('US-012-01 muestra la hoja de repetición', () => {
    const el = render('none');
    expect(el.querySelector('app-recurrence-sheet')).not.toBeNull();
    expect(el.textContent).toContain('Configurar repetición');
    expect(checked(el)).toBe('No se repite');
  });

  it('US-012-01 «daily» abre en «Todos los días» y «weekly» en «Días de la semana»', () => {
    expect(checked(render('daily'))).toBe('Todos los días');
    const weekly = render('weekly');
    expect(checked(weekly)).toBe('Días de la semana');
    expect(weekly.querySelectorAll('.day[aria-pressed="true"]')).toHaveLength(2);
  });

  it('US-012-01 «sin-dias» muestra el aviso de elegir al menos un día', () => {
    const el = render('sin-dias');
    expect(el.textContent).toContain('Elige al menos un día');
    expect(el.querySelector<HTMLButtonElement>('.done')?.disabled).toBe(true);
  });

  it('US-012-01 un estado desconocido cae en «No se repite»', () => {
    expect(checked(render('inventado'))).toBe('No se repite');
  });

  it('US-012-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((RecurrencePreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});

describe('RecurrencePreview · opciones de la spec 012 P2', () => {
  it('US-012-05 «cada-n» abre en «Cada N días» con su intervalo', () => {
    const el = render('cada-n');
    expect(checked(el)).toBe('Cada N días');
    expect(el.querySelector('.stepper .value')?.textContent?.trim()).toBe('3');
  });

  it('US-012-05 «semanas» abre en «Cada N semanas» y «mes» en «Un día del mes» con el aviso del día 31', () => {
    expect(checked(render('semanas'))).toBe('Cada N semanas');
    const mes = render('mes');
    expect(checked(mes)).toBe('Un día del mes');
    expect(mes.textContent).toContain('será el último día del mes');
  });

  it('US-012-06 «fin-error» muestra el error de la fecha de fin', () => {
    const el = render('fin-error');
    expect(el.textContent).toContain('La fecha de fin no puede ser anterior');
    expect(el.querySelector<HTMLButtonElement>('.done')?.disabled).toBe(true);
  });
});
