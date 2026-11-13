import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/**
 * Dónde se ejecuta la app. Los plugins nativos de Tauri solo se cargan en Android: en navegador y
 * escritorio no se importan.
 */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly view = inject(DOCUMENT).defaultView as
    (Window & { __TAURI_INTERNALS__?: unknown }) | null;

  isTauri(): boolean {
    return !!this.view && '__TAURI_INTERNALS__' in this.view;
  }

  isAndroid(): boolean {
    return /Android/i.test(this.view?.navigator?.userAgent ?? '');
  }

  isTauriAndroid(): boolean {
    return this.isTauri() && this.isAndroid();
  }
}
