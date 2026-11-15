import {
  INTERNAL_DOMAIN,
  fromInternalIdentifier,
  normalizeUsername,
  toInternalIdentifier,
} from './username';

describe('username', () => {
  it('US-011-01 normaliza: recorta espacios y pasa a minúsculas', () => {
    expect(normalizeUsername('  Carlos_Ritmo  ')).toBe('carlos_ritmo');
    expect(normalizeUsername('ANA.2026')).toBe('ana.2026');
    expect(normalizeUsername('')).toBe('');
  });

  it('US-011-01 el identificador interno usa el dominio reservado que nunca resuelve', () => {
    expect(INTERNAL_DOMAIN).toBe('cuenta.invalid');
    expect(toInternalIdentifier('carlos_ritmo')).toBe('carlos_ritmo@cuenta.invalid');
  });

  it('US-011-01 el identificador interno se construye con el nombre normalizado', () => {
    expect(toInternalIdentifier('  Ana-Aventura ')).toBe('ana-aventura@cuenta.invalid');
  });

  it('US-011-02 el nombre de usuario se recupera del identificador interno', () => {
    expect(fromInternalIdentifier('carlos_ritmo@cuenta.invalid')).toBe('carlos_ritmo');
    expect(fromInternalIdentifier('a.b-c_d@cuenta.invalid')).toBe('a.b-c_d');
  });

  it('US-011-02 ida y vuelta: toInternalIdentifier y fromInternalIdentifier son inversas', () => {
    for (const name of ['abc', 'a.b', 'x-y_z', 'user123']) {
      expect(fromInternalIdentifier(toInternalIdentifier(name))).toBe(name);
    }
  });

  it('US-011-02 un correo de otro dominio, vacío o nulo no es una cuenta de la app', () => {
    expect(fromInternalIdentifier('alguien@example.com')).toBeNull();
    expect(fromInternalIdentifier('@cuenta.invalid')).toBeNull();
    expect(fromInternalIdentifier('')).toBeNull();
    expect(fromInternalIdentifier(null)).toBeNull();
    expect(fromInternalIdentifier(undefined)).toBeNull();
  });

  it('US-011-02 el dominio se compara sin distinguir mayúsculas y no admite subdominios', () => {
    expect(fromInternalIdentifier('Ana@CUENTA.INVALID')).toBe('ana');
    expect(fromInternalIdentifier('ana@x.cuenta.invalid')).toBeNull();
  });
});
