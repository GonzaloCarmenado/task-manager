import { TestBed } from '@angular/core/testing';
import { App } from './app';

type ComponentDef = { ɵcmp: { onPush: boolean } };

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('US-001-01 crea la app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('US-001-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((App as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });

  it('US-001-01 contiene un router-outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).not.toBeNull();
  });
});
