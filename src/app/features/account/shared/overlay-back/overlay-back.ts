import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';

/**
 * Botón atrás de Android para hojas y diálogos: al abrirse añade una entrada al historial que absorbe
 * ese gesto y lo traduce en «cerrar». Debe llamarse en un contexto de inyección (constructor o campo).
 */
@Injectable({ providedIn: 'root' })
export class OverlayBack {
  private readonly view = inject(DOCUMENT).defaultView;

  register(onBack: () => void): void {
    let popped = false;
    const onPopState = () => {
      popped = true;
      onBack();
    };
    this.view?.history.pushState({ overlay: true }, '');
    this.view?.addEventListener('popstate', onPopState);
    inject(DestroyRef).onDestroy(() => {
      this.view?.removeEventListener('popstate', onPopState);
      if (!popped) this.view?.history.back();
    });
  }
}
