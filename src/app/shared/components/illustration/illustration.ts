import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IllustrationKind = 'hill' | 'cloud' | 'sparkles';

/**
 * Ilustración decorativa propia (SVG inline, viewBox 120×120) para los estados vacío, de error y de
 * celebración. Los colores salen de variables CSS, así que valen en claro y en oscuro. No lleva
 * texto ni recursos externos y se oculta a los lectores de pantalla.
 */
@Component({
  selector: 'app-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    role: 'presentation',
    '[style.--illustration-size]': 'size()',
  },
  template: `
    <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
      @switch (kind()) {
        @case ('hill') {
          <defs>
            <clipPath id="illustration-clip"><circle cx="60" cy="60" r="56" /></clipPath>
          </defs>
          <circle cx="60" cy="60" r="56" style="fill: var(--color-primary-soft)" />
          <g clip-path="url(#illustration-clip)">
            <path
              d="M0 96 Q38 56 76 82 T126 74 V124 H0 Z"
              style="fill: var(--color-tertiary-soft)"
            />
            <path
              d="M-6 108 Q34 80 70 98 T126 92 V124 H-6 Z"
              style="fill: var(--color-tertiary-container)"
            />
          </g>
          <path
            d="M84 24 l3.6 7.3 8 1.2 -5.8 5.6 1.4 8 -7.2 -3.8 -7.2 3.8 1.4 -8 -5.8 -5.6 8 -1.2 z"
            style="fill: var(--color-secondary-container)"
          />
          <circle cx="34" cy="38" r="3" style="fill: var(--color-primary-container)" />
          <circle cx="48" cy="26" r="2" style="fill: var(--color-primary-container)" />
        }
        @case ('cloud') {
          <circle cx="60" cy="60" r="56" style="fill: var(--color-primary-soft)" />
          <g style="fill: var(--color-surface)">
            <circle cx="46" cy="66" r="15" />
            <circle cx="62" cy="54" r="20" />
            <circle cx="80" cy="66" r="15" />
            <rect x="31" y="66" width="64" height="15" rx="7.5" />
          </g>
          <path
            d="M65 60 L56 78 H62 L58 94 L74 72 H66 L70 60 Z"
            style="fill: var(--color-secondary-container)"
          />
          <circle cx="30" cy="40" r="3" style="fill: var(--color-primary-container)" />
          <circle cx="92" cy="34" r="2.5" style="fill: var(--color-primary-container)" />
        }
        @case ('sparkles') {
          <path
            d="M60 22 Q60 60 98 60 Q60 60 60 98 Q60 60 22 60 Q60 60 60 22 Z"
            style="fill: var(--color-secondary-container)"
          />
          <path
            d="M94 16 Q94 30 108 30 Q94 30 94 44 Q94 30 80 30 Q94 30 94 16 Z"
            style="fill: var(--color-primary-container)"
          />
          <path
            d="M26 80 Q26 92 38 92 Q26 92 26 104 Q26 92 14 92 Q26 92 26 80 Z"
            style="fill: var(--color-tertiary-container)"
          />
          <circle cx="22" cy="34" r="3" style="fill: var(--color-primary-container)" />
          <circle cx="100" cy="86" r="3.5" style="fill: var(--color-secondary-container)" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      width: calc(var(--illustration-size, 7) * 1rem);
      height: calc(var(--illustration-size, 7) * 1rem);
      line-height: 0;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  `,
})
export class Illustration {
  readonly kind = input.required<IllustrationKind>();
  /** Lado en rem. */
  readonly size = input<number>(7);
}
