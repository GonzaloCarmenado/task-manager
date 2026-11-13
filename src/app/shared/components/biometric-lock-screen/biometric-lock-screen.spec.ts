import { TestBed } from '@angular/core/testing';
import { LockPhase } from '../../../core/models/biometric';
import { BiometricLockScreen } from './biometric-lock-screen';
import { BiometricLockScreenConstructorService } from './biometric-lock-screen.constructor.service';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const PHASES: readonly LockPhase[] = ['prompting', 'cancelled', 'failed', 'lockout'];
const FORBIDDEN =
  /\bXP\b|racha|nivel|misi[óo]n|cifrad|encript|a salvo|simulador|oscuro|\bPIN\b|patr[óo]n/i;

describe('BiometricLockScreen', () => {
  let copy: BiometricLockScreenConstructorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BiometricLockScreen] }).compileComponents();
    copy = TestBed.inject(BiometricLockScreenConstructorService);
  });

  function render(phase: LockPhase) {
    const fixture = TestBed.createComponent(BiometricLockScreen);
    fixture.componentRef.setInput('phase', phase);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-004-02 cada fase muestra el título y su mensaje', () => {
    for (const phase of PHASES) {
      const { text } = render(phase);
      expect(text(), phase).toContain(copy.title);
      expect(text(), phase).toContain(copy.phaseCopy(phase).message);
    }
  });

  it('US-004-02 el botón «Desbloquear con huella» emite unlock cuando no hay un aviso abierto', () => {
    for (const phase of ['cancelled', 'failed', 'lockout'] as const) {
      const { fixture, el } = render(phase);
      const emitted = vi.fn();
      fixture.componentInstance.unlock.subscribe(emitted);

      const buttons = el.querySelectorAll('button');
      expect(buttons, phase).toHaveLength(1);
      expect(buttons[0].textContent).toContain(copy.unlockLabel);
      expect(buttons[0].getAttribute('type')).toBe('button');
      buttons[0].click();

      expect(emitted, phase).toHaveBeenCalledTimes(1);
    }
  });

  it('US-004-02 mientras espera la huella el botón queda deshabilitado y se anuncia la espera', () => {
    const { el } = render('prompting');
    const buttons = el.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain(copy.unlockLabel);
    expect(buttons[0].disabled).toBe(true);
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });

  it('US-004-02 en el resto de fases el botón está activo y los fallos se anuncian como alerta', () => {
    for (const phase of ['cancelled', 'failed', 'lockout'] as const) {
      const { el } = render(phase);
      expect(el.querySelector('button')?.disabled, phase).toBe(false);
    }
    expect(render('failed').el.querySelector('[role="alert"]')).not.toBeNull();
    expect(render('lockout').el.querySelector('[role="alert"]')).not.toBeNull();
    expect(render('cancelled').el.querySelector('[role="alert"]')).toBeNull();
  });

  it('US-004-02 no muestra ningún dato de la app ni elementos de prototipo ni botón de PIN propio', () => {
    for (const phase of PHASES) {
      const { text, el } = render(phase);
      expect(text(), phase).not.toMatch(FORBIDDEN);
      expect(el.querySelector('input, a, nav, img'), phase).toBeNull();
    }
  });

  it('US-004-02 el icono es decorativo y ocupa toda la pantalla como diálogo modal', () => {
    const { el } = render('cancelled');
    expect(el.querySelector('app-icon svg[aria-hidden="true"]')).not.toBeNull();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('US-004-02 es OnPush', () => {
    expect((BiometricLockScreen as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
