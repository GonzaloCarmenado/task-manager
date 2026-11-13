import { TestBed } from '@angular/core/testing';
import { BiometricNotice } from './biometric-notice';
import { BiometricNoticeConstructorService } from './biometric-notice.constructor.service';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const FORBIDDEN = /\bXP\b|racha|nivel|misi[óo]n|cifrad|encript|informativo|\bRK\b|oscuro/i;

describe('BiometricNotice', () => {
  let copy: BiometricNoticeConstructorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BiometricNotice] }).compileComponents();
    copy = TestBed.inject(BiometricNoticeConstructorService);
  });

  function render() {
    const fixture = TestBed.createComponent(BiometricNotice);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-004-03 muestra el título y la explicación del desactivado', () => {
    const { text } = render();
    expect(text()).toContain(copy.title);
    expect(text()).toContain(copy.description);
  });

  it('US-004-03 tiene un único botón «Entendido» que emite acknowledge y no pide la huella', () => {
    const { fixture, el } = render();
    const emitted = vi.fn();
    fixture.componentInstance.acknowledge.subscribe(emitted);

    const buttons = el.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain(copy.acknowledgeLabel);
    expect(buttons[0].getAttribute('type')).toBe('button');
    buttons[0].click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('US-004-03 es un diálogo modal sin datos de la app ni elementos de prototipo', () => {
    const { el, text } = render();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(text()).not.toMatch(FORBIDDEN);
    expect(el.querySelector('app-icon svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('US-004-03 es OnPush', () => {
    expect((BiometricNotice as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
