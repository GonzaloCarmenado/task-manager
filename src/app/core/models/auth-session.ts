/**
 * Sesión tal y como la ve la aplicación: solo la identidad. Nunca lleva tokens, para que no
 * puedan llegar a plantillas, señales compartidas ni logs.
 */
export interface AuthSession {
  readonly user: { readonly id: string; readonly isAnonymous: boolean };
  /** Caducidad del token de acceso (segundos desde epoch), si se conoce. */
  readonly expiresAt: number | null;
}
