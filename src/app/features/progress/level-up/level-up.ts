import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { ProgressAccessService } from '../progress.access.service';
import { ProgressConstructorService } from '../progress.constructor.service';

/** Pantalla de subida de nivel (`/nivel/:level`). Se cierra con Continuar o tocando en cualquier parte. */
@Component({
  selector: 'app-level-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <main class="screen" (click)="leave()">
      <div class="badge"><app-icon name="trophy" /></div>
      <h1 class="title">{{ rules.levelUp.title }}</h1>
      <p class="level" aria-live="polite">{{ level }}</p>
      <p class="congrats">{{ rules.levelUp.congrats }}</p>
      <button type="button" class="continue" (click)="leave(); $event.stopPropagation()">
        {{ rules.levelUp.continue }}
      </button>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--color-bg);
    }
    .screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      min-height: 100dvh;
      padding: calc(var(--space-6) + env(safe-area-inset-top)) var(--space-4)
        calc(var(--space-6) + env(safe-area-inset-bottom));
      color: var(--color-text);
      font-family: var(--font-family);
      text-align: center;
      cursor: pointer;
    }
    .badge {
      display: grid;
      place-items: center;
      width: 6rem;
      height: 6rem;
      border-radius: var(--radius-full);
      background: var(--color-primary-soft);
      color: var(--color-on-primary-soft);
      font-size: 3rem;
    }
    .title {
      margin: 0;
      font-size: var(--font-size-headline);
    }
    .level {
      margin: 0;
      color: var(--color-primary);
      font-size: 5rem;
      font-weight: 800;
      line-height: 1;
    }
    .congrats {
      margin: 0;
      color: var(--color-text-muted);
    }
    .continue {
      width: 100%;
      max-width: 20rem;
      min-height: 3.5rem;
      margin-top: var(--space-4);
      border: 0;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font: inherit;
      font-size: var(--font-size-body-lg);
      font-weight: 700;
      cursor: pointer;
    }
    .continue:focus-visible {
      outline: 3px solid var(--color-primary-soft);
      outline-offset: 3px;
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
