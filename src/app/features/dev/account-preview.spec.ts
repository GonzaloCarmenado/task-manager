import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AccountToastService } from '../account/shared/account-toast/account-toast.service';
import { AccountPreview } from './account-preview';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(screen: string, state: string) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AccountPreview],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ screen, state }) } },
      },
    ],
  });
  const fixture = TestBed.createComponent(AccountPreview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AccountPreview (solo desarrollo)', () => {
  it('US-011-01 la base muestra la cabecera, una tarjeta de campo y un bloque de campo', () => {
    const el = render('base', 'fields');
    expect(el.querySelector('app-account-header')).not.toBeNull();
    expect(el.querySelectorAll('app-account-field[data-preview="card"]').length).toBeGreaterThan(0);
    expect(el.querySelector('app-account-field[data-preview="block"]')).not.toBeNull();
  });

  it('US-011-02 el estado «errors» enseña reglas incumplidas, error de campo y banner sin conexión', () => {
    const el = render('base', 'errors');
    expect(el.querySelector('app-offline-banner')).not.toBeNull();
    expect(el.querySelector('app-account-field .error')).not.toBeNull();
    expect(el.querySelector('li[data-state="error"]')).not.toBeNull();
  });

  it('US-011-02 el estado «valid» enseña reglas cumplidas', () => {
    const el = render('base', 'valid');
    expect(el.querySelector('li[data-state="ok"]')).not.toBeNull();
    expect(el.querySelector('li[data-state="error"]')).toBeNull();
  });

  it('US-011-02 el estado «toast» publica los avisos de ejemplo', () => {
    render('base', 'toast');
    expect(TestBed.inject(AccountToastService).toast()).not.toBeNull();
  });

  it('US-011-01 un estado o pantalla desconocidos caen en la base con campos', () => {
    expect(render('inventada', 'raro').querySelector('app-account-header')).not.toBeNull();
  });

  it('US-011-03 la pantalla «cuenta» sin cuenta muestra los datos locales', () => {
    const el = render('cuenta', 'anonymous');
    expect(el.querySelector('app-account-screen')).not.toBeNull();
    expect(el.textContent).toContain('ALMACENAMIENTO LOCAL ACTIVO');
  });

  it('US-011-04 la pantalla «cuenta» con cuenta muestra el usuario de ejemplo', () => {
    const el = render('cuenta', 'account');
    expect(el.querySelector('.username')?.textContent?.trim()).toBe('@carlos_ritmo');
    expect(el.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('US-011-04 el estado «dialog» abre la confirmación de cerrar sesión', () => {
    const el = render('cuenta', 'dialog');
    expect(el.querySelector('[role="alertdialog"]')).not.toBeNull();
  });

  it('US-011-01 la pantalla «crear» muestra Crear cuenta en cualquiera de sus estados', () => {
    for (const state of ['normal', 'taken', 'offline', 'slow']) {
      expect(render('crear', state).querySelector('app-create-account'), state).not.toBeNull();
    }
  });

  it('US-011-02 la pantalla «entrar» muestra Iniciar sesión en todos sus estados', () => {
    for (const state of ['form', 'error', 'limit', 'offline', 'sheet', 'completed']) {
      expect(render('entrar', state).querySelector('app-sign-in'), state).not.toBeNull();
    }
  });

  it('US-011-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountPreview as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
