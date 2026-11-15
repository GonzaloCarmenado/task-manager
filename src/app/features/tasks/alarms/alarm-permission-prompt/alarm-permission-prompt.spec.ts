import { TestBed } from '@angular/core/testing';
import { AlarmsConstructorService } from '../../../../core/services/alarms.constructor.service';
import { AlarmPermissionPrompt } from './alarm-permission-prompt';

type ComponentDef = { ɵcmp: { onPush: boolean } };

describe('AlarmPermissionPrompt', () => {
  let copy: AlarmsConstructorService['copy'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AlarmPermissionPrompt] }).compileComponents();
    copy = TestBed.inject(AlarmsConstructorService).copy;
  });

  function render() {
    const fixture = TestBed.createComponent(AlarmPermissionPrompt);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-006-02 muestra el título y la explicación del permiso', () => {
    const { text } = render();
    expect(text()).toContain(copy.prompt.title);
    expect(text()).toContain(copy.prompt.description);
  });

  it('US-006-02 tiene dos acciones, Permitir y Ahora no, que emiten', () => {
    const { fixture, el } = render();
    const allow = vi.fn();
    const later = vi.fn();
    fixture.componentInstance.allow.subscribe(allow);
    fixture.componentInstance.later.subscribe(later);

    const buttons = Array.from(el.querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      copy.prompt.allow,
      copy.prompt.later,
    ]);
    buttons.forEach((b) => expect(b.getAttribute('type')).toBe('button'));
    buttons[0].click();
    buttons[1].click();

    expect(allow).toHaveBeenCalledTimes(1);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('US-006-02 con una petición en curso las dos acciones quedan deshabilitadas', () => {
    const { fixture, el } = render();
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    el.querySelectorAll('button').forEach((b) => expect(b.disabled).toBe(true));
  });

  it('US-006-02 es un diálogo modal accesible, con icono decorativo y sin elementos de prototipo', () => {
    const { el, text } = render();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(el.querySelector('app-icon svg[aria-hidden="true"]')).not.toBeNull();
    expect(text()).not.toMatch(/spam|simulador|misi[óo]n|XP|racha/i);
    expect(el.querySelector('nav, img, input')).toBeNull();
  });

  it('US-006-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AlarmPermissionPrompt as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
