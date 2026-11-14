import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Task } from '../../../../core/models/task';
import { CLOCK } from '../../../../core/services/clock';
import { Icon } from '../../../../shared/components/icon/icon';
import { PostponeConstructorService, PostponeTarget } from '../postpone.constructor.service';

/** Hoja con las opciones de posponer una tarea. Presentacional: emite el destino elegido. */
@Component({
  selector: 'app-postpone-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './postpone-sheet.html',
  styleUrl: './postpone-sheet.scss',
})
export class PostponeSheet {
  protected readonly rules = inject(PostponeConstructorService);
  private readonly clock = inject(CLOCK);
  private readonly document = inject(DOCUMENT);

  readonly task = input.required<Task>();
  readonly choose = output<PostponeTarget>();
  readonly dismiss = output<void>();

  protected readonly choices = computed(() => this.rules.choices(this.task(), this.clock()));
  protected readonly min = computed(() => this.rules.customMin(this.task(), this.clock()));
  protected readonly invalidDate = signal(false);

  /** El botón atrás de Android cierra la hoja: se añade una entrada al historial que absorbe ese gesto. */
  private popped = false;
  private readonly view = this.document.defaultView;
  private readonly onPopState = () => {
    this.popped = true;
    this.dismiss.emit();
  };

  constructor() {
    this.view?.history.pushState({ postponeSheet: true }, '');
    this.view?.addEventListener('popstate', this.onPopState);
    inject(DestroyRef).onDestroy(() => {
      this.view?.removeEventListener('popstate', this.onPopState);
      if (!this.popped) this.view?.history.back();
    });
  }

  protected pickDate(event: Event): void {
    const day = (event.target as HTMLInputElement).value;
    const target = this.rules.customTarget(this.task(), day, this.clock());
    this.invalidDate.set(target === null);
    if (target !== null) this.choose.emit(target);
  }
}
