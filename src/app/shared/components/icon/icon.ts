import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export const ICON_NAMES = [
  'wifi-off',
  'hourglass',
  'server',
  'clock',
  'alert',
  'refresh',
  'fingerprint',
  'lock',
  'shield',
  'plus',
  'check',
  'chevron-down',
  'chevron-right',
  'trash',
  'calendar',
] as const;
export type IconName = (typeof ICON_NAMES)[number];

/** Iconos propios de trazo (viewBox 24×24). Sin fuentes de iconos ni recursos externos. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (known()) {
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        [attr.aria-hidden]="label() ? null : 'true'"
        [attr.role]="label() ? 'img' : null"
        [attr.aria-label]="label() || null"
        focusable="false"
      >
        @switch (name()) {
          @case ('wifi-off') {
            <path d="M3 9a14 14 0 0 1 18 0" />
            <path d="M6 12.5a9 9 0 0 1 12 0" />
            <path d="M9.5 16a4 4 0 0 1 5 0" />
            <path d="M12 19.5h.01" />
            <path d="M4 4l16 16" />
          }
          @case ('hourglass') {
            <path d="M7 3h10" />
            <path d="M7 21h10" />
            <path d="M8 3c0 5 4 5 4 9s-4 4-4 9" />
            <path d="M16 3c0 5-4 5-4 9s4 4 4 9" />
          }
          @case ('server') {
            <rect x="3" y="4" width="18" height="7" rx="2" />
            <rect x="3" y="13" width="18" height="7" rx="2" />
            <path d="M7 7.5h.01" />
            <path d="M7 16.5h.01" />
          }
          @case ('clock') {
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          }
          @case ('alert') {
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16.5h.01" />
          }
          @case ('refresh') {
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 5v6h-6" />
          }
          @case ('fingerprint') {
            <path d="M12 3a8 8 0 0 0-8 8v1" />
            <path d="M20 12v-1a8 8 0 0 0-5-7.4" />
            <path d="M8 21c.6-1.7 1-3.4 1-5.5V11a3 3 0 0 1 6 0v4.5c0 2 .5 3.6 1.5 5" />
            <path d="M12 11v5c0 1.8-.3 3.3-1 5" />
            <path d="M5 15.5c-.4 1.5-.9 2.8-1.5 4" />
            <path d="M19 12.5v3c0 1.8.3 3.2 1 4.5" />
          }
          @case ('lock') {
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            <path d="M12 15.5V17" />
          }
          @case ('plus') {
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          }
          @case ('check') {
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          }
          @case ('chevron-down') {
            <path d="M6 9l6 6 6-6" />
          }
          @case ('chevron-right') {
            <path d="M9 6l6 6-6 6" />
          }
          @case ('trash') {
            <path d="M4 7h16" />
            <path d="M9 7V4h6v3" />
            <path d="M6 7l1 13h10l1-13" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          }
          @case ('calendar') {
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18" />
            <path d="M8 3v4" />
            <path d="M16 3v4" />
          }
          @case ('shield') {
            <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" />
            <path d="M9 12l2 2 4-4" />
          }
        }
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1.5em;
      height: 1.5em;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  /** Texto accesible. Sin él, el icono es decorativo y se oculta a los lectores de pantalla. */
  readonly label = input<string>('');

  protected readonly known = computed(() =>
    (ICON_NAMES as readonly string[]).includes(this.name())
  );
}
