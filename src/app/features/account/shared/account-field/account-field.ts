import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { RuleView } from '../../../../core/models/account';
import { Icon, IconName } from '../../../../shared/components/icon/icon';
import { RuleList } from '../rule-list/rule-list';

let nextId = 0;

/** Campo de formulario de cuenta: tarjeta de campo (Crear cuenta) o bloque con icono interior (Iniciar sesión). */
@Component({
  selector: 'app-account-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RuleList],
  templateUrl: './account-field.html',
  styleUrl: './account-field.scss',
})
export class AccountField {
  readonly value = model('');
  /** La entrada perdió el foco: la pantalla decide entonces si muestra los errores. */
  readonly blurred = output<void>();

  readonly label = input.required<string>();
  readonly icon = input.required<IconName>();
  readonly variant = input<'card' | 'block'>('card');
  readonly type = input<'text' | 'password'>('text');
  /** Indicación a la derecha de la etiqueta (p. ej. «0/24», «Mín. 8», «Coinciden»). */
  readonly hint = input('');
  readonly hintTone = input<'neutral' | 'idle' | 'ok' | 'error'>('neutral');
  /** Texto lateral de la variante bloque (p. ej. «Identificador único»). */
  readonly side = input('');
  readonly placeholder = input('');
  readonly autocomplete = input('off');
  readonly autocapitalize = input('none');
  readonly spellcheck = input(false);
  readonly maxlength = input<number | null>(null);
  readonly trailingIcon = input<IconName | null>(null);
  readonly rules = input<readonly RuleView[]>([]);
  readonly error = input<string | null>(null);
  readonly toggleLabel = input('Mostrar u ocultar contraseña');

  private readonly uid = `account-field-${nextId++}`;
  protected readonly inputId = `${this.uid}-input`;
  protected readonly errorId = `${this.uid}-error`;

  protected readonly revealed = signal(false);
  protected readonly isPassword = computed(() => this.type() === 'password');
  protected readonly inputType = computed(() =>
    this.isPassword() && !this.revealed() ? 'password' : 'text'
  );

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected toggle(): void {
    this.revealed.update((shown) => !shown);
  }
}
