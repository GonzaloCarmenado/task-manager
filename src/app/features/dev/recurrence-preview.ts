import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Recurrence } from '../../core/models/recurrence';
import { toLocalDay } from '../../core/utils/local-date';
import { RecurrenceSheet } from '../tasks/recurrence/recurrence-sheet/recurrence-sheet';

const STATES = ['none', 'daily', 'weekly', 'sin-dias'] as const;

/**
 * SOLO DESARROLLO: muestra la hoja «Configurar repetición» para revisarla en el navegador
 * (`/__dev/recurrence/none | daily | weekly | sin-dias`). La ruta solo existe con `isDevMode()`.
 */
@Component({
  selector: 'app-recurrence-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RecurrenceSheet],
  template: `<app-recurrence-sheet [rule]="rule" [firstDate]="firstDate" />`,
})
export class RecurrencePreview {
  private readonly requested = inject(ActivatedRoute).snapshot.paramMap.get('state') ?? '';
  private readonly state = STATES.find((s) => s === this.requested) ?? 'none';

  protected readonly firstDate = toLocalDay(new Date());
  protected readonly rule: Recurrence | null = this.sample();

  private sample(): Recurrence | null {
    const base = {
      interval: 1,
      monthDay: null,
      startDate: this.firstDate,
      until: null,
    };
    switch (this.state) {
      case 'daily':
        return { ...base, kind: 'daily', weekdays: [] };
      case 'weekly':
        return { ...base, kind: 'weekly', weekdays: [1, 4] };
      case 'sin-dias':
        return { ...base, kind: 'weekly', weekdays: [] };
      default:
        return null;
    }
  }
}
