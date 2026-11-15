import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountReminder } from './account-reminder';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [AccountReminder], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(AccountReminder);
  fixture.detectChanges();
  const snooze = vi.fn();
  fixture.componentInstance.snooze.subscribe(snooze);
  return { el: fixture.nativeElement as HTMLElement, snooze };
}

describe('AccountReminder', () => {
  it('US-011-08 muestra la etiqueta, el título y el texto del recordatorio', () => {
    const { el } = render();
    expect(el.querySelector('.label')?.textContent?.trim()).toBe('Asegura tu progreso');
    expect(el.querySelector('.title')?.textContent?.trim()).toBe('Crea tu respaldo personal');
    expect(el.querySelector('.body')?.textContent?.trim()).toBe(
      'Tus datos solo están en este móvil. Crea una cuenta para no perderlos al cambiar de teléfono.'
    );
  });

  it('US-011-08 «Crear cuenta» lleva a /cuenta/crear', () => {
    const link = render().el.querySelector('a.create') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Crear cuenta');
    expect(link.getAttribute('href')).toBe('/cuenta/crear');
  });

  it('US-011-08 el aspa y «En 14 días» hacen lo mismo y tienen nombres accesibles distintos', () => {
    const { el, snooze } = render();
    const close = el.querySelector('button.close') as HTMLButtonElement;
    const later = el.querySelector('button.later') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Descartar recordatorio');
    expect(later.getAttribute('aria-label')).toBe('Recordármelo dentro de 14 días');
    expect(later.textContent?.trim()).toBe('En 14 días');

    close.click();
    later.click();
    expect(snooze).toHaveBeenCalledTimes(2);
  });

  it('US-011-08 no hay más controles que esos tres', () => {
    const { el } = render();
    expect(el.querySelectorAll('a, button')).toHaveLength(3);
  });

  it('US-011-08 los elementos decorativos no se anuncian', () => {
    const { el } = render();
    expect(el.querySelector('.tile')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('US-011-08 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountReminder as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
