import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Illustration, IllustrationKind } from './illustration';

type ComponentDef = { ɵcmp: { onPush: boolean } };

@Component({
  imports: [Illustration],
  template: `<app-illustration [kind]="kind" [size]="size" />`,
})
class Host {
  kind: IllustrationKind = 'hill';
  size = 7;
}

function render(kind: IllustrationKind, size = 7) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.kind = kind;
  fixture.componentInstance.size = size;
  fixture.detectChanges();
  const host = fixture.nativeElement.querySelector('app-illustration') as HTMLElement;
  return { host, svg: host.querySelector('svg') as SVGElement, html: host.innerHTML };
}

describe('Illustration', () => {
  it.each(['hill', 'cloud', 'sparkles'] as const)(
    'US-010-02 la variante %s dibuja un SVG propio',
    (kind) => {
      const { svg } = render(kind);
      expect(svg).not.toBeNull();
      expect(svg.getAttribute('viewBox')).toBe('0 0 120 120');
      expect(svg.querySelectorAll('path, circle, ellipse, rect').length).toBeGreaterThan(2);
    }
  );

  it('US-010-02 cada variante es distinta', () => {
    const shapes = (['hill', 'cloud', 'sparkles'] as const).map((k) => render(k).svg.innerHTML);
    expect(new Set(shapes).size).toBe(3);
  });

  it('US-010-02 es decorativa: oculta a lectores de pantalla y sin foco', () => {
    const { host, svg } = render('hill');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('role')).toBe('presentation');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(host.textContent?.trim()).toBe('');
  });

  it('US-010-02 no carga recursos externos (sin imágenes ni enlaces)', () => {
    for (const kind of ['hill', 'cloud', 'sparkles'] as const) {
      const { html } = render(kind);
      expect(html).not.toMatch(/<image|<img|href=|xlink:href|url\(\s*['"]?https?:|<foreignObject/i);
    }
  });

  it('US-010-02 los colores salen de variables CSS (valen en claro y en oscuro)', () => {
    const { html } = render('cloud');
    expect(html).toMatch(/var\(--color-/);
    expect(html).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });

  it('US-010-02 el tamaño es configurable en rem', () => {
    const { host } = render('hill', 5);
    expect(
      host.style.getPropertyValue('--illustration-size') || host.getAttribute('style')
    ).toContain('5');
  });

  it('US-010-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((Illustration as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
