import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthAccessService } from './core/services/auth.access.service';
import { SessionStatus } from './shared/components/session-status/session-status';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SessionStatus],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthAccessService);

  /** SOLO DESARROLLO: la vista previa de estados no debe quedar tapada por la pantalla de sesión. */
  private readonly devPreview = isDevMode() && inject(Location).path().startsWith('/__dev/');

  /** La app no muestra contenido sin identidad: solo con `ready` (o en la vista previa de desarrollo). */
  protected readonly showApp = computed(() => this.devPreview || this.auth.status() === 'ready');
}
