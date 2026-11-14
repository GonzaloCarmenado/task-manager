import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Celebration as CelebrationData } from '../../../core/models/progress';
import { Icon } from '../../../shared/components/icon/icon';
import { Illustration } from '../../../shared/components/illustration/illustration';
import { ProgressConstructorService } from '../progress.constructor.service';

const DURATION_MS = 1_000;

/** Celebración breve («+10 XP», tope, racha o «−N XP»). No bloquea: ni botones ni sonido ni vibración. */
@Component({
  selector: 'app-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Illustration],
  template: `
    <div
      class="celebration"
      [class.streak]="celebration().streakDays !== null"
      role="status"
      aria-live="polite"
    >
      @if (sparkles()) {
        <app-illustration kind="sparkles" [size]="2.5" />
      }
      <div class="lines">
        @if (xp(); as text) {
          <span class="xp" [class.negative]="celebration().xpDelta < 0">
            <app-icon name="star" />{{ text }}
          </span>
        }
        @if (celebration().streakDays !== null) {
          <span class="streak-line"
            ><app-icon name="flame" />{{ rules.streakText(celebration().streakDays ?? 0) }}</span
          >
        }
      </div>
    </div>
  `,
  styles: `
    @use 'mixins';
    @use 'type';

    :host {
      position: fixed;
      inset: auto 0 calc(9rem + env(safe-area-inset-bottom)) 0;
      z-index: 20;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    // Píldora flotante con halo: índigo para XP, ámbar si hay racha
    .celebration {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-6) var(--space-2) var(--space-4);
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-on-primary);
      box-shadow: var(--shadow-xp);
      animation: pop 1s ease both;
    }
    .celebration.streak {
      background: var(--color-secondary-container);
      color: var(--color-on-secondary-container);
      box-shadow: var(--shadow-streak);
    }
    // Destellos con contraste sobre el fondo ámbar
    .celebration.streak app-illustration {
      --spark-1: var(--color-surface);
      --spark-2: var(--color-on-secondary-container);
      --spark-3: var(--color-on-secondary-container);
    }
    .lines {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
    }
    .xp,
    .streak-line {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }
    .xp {
      @include type.headline-sm;
      font-weight: 800;
    }
    .streak-line {
      @include type.label-lg;
    }
    .negative {
      opacity: 0.85;
    }
    @keyframes pop {
      0% {
        opacity: 0;
        transform: translateY(0.75rem) scale(0.9);
      }
      20%,
      80% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateY(-0.5rem) scale(1);
      }
    }
  `,
})
export class Celebration {
  protected readonly rules = inject(ProgressConstructorService);

  readonly celebration = input.required<CelebrationData>();
  readonly finished = output<void>();

  protected readonly xp = computed(() => this.rules.xpText(this.celebration()));
  /** Destellos solo cuando hay algo que celebrar (XP ganados o racha), no al quitar XP ni en el tope. */
  protected readonly sparkles = computed(() => {
    const c = this.celebration();
    return c.xpDelta > 0 || c.streakDays !== null;
  });

  constructor() {
    const timer = setTimeout(() => this.finished.emit(), DURATION_MS + 100);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
