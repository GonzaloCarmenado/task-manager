import { TestBed } from '@angular/core/testing';
import { AlarmsConstructorService } from '../../../../core/services/alarms.constructor.service';
import { AlarmsBanner } from './alarms-banner';

type ComponentDef = { ɵcmp: { onPush: boolean } };

describe('AlarmsBanner', () => {
  let copy: AlarmsConstructorService['copy'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AlarmsBanner] }).compileComponents();
    copy = TestBed.inject(AlarmsConstructorService).copy;
  });

  function render() {
    const fixture = TestBed.createComponent(AlarmsBanner);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-006-02 avisa de que las alarmas están desactivadas', () => {
    const { text, el } = render();
    expect(text()).toContain(copy.banner.message);
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });

  it('US-006-02 Activar alarmas y cerrar emiten', () => {
    const { fixture, el } = render();
    const activate = vi.fn();
    const dismiss = vi.fn();
    fixture.componentInstance.activate.subscribe(activate);
    fixture.componentInstance.dismiss.subscribe(dismiss);

    const [activateButton, dismissButton] = Array.from(el.querySelectorAll('button'));
    expect(activateButton.textContent).toContain(copy.banner.activate);
    expect(dismissButton.getAttribute('aria-label')).toBe(copy.banner.dismiss);
    activateButton.click();
    dismissButton.click();

    expect(activate).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('US-006-02 todos los botones son de tipo button y tienen nombre accesible', () => {
    const { el } = render();
    for (const b of Array.from(el.querySelectorAll('button'))) {
      expect(b.getAttribute('type')).toBe('button');
      expect((b.getAttribute('aria-label') ?? b.textContent ?? '').trim().length).toBeGreaterThan(
        0
      );
    }
  });

  it('US-006-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AlarmsBanner as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
