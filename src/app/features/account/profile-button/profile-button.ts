import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';

/** Botón de perfil de la cabecera de la lista: abre la pantalla Cuenta. */
@Component({
  selector: 'app-profile-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink],
  template: `
    <a class="link" routerLink="/cuenta" aria-label="Cuenta">
      <span class="circle"><app-icon name="person" [filled]="true" /></span>
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .link {
      display: grid;
      place-items: center;
      width: var(--tap-target);
      height: var(--tap-target);
      border-radius: var(--radius-full);
      text-decoration: none;
      transition: transform 150ms;

      &:active {
        transform: scale(0.95);
      }
    }
    .circle {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      color: var(--color-on-primary);
      box-shadow: var(--shadow-cta-sm);

      app-icon {
        width: 20px;
        height: 20px;
      }
    }
  `,
})
export class ProfileButton {}
