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
