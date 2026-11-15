import { TestBed } from '@angular/core/testing';
import { RuleView } from '../../../../core/models/account';
import { RuleList } from './rule-list';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const RULES: RuleView[] = [
  { key: 'a', text: 'De 8 a 64 caracteres', state: 'ok' },
  { key: 'b', text: 'Distinta del nombre de usuario', state: 'error' },
  { key: 'c', text: 'Coincidencia exacta con la anterior', state: 'idle' },
];

function render(rules: readonly RuleView[]) {
  const fixture = TestBed.createComponent(RuleList);
  fixture.componentRef.setInput('rules', rules);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RuleList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RuleList] }).compileComponents();
  });

  it('US-011-02 pinta una fila por regla con su texto', () => {
    const items = Array.from(render(RULES).querySelectorAll('li'));
    expect(items).toHaveLength(RULES.length);
    items.forEach((li, i) => {
      expect(li.querySelector('.text')?.textContent?.replace(/\s+/g, ' ')).toContain(RULES[i].text);
    });
  });

  it('US-011-02 cada estado tiene su clase y su icono (reposo, cumple, incumple)', () => {
    const items = Array.from(render(RULES).querySelectorAll('li'));
    expect(items.map((li) => li.getAttribute('data-state'))).toEqual(['ok', 'error', 'idle']);
    expect(items[0].querySelector('svg circle')).not.toBeNull();
    expect(items[0].querySelector('svg path')).not.toBeNull(); // check-circle lleva marca
    expect(items[1].querySelector('svg path')).toBeNull(); // circle sin marca
    expect(items[2].querySelector('svg path')).toBeNull();
  });

  it('US-011-02 el estado no depende solo del color: texto accesible para lectores', () => {
    const items = Array.from(render(RULES).querySelectorAll('li'));
    expect(items[0].querySelector('.sr')?.textContent?.trim()).toBe('Cumple:');
    expect(items[1].querySelector('.sr')?.textContent?.trim()).toBe('No cumple:');
    expect(items[2].querySelector('.sr')).toBeNull();
  });

  it('US-011-02 sin reglas no pinta lista', () => {
    expect(render([]).querySelector('ul')).toBeNull();
  });

  it('US-011-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((RuleList as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
