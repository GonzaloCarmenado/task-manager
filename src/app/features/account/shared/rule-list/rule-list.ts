import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RuleView } from '../../../../core/models/account';
import { Icon } from '../../../../shared/components/icon/icon';

/** Lista de reglas de un campo: gris sin tocar, verde si cumple, roja si no. */
@Component({
  selector: 'app-rule-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './rule-list.html',
  styleUrl: './rule-list.scss',
})
export class RuleList {
  readonly rules = input.required<readonly RuleView[]>();
}
