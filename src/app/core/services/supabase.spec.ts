import { TestBed } from '@angular/core/testing';
import { SUPABASE_CONFIG, SupabaseConfig } from './supabase.config';
import { AUTH_STORAGE_KEY, SUPABASE_CLIENT_FACTORY, SupabaseService } from './supabase';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn((..._args: unknown[]) => ({ auth: {} })),
}));

function setup(config: SupabaseConfig): SupabaseService {
  TestBed.resetTestingModule();
  // El constructor del cliente se inyecta: no se simula el módulo (un `vi.mock` sobre `@supabase/supabase-js`
  // dependía del orden en que otros specs cargaban el módulo real y fallaba de forma intermitente).
  TestBed.configureTestingModule({
    providers: [
      { provide: SUPABASE_CONFIG, useValue: config },
      { provide: SUPABASE_CLIENT_FACTORY, useValue: mocks.createClient },
    ],
  });
  return TestBed.inject(SupabaseService);
}

const valid: SupabaseConfig = { url: 'https://abc.supabase.co', key: 'publishable-key-123' };

describe('SupabaseService', () => {
  beforeEach(() => mocks.createClient.mockClear());

  it('US-002-04 crea el cliente con la url y la key del token', () => {
    const service = setup(valid);

    expect(mocks.createClient).toHaveBeenCalledTimes(1);
    expect(mocks.createClient.mock.calls[0][0]).toBe(valid.url);
    expect(mocks.createClient.mock.calls[0][1]).toBe(valid.key);
    expect(service.client).toBe(mocks.createClient.mock.results[0].value);
  });

  it('US-002-04 configura persistSession, autoRefreshToken y detectSessionInUrl', () => {
    setup(valid);

    expect(mocks.createClient.mock.calls[0][2]).toEqual({
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY,
      },
    });
  });

  it('US-003-02 usa una storageKey fija, explícita y sin datos del proyecto', () => {
    expect(AUTH_STORAGE_KEY).toBe('task-manager-auth');
    expect(AUTH_STORAGE_KEY).not.toContain(valid.url);
    expect(AUTH_STORAGE_KEY).not.toContain('supabase.co');

    setup(valid);
    const options = mocks.createClient.mock.calls[0][2] as { auth: { storageKey: string } };
    expect(options.auth.storageKey).toBe(AUTH_STORAGE_KEY);
  });

  it('US-002-04 lanza error si la url está vacía', () => {
    expect(() => setup({ url: '', key: valid.key })).toThrow(/url/i);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('US-002-04 lanza error si la key está vacía', () => {
    expect(() => setup({ url: valid.url, key: '  ' })).toThrow(/key/i);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('US-002-04 lanza error con los placeholders del ejemplo', () => {
    expect(() => setup({ url: 'https://YOUR_PROJECT_REF.supabase.co', key: valid.key })).toThrow(
      /environment/i
    );
    expect(() => setup({ url: valid.url, key: 'YOUR_SUPABASE_PUBLISHABLE_KEY' })).toThrow(
      /environment/i
    );
  });
});
