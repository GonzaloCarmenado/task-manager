import { Injectable } from '@angular/core';

/** Textos estáticos de la oferta de activación. El bloqueo solo tapa la pantalla: no se promete más. */
@Injectable({ providedIn: 'root' })
export class BiometricOfferConstructorService {
  readonly title = '¿Proteger la app con tu huella?';
  readonly description = 'Así nadie verá tus tareas si coge tu móvil.';
  readonly actions = {
    accept: 'Activar',
    later: 'Preguntarme más tarde',
    never: 'No volver a preguntar',
  } as const;
}
