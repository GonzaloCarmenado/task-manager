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
  'bell',
  'bell-off',
  'snooze',
  'flame',
  'star',
  'trophy',
  'arrow-left',
  'arrow-right',
  'person',
  'at',
  'id-card',
  'key',
  'eye',
  'eye-off',
  'check-circle',
  'circle',
  'alert-circle',
  'user-plus',
  'x',
  'shield-user',
  'lock-reset',
  'phone-lock',
  'cloud-sync',
  'cloud-up',
  'cloud-check',
  'log-in',
  'log-out',
  'badge-check',
  'verified-user',
  'swap',
  'list-plus',
  'info',
  'trash-sweep',
  'bolt',
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
        [class.filled]="filled()"
        [attr.fill]="filled() ? 'currentColor' : 'none'"
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
            <path class="cut" d="M12 15.5V17" />
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
          @case ('bell') {
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
          }
          @case ('bell-off') {
            <path d="M8.7 3.6A6 6 0 0 1 18 8c0 3 .5 5.2 1.2 6.8" />
            <path d="M17 17H3s3-2 3-9c0-.8.1-1.5.4-2.2" />
            <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
            <path d="M3 3l18 18" />
          }
          @case ('snooze') {
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 1.5" />
            <path d="M4 4.5 7 2" />
            <path d="M20 4.5 17 2" />
          }
          @case ('flame') {
            <path
              d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.3.8 2 1.6 2.4C10.3 8.5 10.8 5.5 12 3z"
            />
          }
          @case ('star') {
            <path
              d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z"
            />
          }
          @case ('trophy') {
            <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" />
            <path d="M8 6H5v2a3 3 0 0 0 3 3" />
            <path d="M16 6h3v2a3 3 0 0 1-3 3" />
            <path d="M12 14v4" />
            <path d="M8.5 20h7" />
          }
          @case ('shield') {
            <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" />
            <path class="cut" d="M9 12l2 2 4-4" />
          }
          @case ('arrow-left') {
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
          }
          @case ('arrow-right') {
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          }
          @case ('person') {
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          }
          @case ('at') {
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
          }
          @case ('id-card') {
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="9" cy="11" r="2" />
            <path d="M6 16a3.2 3.2 0 0 1 6 0" />
            <path d="M14.5 10h3.5" />
            <path d="M14.5 14h3.5" />
          }
          @case ('key') {
            <circle cx="8" cy="15" r="4" />
            <path d="M11 12l9-9" />
            <path d="M16 7l3 3" />
          }
          @case ('eye') {
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          }
          @case ('eye-off') {
            <path d="M3 3l18 18" />
            <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9" />
            <path d="M6.6 7.6A16.5 16.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.9" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          }
          @case ('check-circle') {
            <circle cx="12" cy="12" r="9" />
            <path class="cut" d="M8 12.5l3 3 5-6" />
          }
          @case ('circle') {
            <circle cx="12" cy="12" r="9" />
          }
          @case ('alert-circle') {
            <circle cx="12" cy="12" r="9" />
            <path class="cut" d="M12 8v5" />
            <path class="cut" d="M12 16.5h.01" />
          }
          @case ('user-plus') {
            <circle cx="10" cy="8" r="4" />
            <path d="M2 21a8 8 0 0 1 16 0" />
            <path d="M19 8v6" />
            <path d="M16 11h6" />
          }
          @case ('x') {
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          }
          @case ('shield-user') {
            <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" />
            <circle class="cut" cx="12" cy="10" r="2" />
            <path class="cut" d="M8.5 16a3.8 3.8 0 0 1 7 0" />
          }
          @case ('lock-reset') {
            <rect x="5" y="12" width="14" height="9" rx="2" />
            <path d="M12 15.5V17.5" />
            <path d="M8 12V9a4 4 0 0 1 7.2-2.4" />
            <path d="M16 3.5v3h-3" />
          }
          @case ('phone-lock') {
            <rect x="6" y="2" width="12" height="20" rx="3" />
            <path d="M10 19h4" />
            <rect x="9.5" y="10" width="5" height="4" rx="1" />
            <path d="M10.5 10V9a1.5 1.5 0 0 1 3 0v1" />
          }
          @case ('cloud-sync') {
            <path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8H7" />
            <path class="cut" d="M9.5 14a3 3 0 0 1 5-1" />
            <path class="cut" d="M14.5 11v2h-2" />
          }
          @case ('cloud-up') {
            <path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8" />
            <path class="cut" d="M12 17v-6" />
            <path class="cut" d="M9.5 13.5L12 11l2.5 2.5" />
          }
          @case ('cloud-check') {
            <path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 10a4 4 0 0 1-1 8H7" />
            <path class="cut" d="M9 14l2.5 2.5L15.5 12" />
          }
          @case ('log-in') {
            <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
          }
          @case ('log-out') {
            <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
            <path d="M14 17l5-5-5-5" />
            <path d="M19 12H9" />
          }
          @case ('badge-check') {
            <path
              d="M12 3l2.4 1.6 2.9-.1 1 2.7 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-1 2.7-2.9-.1L12 21l-2.4-1.6-2.9.1-1-2.7-2.3-1.8.9-2.8-.9-2.8 2.3-1.8 1-2.7 2.9.1L12 3z"
            />
            <path class="cut" d="M8.5 12l2.5 2.5 4.5-5" />
          }
          @case ('verified-user') {
            <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6l8-3z" />
            <path class="cut" d="M8.5 12l2.5 2.5 4.5-5" />
          }
          @case ('swap') {
            <path d="M7 4L3 8l4 4" />
            <path d="M3 8h14" />
            <path d="M17 20l4-4-4-4" />
            <path d="M21 16H7" />
          }
          @case ('list-plus') {
            <path d="M4 6h12" />
            <path d="M4 12h8" />
            <path d="M4 18h8" />
            <path d="M18 14v6" />
            <path d="M15 17h6" />
          }
          @case ('info') {
            <circle cx="12" cy="12" r="9" />
            <path class="cut" d="M12 11v5" />
            <path class="cut" d="M12 8h.01" />
          }
          @case ('trash-sweep') {
            <path d="M4 7h16" />
            <path d="M9 7V4h6v3" />
            <path d="M6 7l1 13h10l1-13" />
            <path d="M10 11l4 5" />
            <path d="M14 11l-4 5" />
          }
          @case ('bolt') {
            <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
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
    /* En la variante llena, los detalles interiores se recortan con el color del fondo. */
    svg.filled .cut {
      stroke: var(--icon-cut, var(--color-surface));
      fill: none;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  /** Texto accesible. Sin él, el icono es decorativo y se oculta a los lectores de pantalla. */
  readonly label = input<string>('');
  /** Rellena las formas cerradas con el color actual (variante «llena» del diseño). */
  readonly filled = input<boolean>(false);

  protected readonly known = computed(() =>
    (ICON_NAMES as readonly string[]).includes(this.name())
  );
}
