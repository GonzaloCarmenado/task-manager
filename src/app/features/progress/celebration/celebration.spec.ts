import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Celebration as CelebrationData } from '../../../core/models/progress';
import { Celebration } from './celebration';

type ComponentDef = { ɵcmp: { onPush: boolean } };

const data = (over: Partial<CelebrationData> = {}): CelebrationData => ({
  xpDelta: 10,
  capped: false,
  streakDays: null,
  leveledUpTo: null,
  ...over,
});

function render(value: CelebrationData) {
  TestBed.resetTestingModule();
  const fixture = TestBed.createComponent(Celebration);
  fixture.componentRef.setInput('celebration', value);
  const done = vi.fn();
  fixture.componentInstance.finished.subscribe(done);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, done, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('Celebration', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('US-008-01 muestra +10 XP', () => {
    expect(render(data()).text()).toContain('+10 XP');
  });

  it('US-008-01 con el tope alcanzado lo dice y no muestra XP', () => {
    const t = render(data({ xpDelta: 0, capped: true })).text();
    expect(t).toContain('Hoy ya has llegado al tope de XP');
    expect(t).not.toContain('+0');
  });

  it('US-008-03 la primera tarea del día muestra la racha', () => {
    expect(render(data({ streakDays: 3 })).text()).toContain('Llevas 3 días');
  });

  it('US-008-01 al desmarcar muestra los XP quitados', () => {
    expect(render(data({ xpDelta: -10 })).text()).toContain('−10 XP');
  });

  it('US-008-01 dura cerca de un segundo y entonces avisa de que terminó', () => {
    const t = render(data());
    vi.advanceTimersByTime(900);
    expect(t.done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(t.done).toHaveBeenCalledTimes(1);
  });

  it('US-008-01 no bloquea: es un aviso anunciado y no captura los toques', () => {
    const { el } = render(data());
    const box = el.querySelector('.celebration');
    expect(box?.getAttribute('role')).toBe('status');
    expect(box?.getAttribute('aria-live')).toBe('polite');
    expect(el.querySelector('button')).toBeNull();
  });

  it('US-008-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((Celebration as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
