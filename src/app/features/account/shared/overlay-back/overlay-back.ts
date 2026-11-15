import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';

/** Plazo máximo para que el historial se asiente tras retroceder por código. */
const SETTLE_MS = 400;

export interface OverlayHandle {
  /**
   * Retrocede la entrada del historial que añadió la capa y espera a que el navegador termine, para
   * poder navegar después sin que ese retroceso deshaga la navegación. No avisa como «botón atrás».
   */
  close(): Promise<void>;
}

/**
 * Botón atrás de Android para hojas y diálogos: al abrirse añade una entrada al historial que absorbe
 * ese gesto y lo traduce en «cerrar». Debe llamarse en un contexto de inyección (constructor o campo).
 */
@Injectable({ providedIn: 'root' })
export class OverlayBack {
  private readonly view = inject(DOCUMENT).defaultView;

  register(onBack: () => void): OverlayHandle {
    const view = this.view;
    let popped = false;
    let closed = false;
    const onPopState = () => {
      if (closed) return;
      popped = true;
      onBack();
    };
    view?.history.pushState({ overlay: true }, '');
    view?.addEventListener('popstate', onPopState);
    inject(DestroyRef).onDestroy(() => {
      view?.removeEventListener('popstate', onPopState);
      if (!popped && !closed) view?.history.back();
    });

    return {
      close: () => {
        if (popped || closed || !view) return Promise.resolve();
        closed = true;
        return new Promise<void>((resolve) => {
          const settle = () => {
            view.removeEventListener('popstate', settle);
            clearTimeout(timer);
            resolve();
          };
          const timer = setTimeout(settle, SETTLE_MS);
          view.addEventListener('popstate', settle);
          view.history.back();
        });
      },
    };
  }
}
