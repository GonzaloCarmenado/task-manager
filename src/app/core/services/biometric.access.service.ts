import { Injectable, inject } from '@angular/core';
import type { AuthOptions } from '@choochmeque/tauri-plugin-biometry-api';
import { BiometricFailure, BiometricResult } from '../models/biometric';
import { PlatformService } from './platform.service';

/** Textos del aviso del sistema, siempre en español (los del plugin por defecto están en inglés). */
const PROMPT = {
  confirm: {
    reason: 'Confirma con tu huella para proteger la app',
    title: 'Proteger la app',
    subtitle: 'Confirma con tu huella',
    cancelTitle: 'Cancelar',
  },
  unlock: {
    reason: 'Desbloquea la app con tu huella',
    title: 'Desbloquear la app',
    subtitle: 'Usa tu huella o el método de tu móvil',
  },
} as const;

const CANCELLED = /cancel|dismiss|negative/i;
const LOCKOUT = /lockout|too.?many/i;
const UNAVAILABLE =
  /not.?enrolled|none.?enrolled|not.?available|no.?hardware|passcode.?not.?set|no.?biometr/i;

/** Texto del error del plugin (llega como cadena u objeto con `message`, `code` o `errorCode`). */
function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; code?: unknown; errorCode?: unknown };
    return [e.code, e.errorCode, e.message].filter((v) => typeof v === 'string').join(' ');
  }
  return '';
}

/** Clasifica el error del plugin sin exponer su texto a la interfaz; por defecto, `failed`. */
export function classifyBiometricError(error: unknown): BiometricFailure {
  const text = errorText(error);
  if (CANCELLED.test(text)) return 'cancelled';
  if (LOCKOUT.test(text)) return 'lockout';
  if (UNAVAILABLE.test(text)) return 'unavailable';
  return 'failed';
}

/**
 * Único contacto con el plugin de biometría. El módulo se carga con `import()` solo en Android:
 * en navegador y escritorio no se importa. Nunca lanza y nunca escribe en consola.
 */
@Injectable({ providedIn: 'root' })
export class BiometricAccessService {
  private readonly platform = inject(PlatformService);

  isSupported(): boolean {
    return this.platform.isTauriAndroid();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const plugin = await import('@choochmeque/tauri-plugin-biometry-api');
      return (await plugin.checkStatus()).isAvailable === true;
    } catch {
      return false;
    }
  }

  /** Activar el bloqueo: exige la biometría en ese momento y lleva su propio botón «Cancelar». */
  confirm(): Promise<BiometricResult> {
    const { reason, ...texts } = PROMPT.confirm;
    return this.authenticate(reason, { ...texts, allowDeviceCredential: false });
  }

  /**
   * Desbloquear: biometría o el método del móvil (PIN, patrón o contraseña), que ofrece el propio
   * aviso del sistema. Con la credencial del móvil permitida Android no admite botón de cancelar propio.
   */
  unlock(): Promise<BiometricResult> {
    const { reason, ...texts } = PROMPT.unlock;
    return this.authenticate(reason, { ...texts, allowDeviceCredential: true });
  }

  private async authenticate(reason: string, options: AuthOptions): Promise<BiometricResult> {
    if (!this.isSupported()) return { ok: false, reason: 'unavailable' };
    try {
      const plugin = await import('@choochmeque/tauri-plugin-biometry-api');
      await plugin.authenticate(reason, { ...options, confirmationRequired: false });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: classifyBiometricError(error) };
    }
  }
}
