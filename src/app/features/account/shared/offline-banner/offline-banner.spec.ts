import { TestBed } from '@angular/core/testing';
import { OfflineBanner } from './offline-banner';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup() {
  const fixture = TestBed.createComponent(OfflineBanner);
  fixture.detectChanges();
  return fixture;
}

describe('OfflineBanner', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OfflineBanner] }).compileComponents();
  });

  it('US-011-02 muestra el título y el texto de «sin conexión»', () => {
    const el = setup().nativeElement as HTMLElement;
    expect(el.querySelector('.title')?.textContent?.trim()).toBe('Sin conexión a Internet');
    expect(el.querySelector('.body')?.textContent?.trim()).toBe(
      'No se pudo contactar con el servidor. Tus tareas locales permanecen a salvo.'
    );
  });

  it('US-011-02 se anuncia a los lectores de pantalla', () => {
    expect((setup().nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();
  });

  it('US-011-02 «Reintentar ahora» emite el reintento', () => {
    const fixture = setup();
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button.retry'
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Reintentar ahora');
    expect(button.getAttribute('type')).toBe('button');
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('US-011-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((OfflineBanner as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
