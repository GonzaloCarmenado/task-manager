import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { AuthSession } from '../models/auth-session';
import {
  ATTEMPT_TIMEOUT_MS,
  AUTO_RETRY_DELAYS_MS,
  AUTO_RETRY_REASONS,
  SLOW_RETRY_INTERVAL_MS,
  AuthErrorReason,
  AuthStatus,
} from '../models/auth-status';
import { mapAuthError } from './auth-error.util';
import { AUTH_STORAGE_KEY, SupabaseService } from './supabase';

/** Almacenamiento donde `supabase-js` guarda la sesión; se inyecta para poder simularlo. */
export const AUTH_STORAGE = new InjectionToken<Pick<Storage, 'getItem'>>('AUTH_STORAGE', {
  providedIn: 'root',
  factory: () => window.localStorage,
});

/**
 * Dueño de la identidad de la app. Único punto de contacto con la autenticación de Supabase.
 * Ver specs/003-sesion-anonima.
 */
@Injectable({ providedIn: 'root' })
export class AuthAccessService {
  private readonly supabase = inject(SupabaseService);
  private readonly storage = inject(AUTH_STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  private readonly _status = signal<AuthStatus>('idle');
  private readonly _session = signal<AuthSession | null>(null);
  private readonly _errorReason = signal<AuthErrorReason | null>(null);
  private readonly _autoRetryPending = signal(false);

  readonly status = this._status.asReadonly();
  readonly session = this._session.asReadonly();
  readonly userId = computed(() => this._session()?.user.id ?? null);
  readonly errorReason = this._errorReason.asReadonly();
  readonly autoRetryPending = this._autoRetryPending.asReadonly();

  private initialized = false;
  /** Hay una llamada a `signInAnonymously()` sin resolver; nunca puede haber dos. */
  private inFlight = false;
  private attemptTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  /** Reintentos automáticos ya programados desde el último éxito o retry() manual. */
  private retryCount = 0;
  private readonly onOnline = () => this.onReconnect();
  private readonly onVisibilityChange = () => {
    if (this.document.visibilityState === 'visible') this.onReconnect();
    else this.clearRetryTimer();
  };

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
  }

  /**
   * Decide el estado inicial de forma síncrona, sin esperar a la red: con una sesión guardada,
   * `ready` al instante; sin ella, `loading` y primer inicio de sesión anónimo.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.subscribeToAuthEvents();
    this.document.defaultView?.addEventListener('online', this.onOnline);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);

    const stored = this.readStoredSession();
    if (stored) {
      this._session.set(stored);
      this._status.set('ready');
      return;
    }
    this._status.set('loading');
    this.attempt();
  }

  /** Reintento manual. Si ya hay una llamada en vuelo se une a ella en lugar de lanzar otra. */
  retry(): void {
    this.clearRetryTimer();
    this.retryCount = 0;
    this.attempt();
  }

  private dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearAttemptTimer();
    this.clearRetryTimer();
    this.document.defaultView?.removeEventListener('online', this.onOnline);
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private unsubscribe: (() => void) | null = null;

  private subscribeToAuthEvents(): void {
    const { data } = this.supabase.client.auth.onAuthStateChange((event, session) =>
      this.onAuthEvent(event, session)
    );
    this.unsubscribe = () => data.subscription.unsubscribe();
  }

  /**
   * `INITIAL_SESSION` y `SIGNED_IN` se ignoran: el estado inicial sale del almacenamiento y el
   * inicio de sesión anónimo lo gestiona `attempt()`.
   */
  private onAuthEvent(event: string, session: unknown): void {
    if (event === 'TOKEN_REFRESHED') {
      const refreshed = toAuthSession(session, false);
      if (refreshed) this._session.set(refreshed);
    } else if (event === 'SIGNED_OUT') {
      this.onServerSignOut();
    }
  }

  /**
   * En esta spec no hay cierre de sesión: un `SIGNED_OUT` es siempre un rechazo del servidor
   * (`supabase-js` retira la sesión por sí mismo). Se crea una identidad nueva pasando por `loading`.
   */
  private onServerSignOut(): void {
    if (this._session() === null) return; // ya se está obteniendo una identidad
    console.warn('[auth] La sesión fue rechazada por el servidor: se crea una identidad nueva.');
    this._session.set(null);
    this.clearRetryTimer();
    this.retryCount = 0;
    this.attempt();
  }

  /** Lee la sesión guardada directamente: `getSession()` sin red y con token caducado tarda ~25 s. */
  private readStoredSession(): AuthSession | null {
    try {
      const raw = this.storage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      return toAuthSession(JSON.parse(raw), true);
    } catch {
      return null;
    }
  }

  /**
   * Un intento de obtener sesión. El plazo solo cambia lo que ve el usuario: la llamada pendiente
   * no se abandona (`supabase-js` no permite cancelarla) y un nuevo intento se une a ella.
   */
  private attempt(): void {
    this._errorReason.set(null);
    this._status.set('loading');
    this.startAttemptTimer();
    if (this.inFlight) return;

    this.inFlight = true;
    this.supabase.client.auth.signInAnonymously().then(
      ({ data, error }) => {
        this.inFlight = false;
        const session = error ? null : toAuthSession(data.session, false);
        if (session) this.onSuccess(session);
        else this.onFailure(mapAuthError(error));
      },
      (error: unknown) => {
        this.inFlight = false;
        this.onFailure(mapAuthError(error));
      }
    );
  }

  /** Vuelve la red o la app a primer plano: un reintento si el motivo lo permite y no hay llamada en vuelo. */
  private onReconnect(): void {
    const reason = this._errorReason();
    if (this._status() !== 'error' || this.inFlight) return;
    if (reason === null || !AUTO_RETRY_REASONS.includes(reason)) return;
    this.clearRetryTimer();
    this.attempt();
  }

  private scheduleAutoRetry(reason: AuthErrorReason): void {
    this.clearRetryTimer();
    if (!AUTO_RETRY_REASONS.includes(reason)) return;
    // Con la app en segundo plano no se sondea; al volver a primer plano se reintenta de inmediato.
    if (this.document.visibilityState === 'hidden') return;
    // Primero espera creciente; después un sondeo lento (≤ 1 llamada/min). El evento `online` no es
    // fiable en el WebView de Android (comprobado en emulador), así que el sondeo es el mecanismo seguro.
    const delay =
      this.retryCount < AUTO_RETRY_DELAYS_MS.length
        ? AUTO_RETRY_DELAYS_MS[this.retryCount]
        : SLOW_RETRY_INTERVAL_MS;
    this.retryCount++;
    this._autoRetryPending.set(true);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this._autoRetryPending.set(false);
      this.attempt();
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this._autoRetryPending.set(false);
  }

  private startAttemptTimer(): void {
    this.clearAttemptTimer();
    this.attemptTimer = setTimeout(() => {
      this.attemptTimer = null;
      if (this.inFlight) this.onFailure('timeout');
    }, ATTEMPT_TIMEOUT_MS);
  }

  private clearAttemptTimer(): void {
    if (this.attemptTimer !== null) clearTimeout(this.attemptTimer);
    this.attemptTimer = null;
  }

  private onSuccess(session: AuthSession): void {
    this.clearAttemptTimer();
    this.clearRetryTimer();
    this.retryCount = 0;
    this._session.set(session);
    this._errorReason.set(null);
    this._status.set('ready');
  }

  private onFailure(reason: AuthErrorReason): void {
    if (!this.inFlight) this.clearAttemptTimer();
    this._errorReason.set(reason);
    this._status.set('error');
    this.scheduleAutoRetry(reason);
  }
}

/** Convierte lo que guarda o devuelve `supabase-js` en la vista mínima de la app; `null` si no es válido. */
function toAuthSession(value: unknown, requireRefreshToken: boolean): AuthSession | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as {
    refresh_token?: unknown;
    expires_at?: unknown;
    user?: { id?: unknown; is_anonymous?: unknown } | null;
  };
  const id = v.user?.id;
  if (typeof id !== 'string' || id === '') return null;
  if (requireRefreshToken && (typeof v.refresh_token !== 'string' || v.refresh_token === '')) {
    return null;
  }
  return {
    user: { id, isAnonymous: v.user?.is_anonymous === true },
    expiresAt: typeof v.expires_at === 'number' ? v.expires_at : null,
  };
}
