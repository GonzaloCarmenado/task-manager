import { TestBed } from '@angular/core/testing';
import { SUPABASE_CONFIG, SupabaseConfig } from './supabase.config';
import { SupabaseService } from './supabase';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn((..._args: unknown[]) => ({ auth: {} })),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

function setup(config: SupabaseConfig): SupabaseService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CONFIG, useValue: config }] });
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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
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
