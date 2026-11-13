import { Injectable } from '@angular/core';
import { AuthErrorReason } from '../../../core/models/auth-status';
import { IconName } from '../icon/icon';

export interface SessionStatusCopy {
  readonly icon: IconName;
  readonly title: string;
  readonly description: string;
  /** Etiqueta breve sobre el icono (estado de la pausa). */
  readonly pill: string;
}

const NETWORK: SessionStatusCopy = {
  icon: 'wifi-off',
  title: 'Sin conexión',
  description: 'Parece que no hay internet. Revisa tu wifi o datos móviles para continuar.',
  pill: 'Pausa temporal',
};
const RATE_LIMITED: SessionStatusCopy = {
  icon: 'hourglass',
  title: 'Demasiados intentos',
  description:
    'Has hecho varias peticiones muy seguidas. Tómate un respiro de un momento y volvemos a intentarlo.',
  pill: 'Pausa temporal',
};
const SERVICE_UNAVAILABLE: SessionStatusCopy = {
  icon: 'server',
  title: 'Servicio no disponible',
  description: 'Estamos ajustando las cosas por nuestra parte. Danos unos minutos y estará listo.',
  pill: 'Pausa temporal',
};
const TIMEOUT: SessionStatusCopy = {
  icon: 'clock',
  title: 'Tarda más de lo normal',
  description: 'La conexión está yendo más despacio de lo habitual y no hemos llegado a tiempo.',
  pill: 'Pausa temporal',
};
const UNKNOWN: SessionStatusCopy = {
  icon: 'alert',
  title: 'Error inesperado',
  description:
    'Ha ocurrido un pequeño tropiezo imprevisto y no sabemos con certeza la causa. ¡Volvamos a probar!',
  pill: 'Pausa temporal',
};

/**
 * Configuración estática de textos. Los 6 motivos de error se corresponden con las 5 variantes
 * del diseño: `disabled` comparte «Servicio no disponible» para no exponer la configuración.
 */
@Injectable({ providedIn: 'root' })
export class SessionStatusConstructorService {
  readonly loading = {
    title: 'Preparando tu espacio…',
    description: 'Estamos dejando todo listo para que empieces sin registros.',
  } as const;

  readonly retryLabel = 'Reintentar';
  readonly autoRetryNotice = 'Comprobando la conexión automáticamente…';
  readonly autoRetryHint = 'Pulsa en cualquier momento o espera unos instantes';
  readonly manualRetryHint = 'Pulsa cuando quieras volver a intentarlo';

  errorCopy(reason: AuthErrorReason): SessionStatusCopy {
    switch (reason) {
      case 'network':
        return NETWORK;
      case 'rate_limited':
        return RATE_LIMITED;
      case 'timeout':
        return TIMEOUT;
      case 'service_unavailable':
      case 'disabled':
        return SERVICE_UNAVAILABLE;
      case 'unknown':
        return UNKNOWN;
    }
  }
}
