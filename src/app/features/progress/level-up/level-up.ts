import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { Illustration } from '../../../shared/components/illustration/illustration';
import { ProgressAccessService } from '../progress.access.service';
import { ProgressConstructorService } from '../progress.constructor.service';

/** Pantalla de subida de nivel (`/nivel/:level`). Se cierra con Continuar o tocando en cualquier parte. */
@Component({
  selector: 'app-level-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Illustration],
  template: `
    <main class="screen" (click)="leave()">
      <section class="card">
        <app-illustration class="sparkles" kind="sparkles" [size]="4" />
        <div class="badge"><app-icon name="trophy" /></div>
        <h1 class="title">{{ rules.levelUp.title }}</h1>
        <p class="level" aria-live="polite">{{ level }}</p>
        <p class="congrats">{{ rules.levelUp.congrats }}</p>
        <button type="button" class="continue" (click)="leave(); $event.stopPropagation()">
          {{ rules.levelUp.continue }}
        </button>
      </section>
    </main>
  `,
  styles: `
    @use 'mixins';
    @use 'type';

    :host {
      display: block;
      min-height: 100dvh;
      background: var(--color-bg);
    }
    // Modal de nivel 3 a pantalla completa: halo de color de fondo y tarjeta con sombra profunda
    .screen {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      padding: calc(var(--space-6) + env(safe-area-inset-top)) var(--space-margin)
        calc(var(--space-6) + env(safe-area-inset-bottom));
      background: radial-gradient(
        circle at 50% 35%,
        var(--color-primary-soft),
        var(--color-bg) 70%
      );
      color: var(--color-text);
      font-family: var(--font-family);
      text-align: center;
      cursor: pointer;
    }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      max-width: 24rem;
      padding: var(--space-8) var(--space-6) var(--space-6);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      box-shadow: var(--shadow-modal);
    }
    .sparkles {
      position: absolute;
      top: calc(var(--space-4) * -1);
      right: var(--space-4);
    }
    .badge {
      display: grid;
      place-items: center;
      width: 6rem;
      height: 6rem;
      border-radius: var(--radius-full);
      background: var(--color-primary-soft);
      color: var(--color-on-primary-soft);
      box-shadow: var(--shadow-xp);
      font-size: 3rem;
    }
    .title {
      margin: 0;
      @include type.headline-md;
    }
    .level {
      margin: 0;
      color: var(--color-primary-text);
      font-size: 5rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .congrats {
      margin: 0;
      color: var(--color-text-muted);
      @include type.body-lg;
      font-weight: 400;
    }
    .continue {
      @include mixins.pill-button;
      width: 100%;
      margin-top: var(--space-4);
    }
  `,
})
export class LevelUp {
  protected readonly rules = inject(ProgressConstructorService);
  private readonly access = inject(ProgressAccessService);
  private readonly router = inject(Router);

  protected readonly level = this.parseLevel(inject(ActivatedRoute).snapshot.paramMap.get('level'));

  constructor() {
    // Un nivel inválido (enlace manual) no enseña basura: vuelve a la lista.
    if (this.level === null) void this.router.navigate(['/']);
  }

  protected leave(): void {
    this.access.consumeLevelUp();
    void this.router.navigate(['/']);
  }

  private parseLevel(raw: string | null): number | null {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : null;
  }
}
