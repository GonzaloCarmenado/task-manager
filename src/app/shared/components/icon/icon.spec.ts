import { TestBed } from '@angular/core/testing';
import { ICON_NAMES, Icon, IconName } from './icon';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function render(name: string, label?: string) {
  const fixture = TestBed.createComponent(Icon);
  fixture.componentRef.setInput('name', name as IconName);
  if (label !== undefined) fixture.componentRef.setInput('label', label);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Icon', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Icon] }).compileComponents();
  });

  it('US-003-06 define los iconos que usan las pantallas de sesión', () => {
    expect([...ICON_NAMES].sort()).toEqual(
      [
        'alert',
        'bell',
        'bell-off',
        'calendar',
        'check',
        'chevron-down',
        'chevron-right',
        'clock',
        'fingerprint',
        'plus',
        'trash',
        'hourglass',
        'lock',
        'refresh',
        'server',
        'shield',
        'snooze',
        'wifi-off',
      ].sort()
    );
  });

  it('US-003-06 pinta un SVG con contenido por cada nombre conocido', () => {
    for (const name of ICON_NAMES) {
      const svg = render(name).querySelector('svg');
      expect(svg, name).not.toBeNull();
      expect(svg?.children.length, name).toBeGreaterThan(0);
    }
  });

  it('US-003-06 es decorativo por defecto: aria-hidden y sin role', () => {
    const svg = render('refresh').querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
    expect(svg?.getAttribute('aria-label')).toBeNull();
  });

  it('US-003-06 con label es una imagen accesible', () => {
    const svg = render('wifi-off', 'Sin conexión').querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Sin conexión');
    expect(svg?.getAttribute('aria-hidden')).toBeNull();
  });

  it('US-003-06 un nombre desconocido no pinta nada', () => {
    expect(render('no-existe').querySelector('svg')).toBeNull();
  });

  it('US-003-06 usa currentColor y no carga recursos externos', () => {
    for (const name of ICON_NAMES) {
      const el = render(name);
      expect(el.innerHTML, name).not.toMatch(/https?:\/\//);
      expect(el.querySelector('svg')?.getAttribute('stroke'), name).toBe('currentColor');
    }
  });

  it('US-003-06 usa ChangeDetectionStrategy.OnPush', () => {
    expect((Icon as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
