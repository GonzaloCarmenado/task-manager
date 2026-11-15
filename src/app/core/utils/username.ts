/**
 * El nombre de usuario es lo único que ve y escribe la persona. Supabase exige un identificador con
 * forma de correo, así que internamente se usa uno ficticio en un dominio reservado (RFC 2606) que
 * nunca resuelve y al que nunca se envía nada.
 */
export const INTERNAL_DOMAIN = 'cuenta.invalid';

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function toInternalIdentifier(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_DOMAIN}`;
}

/** Nombre de usuario de un identificador interno; `null` si no es de la app. */
export function fromInternalIdentifier(identifier: string | null | undefined): string | null {
  if (typeof identifier !== 'string') return null;
  const at = identifier.lastIndexOf('@');
  if (at <= 0) return null;
  if (identifier.slice(at + 1).toLowerCase() !== INTERNAL_DOMAIN) return null;
  const name = normalizeUsername(identifier.slice(0, at));
  return name === '' ? null : name;
}
