import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BiometricPreview } from './biometric-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(state: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [BiometricPreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ state }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(BiometricPreview);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('BiometricPreview (solo desarrollo)', () => {
  it('US-004-01 «offer» muestra la oferta de activación', () => {
    const { el, text } = render('offer');
    expect(el.querySelector('app-biometric-offer')).not.toBeNull();
    expect(text()).toContain('¿Proteger la app con tu huella?');
  });

  it('US-004-02 cada fase del bloqueo muestra la pantalla de bloqueo en esa fase', () => {
    for (const phase of ['prompting', 'cancelled', 'failed', 'lockout']) {
      const { el } = render(`lock-${phase}`);
      expect(
        el.querySelector(`app-biometric-lock-screen [data-phase="${phase}"]`),
        phase
      ).not.toBeNull();
    }
  });

  it('US-004-03 «notice» muestra el aviso de desactivado', () => {
    const { el, text } = render('notice');
    expect(el.querySelector('app-biometric-notice')).not.toBeNull();
    expect(text()).toContain('Bloqueo con huella desactivado');
  });

  it('US-004-02 un estado desconocido cae en la pantalla de bloqueo cancelada', () => {
    const { el } = render('inventado');
    expect(el.querySelector('app-biometric-lock-screen [data-phase="cancelled"]')).not.toBeNull();
  });

  it('US-004-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((BiometricPreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
