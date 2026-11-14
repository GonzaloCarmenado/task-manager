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
import { ProgressConstructorService } from '../progress.constructor.service';

const DURATION_MS = 1_000;

/** Celebración breve («+10 XP», tope, racha o «−N XP»). No bloquea: ni botones ni sonido ni vibración. */
@Component({
  selector: 'app-celebration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="celebration" role="status" aria-live="polite">
      @if (xp(); as text) {
        <span class="xp" [class.negative]="celebration().xpDelta < 0">
          <app-icon name="star" />{{ text }}
        </span>
      }
      @if (celebration().streakDays !== null) {
        <span class="streak"
          ><app-icon name="flame" />{{ rules.streakText(celebration().streakDays ?? 0) }}</span
        >
      }
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: auto 0 calc(6rem + env(safe-area-inset-bottom)) 0;
      z-index: 20;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .celebration {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-6);
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-family: var(--font-family);
      font-weight: 700;
      box-shadow: var(--shadow-button);
      animation: pop 1s ease both;
    }
    .xp,
    .streak {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
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
    @media (prefers-reduced-motion: reduce) {
      .celebration {
        animation: none;
      }
    }
  `,
})
export class Celebration {
  protected readonly rules = inject(ProgressConstructorService);

  readonly celebration = input.required<CelebrationData>();
  readonly finished = output<void>();

  protected readonly xp = computed(() => this.rules.xpText(this.celebration()));

  constructor() {
    const timer = setTimeout(() => this.finished.emit(), DURATION_MS + 100);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }
}
