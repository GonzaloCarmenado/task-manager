import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { PostponePreview } from './postpone-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(state: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PostponePreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ state }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(PostponePreview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PostponePreview (solo desarrollo)', () => {
  it('US-007-01 muestra la hoja de posponer con una tarea de ejemplo', () => {
    const el = render('today');
    expect(el.querySelector('app-postpone-sheet')).not.toBeNull();
    expect(el.textContent).toContain('Posponer tarea');
  });

  it('US-007-01 cada estado cambia la tarea de ejemplo', () => {
    expect(render('overdue').textContent).toContain('Atrasada');
    expect(render('none').textContent).toContain('Sin fecha');
    expect(render('far').textContent).toContain('Lejana');
  });

  it('US-007-01 un estado desconocido cae en el de hoy', () => {
    expect(render('inventado').textContent).toContain('Hoy');
  });

  it('US-007-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((PostponePreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
