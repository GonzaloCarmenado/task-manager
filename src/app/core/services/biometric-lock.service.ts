import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import {
  BACKGROUND_LOCK_MS,
  BIOMETRIC_PREFS_KEY,
  BiometricLockPrefs,
  BiometricResult,
  DEFAULT_BIOMETRIC_PREFS,
  LockPhase,
  MAX_LATER_ANSWERS,
} from '../models/biometric';
import { AuthAccessService } from './auth.access.service';
import { BiometricAccessService } from './biometric.access.service';

/** Almacenamiento de las preferencias (local al dispositivo); se inyecta para poder simularlo. */
export const BIOMETRIC_STORAGE = new InjectionToken<Pick<Storage, 'getItem' | 'setItem'>>(
  'BIOMETRIC_STORAGE',
  { providedIn: 'root', factory: () => window.localStorage }
);

/**
 * Estado y reglas del bloqueo con huella (spec 004). Es un bloqueo de pantalla: no cifra nada.
 * Nunca escribe en consola y nunca toca la sesión (solo lee su estado).
 */
@Injectable({ providedIn: 'root' })
export class BiometricLockService {
  private readonly access = inject(BiometricAccessService);
  private readonly auth = inject(AuthAccessService);
  private readonly storage = inject(BIOMETRIC_STORAGE);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly supported = this.access.isSupported();
  private readonly prefs = signal<BiometricLockPrefs>(DEFAULT_BIOMETRIC_PREFS);
  private readonly _available = signal(false);
  private readonly _locked = signal(false);
  private readonly _covered = signal(false);
  private readonly _phase = signal<LockPhase>('prompting');
  private readonly _offerClosed = signal(false);
  private readonly _activating = signal(false);

  /** Hace falta autenticarse para ver la app. */
  readonly locked = this._locked.asReadonly();
  /** Cubierta cosmética en segundo plano (<30 s): tapa la miniatura de «apps recientes». */
  readonly covered = this._covered.asReadonly();
  readonly overlayVisible = computed(() => this._locked() || this._covered());
  readonly phase = this._phase.asReadonly();
  readonly activating = this._activating.asReadonly();
  readonly noticeVisible = computed(() => this.prefs().disabledNotice);

  readonly offerVisible = computed(() => {
    const p = this.prefs();
    return (
      this.supported &&
      this._available() &&
      !p.enabled &&
      p.offerAnswer !== 'never' &&
      p.laterCount < MAX_LATER_ANSWERS &&
      this.auth.status() === 'ready' &&
      !this._offerClosed() &&
      !p.disabledNotice
    );
  });

  private initialized = false;
  private prompting = false;
  private hiddenAt: number | null = null;
  private readonly onVisibility = () => this.handleVisibility();

  constructor() {
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('visibilitychange', this.onVisibility)
    );
  }

  /**
   * Parte síncrona: con el bloqueo activo la app arranca ya bloqueada, sin esperar a nada. El resto
   * (comprobar la biometría y lanzar el aviso) sigue en segundo plano.
   */
  initialize(): void {
    if (this.initialized || !this.supported) return;
    this.initialized = true;
    this.prefs.set(this.readPrefs());
    this.document.addEventListener('visibilitychange', this.onVisibility);
    if (this.prefs().enabled) this._locked.set(true);
    void this.start();
  }

  /** Desbloquear con la huella (o el método del móvil). Un solo aviso abierto a la vez. */
  async unlock(): Promise<void> {
    if (!this._locked() || this.prompting) return;
    this.prompting = true;
    this._phase.set('prompting');
    let result: BiometricResult;
    try {
      result = await this.access.unlock();
    } finally {
      this.prompting = false;
    }
    if (result.ok) {
      this._locked.set(false);
      this._covered.set(false);
      return;
    }
    switch (result.reason) {
      case 'cancelled':
        this._phase.set('cancelled');
        break;
      case 'lockout':
        this._phase.set('lockout');
        break;
      case 'unavailable':
        this.disableAutomatically();
        break;
      default:
        this._phase.set('failed');
    }
  }

  /** «Activar»: exige la huella en ese momento. Cancelar o fallar cierra la oferta sin activar nada. */
  async acceptOffer(): Promise<void> {
    if (this._activating()) return;
    this._activating.set(true);
    let result: BiometricResult;
    try {
      result = await this.access.confirm();
    } finally {
      this._activating.set(false);
    }
    this._offerClosed.set(true);
    if (result.ok) this.updatePrefs({ ...this.prefs(), enabled: true });
  }

  /** «Ahora no»: a la tercera equivale a «No volver a preguntar». */
  later(): void {
    const p = this.prefs();
    const laterCount = p.laterCount + 1;
    this.updatePrefs({
      ...p,
      laterCount,
      offerAnswer: laterCount >= MAX_LATER_ANSWERS ? 'never' : p.offerAnswer,
    });
    this._offerClosed.set(true);
  }

  never(): void {
    this.updatePrefs({ ...this.prefs(), offerAnswer: 'never' });
    this._offerClosed.set(true);
  }

  acknowledgeNotice(): void {
    this.updatePrefs({ ...this.prefs(), disabledNotice: false });
  }

  private async start(): Promise<void> {
    this._available.set(await this.isAvailableSafe());
    if (!this.prefs().enabled) return;
    if (!this._available()) {
      this.disableAutomatically();
      return;
    }
    await this.unlock();
  }

  /** Si el plugin falla al comprobar se asume disponible: nunca se desactiva el bloqueo por un fallo puntual. */
  private async isAvailableSafe(): Promise<boolean> {
    try {
      return await this.access.isAvailable();
    } catch {
      return true;
    }
  }

  private handleVisibility(): void {
    if (!this.prefs().enabled) return;
    if (this.document.visibilityState === 'hidden') {
      // ya bloqueada, o es la hoja del sistema del propio aviso: no cuenta como segundo plano
      if (this._locked() || this.prompting) return;
      this.hiddenAt = Date.now();
      this._covered.set(true);
      return;
    }
    const hiddenAt = this.hiddenAt;
    this.hiddenAt = null;
    if (this._locked()) return;
    if (hiddenAt !== null && Date.now() - hiddenAt > BACKGROUND_LOCK_MS) {
      void this.lockAfterBackground();
    } else {
      this._covered.set(false);
    }
  }

  private async lockAfterBackground(): Promise<void> {
    if (!(await this.isAvailableSafe())) {
      this.disableAutomatically();
      return;
    }
    this._locked.set(true);
    this._covered.set(false);
    await this.unlock();
  }

  /** La biometría ya no está disponible: se desactiva sola, con aviso, y la oferta se reinicia. */
  private disableAutomatically(): void {
    const p = this.prefs();
    this.updatePrefs({
      enabled: false,
      offerAnswer: p.offerAnswer === 'never' ? 'never' : 'pending',
      laterCount: 0,
      disabledNotice: true,
    });
    this._locked.set(false);
    this._covered.set(false);
  }

  private updatePrefs(next: BiometricLockPrefs): void {
    this.prefs.set(next);
    try {
      this.storage.setItem(BIOMETRIC_PREFS_KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento: las preferencias solo duran esta apertura */
    }
  }

  private readPrefs(): BiometricLockPrefs {
    try {
      const raw = this.storage.getItem(BIOMETRIC_PREFS_KEY);
      if (!raw) return DEFAULT_BIOMETRIC_PREFS;
      const v = JSON.parse(raw) as Partial<Record<keyof BiometricLockPrefs, unknown>> | null;
      if (
        v !== null &&
        typeof v === 'object' &&
        typeof v.enabled === 'boolean' &&
        (v.offerAnswer === 'pending' || v.offerAnswer === 'never') &&
        typeof v.laterCount === 'number' &&
        Number.isInteger(v.laterCount) &&
        v.laterCount >= 0 &&
        typeof v.disabledNotice === 'boolean'
      ) {
        return {
          enabled: v.enabled,
          offerAnswer: v.offerAnswer,
          laterCount: v.laterCount,
          disabledNotice: v.disabledNotice,
        };
      }
    } catch {
      /* contenido corrupto o almacenamiento no disponible */
    }
    return DEFAULT_BIOMETRIC_PREFS;
  }
}
