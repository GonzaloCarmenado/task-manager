import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { SessionStatusPreview } from './session-status-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(state: string, query: Record<string, string> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SessionStatusPreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ state }),
            queryParamMap: convertToParamMap(query),
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(SessionStatusPreview);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('SessionStatusPreview (solo desarrollo)', () => {
  it('US-003-06 loading muestra la pantalla de carga', () => {
    const { text, el } = render('loading');
    expect(text()).toContain('Preparando tu espacio');
    expect(el.querySelector('button')).toBeNull();
  });

  it('US-003-06 cada motivo muestra su variante de error', () => {
    expect(render('network').text()).toContain('Sin conexión');
    expect(render('rate_limited').text()).toContain('Demasiados intentos');
    expect(render('timeout').text()).toContain('Tarda más de lo normal');
    expect(render('service_unavailable').text()).toContain('Servicio no disponible');
    expect(render('disabled').text()).toContain('Servicio no disponible');
    expect(render('unknown').text()).toContain('Error inesperado');
  });

  it('US-003-06 el parámetro auto=1 muestra el aviso de comprobación automática', () => {
    expect(render('network', { auto: '1' }).text()).toContain('Comprobando la conexión');
    expect(render('network').text()).not.toContain('Comprobando la conexión');
  });

  it('US-003-06 un estado desconocido cae en error inesperado', () => {
    expect(render('inventado').text()).toContain('Error inesperado');
  });

  it('US-003-06 usa ChangeDetectionStrategy.OnPush', () => {
    expect((SessionStatusPreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
