import { environment } from './environment.example';

describe('environment.example', () => {
  it('US-002-03 expone supabaseUrl y supabaseKey', () => {
    expect(Object.keys(environment).sort()).toEqual(['supabaseKey', 'supabaseUrl']);
  });

  it('US-002-03 solo contiene placeholders, nunca valores reales', () => {
    expect(environment.supabaseUrl).toContain('YOUR_');
    expect(environment.supabaseKey).toContain('YOUR_');
  });
});
