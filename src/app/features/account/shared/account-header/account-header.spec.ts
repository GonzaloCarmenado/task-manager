import { TestBed } from '@angular/core/testing';
import { AccountHeader } from './account-header';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(title = 'Crear cuenta') {
  const fixture = TestBed.createComponent(AccountHeader);
  fixture.componentRef.setInput('title', title);
  fixture.detectChanges();
  return fixture;
}

describe('AccountHeader', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccountHeader] }).compileComponents();
  });

  it('US-011-01 muestra el título como encabezado de la pantalla', () => {
    const el = render('Iniciar sesión').nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Iniciar sesión');
  });

  it('US-011-01 el botón atrás tiene nombre accesible y emite al pulsarlo', () => {
    const fixture = render();
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button.back'
    ) as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Volver');
    expect(button.getAttribute('type')).toBe('button');
    button.click();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('US-011-01 el círculo de la derecha es decorativo y no se anuncia', () => {
    const deco = (render().nativeElement as HTMLElement).querySelector('.profile');
    expect(deco).not.toBeNull();
    expect(deco?.getAttribute('aria-hidden')).toBe('true');
  });

  it('US-011-01 reserva el hueco de la cabecera fija para que el contenido no quede debajo', () => {
    expect((render().nativeElement as HTMLElement).querySelector('.spacer')).not.toBeNull();
  });

  it('US-011-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountHeader as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
