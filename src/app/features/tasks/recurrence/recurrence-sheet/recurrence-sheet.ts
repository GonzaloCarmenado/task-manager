import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { Recurrence } from '../../../../core/models/recurrence';
import { CLOCK } from '../../../../core/services/clock';
import { toLocalDay } from '../../../../core/utils/local-date';
import { Icon } from '../../../../shared/components/icon/icon';
import { OverlayBack } from '../../../account/shared/overlay-back/overlay-back';
import {
  FrequencyOption,
  RecurrenceConstructorService,
  RecurrenceDraft,
} from '../recurrence.constructor.service';

/** Hoja «Configurar repetición». Presentacional: emite la regla elegida (`null` = no se repite). */
@Component({
  selector: 'app-recurrence-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './recurrence-sheet.html',
  styleUrl: './recurrence-sheet.scss',
})
export class RecurrenceSheet {
  protected readonly copy = inject(RecurrenceConstructorService);
  private readonly clock = inject(CLOCK);

  /** Regla actual de la tarea (`null` = no se repite). */
  readonly rule = input.required<Recurrence | null>();
  /** Fecha del formulario: inicio de la regla y primera ocurrencia posible. */
  readonly firstDate = input.required<string>();
  readonly apply = output<Recurrence | null>();
  readonly dismiss = output<void>();

  protected readonly draft = linkedSignal<RecurrenceDraft>(() =>
    this.copy.draftFrom(this.rule(), this.firstDate())
  );
  protected readonly problem = computed(() => this.copy.problem(this.draft(), this.firstDate()));
  protected readonly summary = computed(() =>
    this.copy.summary(this.draft(), this.firstDate(), toLocalDay(this.clock()))
  );

  constructor() {
    // El botón atrás de Android cierra la hoja, no la pantalla de debajo.
    inject(OverlayBack).register(() => this.dismiss.emit());
  }

  protected choose(option: FrequencyOption): void {
    this.draft.update((d) => ({ ...d, option }));
  }

  protected toggleDay(day: number): void {
    this.draft.update((d) => ({
      ...d,
      weekdays: d.weekdays.includes(day)
        ? d.weekdays.filter((x) => x !== day)
        : [...d.weekdays, day].sort((a, b) => a - b),
    }));
  }

  protected done(): void {
    if (this.problem() !== null) return;
    this.apply.emit(this.copy.toRule(this.draft(), this.firstDate()));
  }
}
