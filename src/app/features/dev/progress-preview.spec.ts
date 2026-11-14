import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { ProgressPreview } from './progress-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(state: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ProgressPreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ state }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(ProgressPreview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProgressPreview (solo desarrollo)', () => {
  it('US-008-04 «summary» muestra el resumen con datos de ejemplo', () => {
    const el = render('summary');
    expect(el.querySelector('app-progress-summary')).not.toBeNull();
    expect(el.textContent).toContain('Nivel 4');
  });

  it('US-008-04 «alive» anima a mantener la racha', () => {
    expect(render('alive').textContent).toContain('para mantenerla');
  });

  it('US-008-04 «new» muestra a un usuario nuevo', () => {
    expect(render('new').textContent).toContain('Nivel 1');
  });

  it('US-008-04 «screen» muestra la pantalla de progreso', () => {
    expect(render('screen').querySelector('app-progress-screen')).not.toBeNull();
  });

  it('US-008-01 «celebration», «cap» y «undo» muestran cada celebración', () => {
    expect(render('celebration').textContent).toContain('+10 XP');
    expect(render('cap').textContent).toContain('tope');
    expect(render('undo').textContent).toContain('−10 XP');
  });

  it('US-008-04 un estado desconocido cae en el resumen', () => {
    expect(render('inventado').querySelector('app-progress-summary')).not.toBeNull();
  });

  it('US-008-04 usa ChangeDetectionStrategy.OnPush', () => {
    expect((ProgressPreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
