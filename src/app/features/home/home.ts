import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>Hola</h1>`,
  styles: `
    :host {
      display: block;
      padding: var(--space-4);
    }
  `,
})
export class Home {}
