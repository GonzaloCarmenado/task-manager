import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { AccountErrorReason, AccountResult } from '../models/account';
import { AuthSession } from '../models/auth-session';
import {
  ATTEMPT_TIMEOUT_MS,
  AUTO_RETRY_DELAYS_MS,
  AUTO_RETRY_REASONS,
  SLOW_RETRY_INTERVAL_MS,
  AuthErrorReason,
  AuthStatus,
} from '../models/auth-status';
import { fromInternalIdentifier, normalizeUsername, toInternalIdentifier } from '../utils/username';
import { mapAccountError, mapAuthError } from './auth-error.util';
import { AUTH_STORAGE_KEY, SupabaseService } from './supabase';

/** Plazo de una operación de cuenta: sin red o con el token caducado las llamadas no vuelven solas. */
const ACCOUNT_TIMEOUT_MS = 15_000;
/** Cuánto vale una comprobación de credenciales a la espera de que la persona decida. */
const PENDING_SIGN_IN_MS = 10 * 60 * 1000;

type Guarded<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: AccountErrorReason };

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

  /** Hay una operación de cuenta en curso; solo puede haber una a la vez. */
  private accountBusy = false;
  /** Credenciales ya comprobadas con el cliente sonda, a la espera de decidir. Solo en memoria; nunca salen del servicio. */
  private pendingSignIn: { accessToken: string; refreshToken: string; at: number } | null = null;

  /**
   * Primera fase del inicio de sesión: comprueba las credenciales con un cliente sonda **sin tocar la
   * sesión real**, así que cancelar después no destruye la sesión anónima.
   */
  async checkCredentials(username: string, password: string): Promise<AccountResult> {
    const current = this._session();
    if (current === null || !current.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    this.pendingSignIn = null;
    return this.exclusive(async () => {
      const outcome = await this.guarded(() =>
        this.supabase
          .createProbeClient()
          .auth.signInWithPassword({ email: toInternalIdentifier(username), password })
      );
      if (!outcome.ok) return outcome;
      const { data, error } = outcome.value;
      if (error) return { ok: false, reason: mapAccountError(error) };
      const session = data.session;
      if (!session?.access_token || !session.refresh_token) return { ok: false, reason: 'unknown' };
      this.pendingSignIn = {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        at: Date.now(),
      };
      return { ok: true };
    });
  }

  /** Segunda fase: aplica la sesión comprobada y cambia la identidad. Solo vale una vez. */
  async completeSignIn(): Promise<AccountResult> {
    const pending = this.pendingSignIn;
    if (pending === null || Date.now() - pending.at > PENDING_SIGN_IN_MS) {
      this.pendingSignIn = null;
      return { ok: false, reason: 'unauthorized' };
    }
    return this.exclusive(async () => {
      const outcome = await this.guarded(() =>
        this.supabase.client.auth.setSession({
          access_token: pending.accessToken,
          refresh_token: pending.refreshToken,
        })
      );
      if (!outcome.ok) {
        // Sin red se puede reintentar con lo ya comprobado; en otro caso hay que volver a comprobar.
        if (outcome.reason !== 'network' && outcome.reason !== 'timeout') this.pendingSignIn = null;
        return outcome;
      }
      this.pendingSignIn = null;
      const { data, error } = outcome.value;
      if (error) return { ok: false, reason: mapAccountError(error) };
      const session = toAuthSession(data.session, false);
      if (!session) return { ok: false, reason: 'unknown' };
      this.clearRetryTimer();
      this.retryCount = 0;
      this._session.set(session);
      this._errorReason.set(null);
      this._status.set('ready');
      return { ok: true };
    });
  }

  /** Nombre de usuario de la cuenta abierta; `null` si la sesión es anónima o no hay sesión. */
  private accountUsername(): string | null {
    const current = this._session();
    return current !== null && !current.user.isAnonymous ? current.user.username : null;
  }

  /** Comprueba la contraseña actual con un cliente sonda: no toca la sesión real. */
  private async reauthenticate(username: string, password: string): Promise<AccountResult> {
    const outcome = await this.guarded(() =>
      this.supabase
        .createProbeClient()
        .auth.signInWithPassword({ email: toInternalIdentifier(username), password })
    );
    if (!outcome.ok) return outcome;
    return outcome.value.error
      ? { ok: false, reason: mapAccountError(outcome.value.error) }
      : { ok: true };
  }

  /** Cambia la contraseña tras comprobar la actual. No cambia nada a medias. */
  async changePassword(current: string, next: string): Promise<AccountResult> {
    const username = this.accountUsername();
    if (username === null) return { ok: false, reason: 'unauthorized' };
    if (next === current) return { ok: false, reason: 'same-password' };
    return this.exclusive(async () => {
      const verified = await this.reauthenticate(username, current);
      if (!verified.ok) return verified;
      const outcome = await this.guarded(() =>
        this.supabase.client.auth.updateUser({ password: next })
      );
      if (!outcome.ok) return outcome;
      if (outcome.value.error) return { ok: false, reason: mapAccountError(outcome.value.error) };
      return { ok: true };
    });
  }

  /** Cambia el nombre de usuario tras comprobar la contraseña; el `user_id` y los datos no cambian. */
  async changeUsername(next: string, password: string): Promise<AccountResult> {
    const username = this.accountUsername();
    if (username === null) return { ok: false, reason: 'unauthorized' };
    const target = normalizeUsername(next);
    if (target === username) return { ok: false, reason: 'username-taken' };
    return this.exclusive(async () => {
      const verified = await this.reauthenticate(username, password);
      if (!verified.ok) return verified;
      const outcome = await this.guarded(() =>
        this.supabase.client.auth.updateUser({ email: toInternalIdentifier(target) })
      );
      if (!outcome.ok) return outcome;
      const { data, error } = outcome.value;
      if (error) return { ok: false, reason: mapAccountError(error) };
      // Si el servicio dejara el cambio pendiente de verificar, el identificador no habría cambiado.
      if (fromInternalIdentifier(data.user?.email) !== target)
        return { ok: false, reason: 'unknown' };
      this._session.update((session) =>
        session === null ? session : { ...session, user: { ...session.user, username: target } }
      );
      return { ok: true };
    });
  }

  /** Cierre de sesión pedido por la persona: su `SIGNED_OUT` no es un rechazo del servidor. */
  private expectedSignOut = false;

  /**
   * Cierra **solo esta sesión** (`scope: 'local'`: las de otros móviles de la cuenta siguen) y deja una
   * sesión anónima nueva y vacía. Sin red no se cierra nada: la app nunca se queda sin identidad.
   */
  async signOut(): Promise<AccountResult> {
    const current = this._session();
    if (current === null || current.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    return this.exclusive(async () => {
      this.expectedSignOut = true;
      const outcome = await this.guarded(() =>
        this.supabase.client.auth.signOut({ scope: 'local' })
      );
      this.expectedSignOut = false;
      if (!outcome.ok) return outcome;
      if (outcome.value.error) return { ok: false, reason: mapAccountError(outcome.value.error) };
      this.pendingSignIn = null;
      this._session.set(null);
      this.clearRetryTimer();
      this.retryCount = 0;
      this.attempt();
      return { ok: true };
    });
  }

  /**
   * Borra la cuenta y todos sus datos (función de servidor `delete_my_account`) tras comprobar la
   * contraseña. Si algo falla antes de borrar no cambia nada; una vez borrada, el móvil siempre
   * acaba con una sesión anónima nueva, aunque el cierre local no pueda completarse.
   */
  async deleteOwnAccount(password: string): Promise<AccountResult> {
    const username = this.accountUsername();
    if (username === null) return { ok: false, reason: 'unauthorized' };
    return this.exclusive(async () => {
      const verified = await this.reauthenticate(username, password);
      if (!verified.ok) return verified;
      const outcome = await this.guarded(() => this.supabase.client.rpc('delete_my_account'));
      if (!outcome.ok) return outcome;
      if (outcome.value.error) return { ok: false, reason: mapAccountError(outcome.value.error) };
      this.expectedSignOut = true;
      await this.guarded(() => this.supabase.client.auth.signOut({ scope: 'local' }));
      this.expectedSignOut = false;
      this.pendingSignIn = null;
      this._session.set(null);
      this.clearRetryTimer();
      this.retryCount = 0;
      this.attempt();
      return { ok: true };
    });
  }

  /** Descarta lo comprobado: la sesión anónima sigue intacta. */
  cancelSignIn(): void {
    this.pendingSignIn = null;
  }

  /**
   * Vincula la sesión anónima a un nombre de usuario y una contraseña. Conserva el mismo `user_id`,
   * así que las tareas y el progreso siguen siendo suyos. Nunca lanza ni escribe en consola.
   */
  async linkAccount(username: string, password: string): Promise<AccountResult> {
    const current = this._session();
    if (current === null || !current.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    return this.exclusive(async () => {
      const outcome = await this.guarded(() =>
        this.supabase.client.auth.updateUser({ email: toInternalIdentifier(username), password })
      );
      if (!outcome.ok) return outcome;
      const { data, error } = outcome.value;
      if (error) return { ok: false, reason: mapAccountError(error) };
      const user = data.user;
      // Si el servicio exigiera verificar el identificador, la cuenta seguiría anónima: no es un éxito.
      if (!user || user.is_anonymous === true) return { ok: false, reason: 'unknown' };
      this._session.set({
        user: {
          id: current.user.id,
          isAnonymous: false,
          username: fromInternalIdentifier(user.email),
        },
        expiresAt: current.expiresAt,
      });
      return { ok: true };
    });
  }

  private async exclusive(operation: () => Promise<AccountResult>): Promise<AccountResult> {
    if (this.accountBusy) return { ok: false, reason: 'unknown' };
    this.accountBusy = true;
    try {
      return await operation();
    } finally {
      this.accountBusy = false;
    }
  }

  /** Ejecuta una llamada de la librería con plazo propio y sin dejar escapar excepciones. */
  private async guarded<T>(call: () => PromiseLike<T>): Promise<Guarded<T>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), ACCOUNT_TIMEOUT_MS);
    });
    try {
      const result = await Promise.race([Promise.resolve(call()), timeout]);
      return result === 'timeout' ? { ok: false, reason: 'timeout' } : { ok: true, value: result };
    } catch (error) {
      return { ok: false, reason: mapAccountError(error) };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Reintento manual. Si ya hay una llamada en vuelo se une a ella en lugar de lanzar otra. */
  retry(): void {
    this.clearRetryTimer();
    this.retryCount = 0;
    this.attempt();
  }

  private dispose(): void {
    this.pendingSignIn = null;
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
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
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
    if (this._session() === null || this.expectedSignOut) return; // ya se obtiene una identidad, o lo pidió la persona
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
    user?: { id?: unknown; is_anonymous?: unknown; email?: unknown } | null;
  };
  const id = v.user?.id;
  if (typeof id !== 'string' || id === '') return null;
  if (requireRefreshToken && (typeof v.refresh_token !== 'string' || v.refresh_token === '')) {
    return null;
  }
  return {
    user: {
      id,
      isAnonymous: v.user?.is_anonymous === true,
      username:
        v.user?.is_anonymous === true
          ? null
          : fromInternalIdentifier(v.user?.email as string | undefined),
    },
    expiresAt: typeof v.expires_at === 'number' ? v.expires_at : null,
  };
}
