import { TestBed } from '@angular/core/testing';
import { Home } from './home';

type ComponentDef = { ɵcmp: { onPush: boolean } };

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Home] }).compileComponents();
  });

  it('US-001-01 renderiza el título', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Hola');
  });

  it('US-001-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((Home as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
