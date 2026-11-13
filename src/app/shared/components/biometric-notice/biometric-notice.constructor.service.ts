import { Injectable } from '@angular/core';

/** Textos estáticos del aviso de bloqueo desactivado automáticamente. */
@Injectable({ providedIn: 'root' })
export class BiometricNoticeConstructorService {
  readonly title = 'Bloqueo con huella desactivado';
  readonly description =
    'Hemos desactivado el bloqueo con huella porque ya no hay huellas registradas en tu móvil. Te lo volveremos a proponer cuando quieras protegerla de nuevo.';
  readonly acknowledgeLabel = 'Entendido';
}
