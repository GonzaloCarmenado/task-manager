import { TestBed } from '@angular/core/testing';
import { AlarmsConstructorService } from '../../../../core/services/alarms.constructor.service';
import { ExactAlarmSheet } from './exact-alarm-sheet';

type ComponentDef = { ɵcmp: { onPush: boolean } };

describe('ExactAlarmSheet', () => {
  let copy: AlarmsConstructorService['copy'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ExactAlarmSheet] }).compileComponents();
    copy = TestBed.inject(AlarmsConstructorService).copy;
  });

  function render() {
    const fixture = TestBed.createComponent(ExactAlarmSheet);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-006-02 explica qué hay que permitir y que, si no, el aviso puede retrasarse unos minutos', () => {
    const { text } = render();
    expect(text()).toContain(copy.exact.title);
    expect(text()).toContain(copy.exact.description);
    expect(text()).toContain('unos minutos');
  });

  it('US-006-02 Ir a ajustes y Omitir por ahora emiten', () => {
    const { fixture, el } = render();
    const openSettings = vi.fn();
    const skip = vi.fn();
    fixture.componentInstance.openSettings.subscribe(openSettings);
    fixture.componentInstance.skip.subscribe(skip);

    const buttons = Array.from(el.querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      copy.exact.openSettings,
      copy.exact.skip,
    ]);
    buttons.forEach((b) => expect(b.getAttribute('type')).toBe('button'));
    buttons[0].click();
    buttons[1].click();

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(skip).toHaveBeenCalledTimes(1);
  });

  it('US-006-02 es un diálogo modal accesible y sin elementos de prototipo', () => {
    const { el, text } = render();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(text()).not.toMatch(/simulador|misi[óo]n|XP|racha/i);
  });

  it('US-006-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((ExactAlarmSheet as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
