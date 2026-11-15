import { TestBed } from '@angular/core/testing';
import { AccountToast } from './account-toast';
import { AccountToastService } from './account-toast.service';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup() {
  const fixture = TestBed.createComponent(AccountToast);
  const service = TestBed.inject(AccountToastService);
  fixture.detectChanges();
  return { fixture, service, el: fixture.nativeElement as HTMLElement };
}

describe('AccountToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('US-011-01 publica un aviso pequeño y desaparece a los 2,8 s', () => {
    const service = TestBed.inject(AccountToastService);
    expect(service.toast()).toBeNull();

    service.show('Sesión cerrada');
    expect(service.toast()).toEqual({ kind: 'small', text: 'Sesión cerrada' });

    vi.advanceTimersByTime(2799);
    expect(service.toast()).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect(service.toast()).toBeNull();
  });

  it('US-011-02 el aviso de éxito de Crear cuenta dura 3,2 s', () => {
    const service = TestBed.inject(AccountToastService);
    service.showSuccess('¡Cuenta creada con éxito!', 'Tus tareas y tu progreso siguen aquí.');
    expect(service.toast()).toEqual({
      kind: 'success',
      title: '¡Cuenta creada con éxito!',
      text: 'Tus tareas y tu progreso siguen aquí.',
    });

    vi.advanceTimersByTime(3199);
    expect(service.toast()).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect(service.toast()).toBeNull();
  });

  it('US-011-01 un aviso nuevo sustituye al anterior y reinicia el plazo', () => {
    const service = TestBed.inject(AccountToastService);
    service.show('Primero');
    vi.advanceTimersByTime(2000);
    service.show('Segundo');
    vi.advanceTimersByTime(2000);
    expect(service.toast()).toEqual({ kind: 'small', text: 'Segundo' });
    vi.advanceTimersByTime(900);
    expect(service.toast()).toBeNull();
  });

  it('US-011-01 dismiss lo quita enseguida', () => {
    const service = TestBed.inject(AccountToastService);
    service.show('Hola');
    service.dismiss();
    expect(service.toast()).toBeNull();
  });
});

describe('AccountToast', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccountToast] }).compileComponents();
  });

  it('US-011-01 sin aviso no pinta nada', () => {
    expect(setup().el.querySelector('.toast')).toBeNull();
  });

  it('US-011-01 el aviso pequeño se anuncia con role=status y lleva icono', () => {
    const { fixture, service, el } = setup();
    service.show('Contraseña cambiada');
    fixture.detectChanges();
    const toast = el.querySelector('.toast') as HTMLElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('data-kind')).toBe('small');
    expect(toast.textContent).toContain('Contraseña cambiada');
    expect(toast.querySelector('app-icon')).not.toBeNull();
  });

  it('US-011-02 el aviso de éxito muestra título y texto', () => {
    const { fixture, service, el } = setup();
    service.showSuccess('¡Cuenta creada con éxito!', 'Tus tareas y tu progreso siguen aquí.');
    fixture.detectChanges();
    const toast = el.querySelector('.toast') as HTMLElement;
    expect(toast.getAttribute('data-kind')).toBe('success');
    expect(toast.querySelector('.title')?.textContent?.trim()).toBe('¡Cuenta creada con éxito!');
    expect(toast.querySelector('.body')?.textContent?.trim()).toBe(
      'Tus tareas y tu progreso siguen aquí.'
    );
  });

  it('US-011-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountToast as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
