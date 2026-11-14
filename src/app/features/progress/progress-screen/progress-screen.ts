import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { ProgressAccessService } from '../progress.access.service';
import { ProgressConstructorService } from '../progress.constructor.service';

/** Pantalla de progreso (`/progreso`): nivel, XP, rachas y XP de hoy. */
@Component({
  selector: 'app-progress-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  templateUrl: './progress-screen.html',
  styleUrl: './progress-screen.scss',
})
export class ProgressScreen {
  protected readonly access = inject(ProgressAccessService);
  protected readonly rules = inject(ProgressConstructorService);
  private readonly router = inject(Router);

  protected readonly percent = computed(() => {
    const p = this.access.progress();
    return p === null || p.xpForNextLevel === 0
      ? 0
      : Math.min(100, Math.round((p.xpIntoLevel / p.xpForNextLevel) * 100));
  });

  protected readonly isNew = computed(() => this.access.progress()?.totalXp === 0);

  constructor() {
    void this.access.load();
  }

  protected retry(): void {
    void this.access.load();
  }

  protected leave(): void {
    void this.router.navigate(['/']);
  }
}
