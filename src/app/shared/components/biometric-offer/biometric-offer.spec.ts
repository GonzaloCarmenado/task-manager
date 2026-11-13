import { TestBed } from '@angular/core/testing';
import { BiometricOffer } from './biometric-offer';
import { BiometricOfferConstructorService } from './biometric-offer.constructor.service';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const FORBIDDEN = /\bXP\b|racha|nivel|misi[óo]n|cifrad|encript|a salvo|simulador|oscuro|avatar/i;

describe('BiometricOffer', () => {
  let copy: BiometricOfferConstructorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BiometricOffer] }).compileComponents();
    copy = TestBed.inject(BiometricOfferConstructorService);
  });

  function render(activating = false) {
    const fixture = TestBed.createComponent(BiometricOffer);
    fixture.componentRef.setInput('activating', activating);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    return { fixture, el, buttons, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
  }

  it('US-004-01 muestra la pregunta, la explicación y tres acciones en orden', () => {
    const { text, buttons } = render();

    expect(text()).toContain(copy.title);
    expect(text()).toContain(copy.description);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      copy.actions.accept,
      copy.actions.later,
      copy.actions.never,
    ]);
    buttons.forEach((b) => expect(b.getAttribute('type')).toBe('button'));
  });

  it('US-004-01 cada acción emite su salida', () => {
    const { fixture, buttons } = render();
    const accept = vi.fn();
    const later = vi.fn();
    const never = vi.fn();
    fixture.componentInstance.accept.subscribe(accept);
    fixture.componentInstance.later.subscribe(later);
    fixture.componentInstance.never.subscribe(never);

    buttons[0].click();
    buttons[1].click();
    buttons[2].click();

    expect(accept).toHaveBeenCalledTimes(1);
    expect(later).toHaveBeenCalledTimes(1);
    expect(never).toHaveBeenCalledTimes(1);
  });

  it('US-004-01 con una activación en curso las tres acciones están deshabilitadas', () => {
    const { buttons } = render(true);
    buttons.forEach((b) => expect(b.disabled).toBe(true));
    expect(render(false).buttons.every((b) => !b.disabled)).toBe(true);
  });

  it('US-004-01 es un diálogo modal sin XP, simulador, barra de volver ni elementos de prototipo', () => {
    const { el, text } = render();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(text()).not.toMatch(FORBIDDEN);
    expect(el.querySelector('nav, header, img, input')).toBeNull();
  });

  it('US-004-01 el icono es decorativo', () => {
    expect(render().el.querySelector('app-icon svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('US-004-01 es OnPush', () => {
    expect((BiometricOffer as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
