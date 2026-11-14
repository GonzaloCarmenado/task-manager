import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlarmPermissionPrompt } from '../tasks/alarms/alarm-permission-prompt/alarm-permission-prompt';
import { AlarmsBanner } from '../tasks/alarms/alarms-banner/alarms-banner';
import { ExactAlarmSheet } from '../tasks/alarms/exact-alarm-sheet/exact-alarm-sheet';

/**
 * SOLO DESARROLLO: muestra el aviso previo de permiso, el aviso de alarmas desactivadas y la hoja
 * de alarmas exactas para revisarlos en el navegador (`/__dev/alarms/prompt | banner | exact`).
 * La ruta solo se registra con `isDevMode()`; no existe en producción.
 */
@Component({
  selector: 'app-alarms-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlarmPermissionPrompt, AlarmsBanner, ExactAlarmSheet],
  template: `
    @switch (view) {
      @case ('banner') {
        <div class="frame"><app-alarms-banner /></div>
      }
      @case ('exact') {
        <app-exact-alarm-sheet />
      }
      @default {
        <app-alarm-permission-prompt />
      }
    }
  `,
  styles: `
    .frame {
      padding: var(--space-4);
      background: var(--color-bg);
      min-height: 100dvh;
    }
  `,
})
export class AlarmsPreview {
  private readonly state = inject(ActivatedRoute).snapshot.paramMap.get('state') ?? '';

  protected readonly view =
    this.state === 'banner' || this.state === 'exact' ? this.state : 'prompt';
}
