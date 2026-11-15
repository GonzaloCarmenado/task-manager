import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CLOCK } from '../../../core/services/clock';
import { toLocalDay } from '../../../core/utils/local-date';
import { Icon } from '../../../shared/components/icon/icon';
import { ProgressAccessService } from '../progress.access.service';
import { ProgressConstructorService } from '../progress.constructor.service';

/** Franja de la lista: nivel, barra hasta el siguiente nivel y racha. Tocarla abre `/progreso`. */
@Component({
  selector: 'app-progress-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './progress-summary.html',
  styleUrl: './progress-summary.scss',
})
export class ProgressSummary {
  protected readonly access = inject(ProgressAccessService);
  protected readonly rules = inject(ProgressConstructorService);
  private readonly router = inject(Router);
  private readonly clock = inject(CLOCK);

  protected readonly percent = computed(() => {
    const p = this.access.progress();
    return p === null || p.xpForNextLevel === 0
      ? 0
      : Math.min(100, Math.round((p.xpIntoLevel / p.xpForNextLevel) * 100));
  });

  /** Racha viva pero sin tarea completada hoy: se anima a mantenerla. */
  protected readonly keepAlive = computed(() => {
    const p = this.access.progress();
    return p !== null && p.currentStreak > 0 && p.lastCompletedDay !== toLocalDay(this.clock());
  });

  protected open(): void {
    void this.router.navigate(['/progreso']);
  }

  protected retry(): void {
    void this.access.load();
  }
}
