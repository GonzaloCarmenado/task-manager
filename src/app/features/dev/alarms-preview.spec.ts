import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AlarmsPreview } from './alarms-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(state: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AlarmsPreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ state }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(AlarmsPreview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AlarmsPreview (solo desarrollo)', () => {
  it('US-006-02 «prompt» muestra el aviso previo de permiso', () => {
    expect(render('prompt').querySelector('app-alarm-permission-prompt')).not.toBeNull();
  });

  it('US-006-02 «banner» muestra el aviso de alarmas desactivadas', () => {
    expect(render('banner').querySelector('app-alarms-banner')).not.toBeNull();
  });

  it('US-006-02 «exact» muestra la hoja de alarmas exactas', () => {
    expect(render('exact').querySelector('app-exact-alarm-sheet')).not.toBeNull();
  });

  it('US-006-02 un estado desconocido cae en el aviso previo', () => {
    expect(render('inventado').querySelector('app-alarm-permission-prompt')).not.toBeNull();
  });

  it('US-006-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AlarmsPreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
