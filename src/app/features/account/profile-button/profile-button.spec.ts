import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileButton } from './profile-button';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ProfileButton], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(ProfileButton);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProfileButton', () => {
  it('US-011-03 es un enlace con nombre accesible «Cuenta» que abre /cuenta', () => {
    const link = render().querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('aria-label')).toBe('Cuenta');
    expect(link.getAttribute('href')).toBe('/cuenta');
  });

  it('US-011-03 muestra un círculo con el icono de persona', () => {
    const el = render();
    expect(el.querySelector('.circle app-icon')).not.toBeNull();
  });

  it('US-011-03 usa ChangeDetectionStrategy.OnPush', () => {
    expect((ProfileButton as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
