import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';

/** Plazo máximo para que el historial se asiente tras retroceder por código. */
const SETTLE_MS = 400;
/** Tiempo tras el que un retroceso propio sin respuesta del navegador deja de esperarse. */
const OWN_MOVE_TTL_MS = 1500;

export interface OverlayHandle {
  /**
   * Retrocede la entrada del historial que añadió la capa y espera a que el navegador termine, para
   * poder navegar después sin que ese retroceso deshaga la navegación. No avisa como «botón atrás».
   */
  close(): Promise<void>;
}

interface Layer {
  readonly onBack: () => void;
  popped: boolean;
  closed: boolean;
}

/**
 * Botón atrás de Android para hojas y diálogos: al abrirse añade una entrada al historial que absorbe
 * ese gesto y lo traduce en «cerrar». Con capas superpuestas el gesto solo cierra la de arriba.
 * Los retrocesos que provoca la propia app (al retirar una capa) se distinguen de los del usuario:
 * no cierran la capa de debajo. `register` debe llamarse en un contexto de inyección.
 */
@Injectable({ providedIn: 'root' })
export class OverlayBack {
  private readonly view = inject(DOCUMENT).defaultView;
  /** Capas abiertas, de abajo arriba. */
  private readonly stack: Layer[] = [];
  /** Caducidad de cada retroceso propio pendiente de su `popstate`. */
  private ownMoves: number[] = [];

  constructor() {
    this.view?.addEventListener('popstate', () => this.onPopState());
  }

  register(onBack: () => void): OverlayHandle {
    const view = this.view;
    const layer: Layer = { onBack, popped: false, closed: false };
    this.stack.push(layer);
    view?.history.pushState({ overlay: true }, '');

    inject(DestroyRef).onDestroy(() => {
      const alive = !layer.popped && !layer.closed;
      this.remove(layer);
      if (alive) this.moveBack(() => view?.history.back());
    });

    return {
      close: () => {
        if (layer.popped || layer.closed || !view) return Promise.resolve();
        layer.closed = true;
        this.remove(layer);
        return this.settle(view, () => view.history.back());
      },
    };
  }

  /**
   * Retira de golpe todas las capas abiertas (una sola vez en el historial) y espera a que se asiente.
   * Se usa antes de navegar a otra pantalla tras completar un flujo con capas.
   */
  closeAll(): Promise<void> {
    const view = this.view;
    const open = this.stack.filter((l) => !l.popped && !l.closed);
    if (!view || open.length === 0) return Promise.resolve();
    for (const layer of open) {
      layer.closed = true;
      this.remove(layer);
    }
    return this.settle(view, () => view.history.go(-open.length));
  }

  private onPopState(): void {
    const now = Date.now();
    this.ownMoves = this.ownMoves.filter((expiry) => expiry > now);
    if (this.ownMoves.length > 0) {
      this.ownMoves.shift(); // lo provocó la propia app: no es el botón atrás del usuario
      return;
    }
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    top.popped = true;
    this.remove(top);
    top.onBack();
  }

  private moveBack(move: () => void): void {
    this.ownMoves.push(Date.now() + OWN_MOVE_TTL_MS);
    move();
  }

  private remove(layer: Layer): void {
    const index = this.stack.indexOf(layer);
    if (index >= 0) this.stack.splice(index, 1);
  }

  private settle(view: Window, move: () => void): Promise<void> {
    return new Promise<void>((resolve) => {
      // El router de Angular atiende su propio `popstate` dentro de un `setTimeout(0)`: se espera una
      // macrotarea más, o su navegación «restaurar» pisaría la que haga quien llama después.
      const done = () => {
        view.removeEventListener('popstate', done);
        clearTimeout(timer);
        setTimeout(resolve, 0);
      };
      const timer = setTimeout(done, SETTLE_MS);
      view.addEventListener('popstate', done);
      this.moveBack(move);
    });
  }
}
