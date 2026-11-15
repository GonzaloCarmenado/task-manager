import { Injectable, computed, inject } from '@angular/core';
import { AccountResult } from '../../core/models/account';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { TasksAccessService } from '../tasks/tasks.access.service';

/**
 * Flujos de la cuenta de usuario para las pantallas. La identidad la gestiona `AuthAccessService`
 * (único dueño de `supabase.auth`); aquí se orquestan los efectos sobre los datos de la app.
 */
@Injectable({ providedIn: 'root' })
export class AccountAccessService {
  private readonly auth = inject(AuthAccessService);
  private readonly tasks = inject(TasksAccessService);

  /** Hay una cuenta con nombre de usuario (no es la sesión anónima). */
  readonly hasAccount = computed(() => {
    const session = this.auth.session();
    return session !== null && !session.user.isAnonymous;
  });
  readonly isAnonymous = computed(() => this.auth.session()?.user.isAnonymous === true);
  readonly username = computed(() => {
    const session = this.auth.session();
    return session !== null && !session.user.isAnonymous ? session.user.username : null;
  });

  /** Sin conexión no se cierra sesión: la app no puede crear la identidad anónima siguiente. */
  canSignOut(): boolean {
    return this.auth.canSignOut();
  }

  /** Cierra la sesión de esta app y descarta de memoria las tareas de la cuenta saliente. */
  async signOut(): Promise<AccountResult> {
    const leaving = this.auth.session();
    if (leaving === null || leaving.user.isAnonymous) return { ok: false, reason: 'unauthorized' };
    const result = await this.auth.signOut();
    if (result.ok) this.tasks.forget(leaving.user.id);
    return result;
  }
}
