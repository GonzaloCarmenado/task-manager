import { TestBed } from '@angular/core/testing';
import { AccountField } from './account-field';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(AccountField);
  fixture.componentRef.setInput('label', 'Nombre de usuario');
  fixture.componentRef.setInput('icon', 'at');
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, input: el.querySelector('input') as HTMLInputElement };
}

describe('AccountField', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccountField] }).compileComponents();
  });

  it('US-011-02 la etiqueta está asociada a la entrada y lleva su icono', () => {
    const { el, input } = render();
    const label = el.querySelector('label') as HTMLLabelElement;
    expect(label.textContent).toContain('Nombre de usuario');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).not.toBe('');
    expect(label.querySelector('app-icon')).not.toBeNull();
  });

  it('US-011-02 muestra la indicación a la derecha de la etiqueta', () => {
    const { el } = render({ hint: '0/24' });
    expect(el.querySelector('.hint')?.textContent?.trim()).toBe('0/24');
  });

  it('US-011-02 la indicación puede ser de acierto o de error', () => {
    expect(
      render({ hint: 'Coinciden', hintTone: 'ok' }).el.querySelector('.hint')?.className
    ).toContain('ok');
    expect(
      render({ hint: 'No coinciden', hintTone: 'error' }).el.querySelector('.hint')?.className
    ).toContain('error');
  });

  it('US-011-02 el valor es bidireccional (model)', () => {
    const { fixture, input } = render();
    input.value = 'carlos_ritmo';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.value()).toBe('carlos_ritmo');

    fixture.componentRef.setInput('value', 'otro');
    fixture.detectChanges();
    expect(input.value).toBe('otro');
  });

  it('US-011-02 configura autocompletado, mayúsculas y corrector de la entrada', () => {
    const { input } = render({
      autocomplete: 'username',
      autocapitalize: 'none',
      spellcheck: false,
      placeholder: 'ej. carlos_ritmo',
      maxlength: 24,
    });
    expect(input.getAttribute('autocomplete')).toBe('username');
    expect(input.getAttribute('autocapitalize')).toBe('none');
    expect(input.getAttribute('autocorrect')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('placeholder')).toBe('ej. carlos_ritmo');
    expect(input.getAttribute('maxlength')).toBe('24');
  });

  it('US-011-02 una contraseña se oculta por defecto y el botón la muestra y la oculta', () => {
    const { fixture, el, input } = render({ type: 'password', autocomplete: 'new-password' });
    expect(input.type).toBe('password');
    const toggle = el.querySelector('button.toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar u ocultar contraseña');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('type')).toBe('button');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
  });

  it('US-011-02 un campo de texto no tiene botón de mostrar', () => {
    expect(render().el.querySelector('button.toggle')).toBeNull();
  });

  it('US-011-02 pinta las reglas en vivo', () => {
    const { el } = render({
      rules: [{ key: 'length', text: 'De 3 a 24 caracteres', state: 'ok' }],
    });
    expect(el.querySelector('app-rule-list')).not.toBeNull();
    expect(el.textContent).toContain('De 3 a 24 caracteres');
  });

  it('US-011-02 el error se muestra con su icono y marca la entrada como inválida', () => {
    const { el, input } = render({ error: 'El formato de usuario no es válido.' });
    const error = el.querySelector('.error') as HTMLElement;
    expect(error.textContent).toContain('El formato de usuario no es válido.');
    expect(error.querySelector('app-icon')).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('US-011-02 sin error no hay mensaje ni aria-invalid', () => {
    const { el, input } = render();
    expect(el.querySelector('.error')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('US-011-02 muestra el icono de la derecha cuando se indica', () => {
    expect(render({ trailingIcon: 'id-card' }).el.querySelector('.trailing')).not.toBeNull();
    expect(render().el.querySelector('.trailing')).toBeNull();
  });

  it('US-011-03 tiene dos variantes: tarjeta de campo y bloque con icono interior', () => {
    expect(render().el.querySelector('.field')?.getAttribute('data-variant')).toBe('card');
    const block = render({ variant: 'block', side: 'Identificador único' });
    expect(block.el.querySelector('.field')?.getAttribute('data-variant')).toBe('block');
    expect(block.el.querySelector('.side')?.textContent?.trim()).toBe('Identificador único');
    expect(block.el.querySelector('.leading')).not.toBeNull();
  });

  it('US-011-02 cada instancia tiene identificadores distintos', () => {
    const a = render().input.id;
    const b = render().input.id;
    expect(a).not.toBe(b);
  });

  it('US-011-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((AccountField as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
