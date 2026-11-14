import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Progress } from '../../../core/models/progress';
import { CLOCK } from '../../../core/services/clock';
import { ProgressAccessService, ProgressStatus } from '../progress.access.service';
import { ProgressConstructorService } from '../progress.constructor.service';
import { ProgressSummary } from './progress-summary';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function progress(over: Partial<Progress> = {}): Progress {
  return {
    totalXp: 170,
    level: 3,
    xpIntoLevel: 20,
    xpForNextLevel: 150,
    currentStreak: 0,
    bestStreak: 0,
    xpToday: 0,
    lastCompletedDay: null,
    ...over,
  };
}

function setup(data: Progress | null, status: ProgressStatus = 'ready') {
  const load = vi.fn(async () => true);
  const state = signal<Progress | null>(data);
  const statusSig = signal<ProgressStatus>(status);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ProgressSummary],
    providers: [
      provideRouter([]),
      { provide: ProgressAccessService, useValue: { progress: state, status: statusSig, load } },
      { provide: CLOCK, useValue: () => new Date(2026, 10, 14, 12, 0, 0) },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ProgressSummary);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    load,
    navigate,
    state,
    status: statusSig,
    rules: TestBed.inject(ProgressConstructorService),
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  };
}

describe('ProgressSummary', () => {
  it('US-008-04 muestra el nivel, la barra con sus XP y la racha', () => {
    const t = setup(progress({ currentStreak: 6, lastCompletedDay: '2026-11-14' }));
    expect(t.text()).toContain('Nivel 3');
    expect(t.text()).toContain('20 / 150 XP');
    expect(t.text()).toContain('6 días seguidos');
    const bar = t.el.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute('aria-valuenow')).toBe('20');
    expect(bar?.getAttribute('aria-valuemax')).toBe('150');
  });

  it('US-008-04 con la racha viva pero sin tarea hoy, anima a mantenerla', () => {
    const t = setup(progress({ currentStreak: 3, lastCompletedDay: '2026-11-13' }));
    expect(t.text()).toContain('Completa 1 tarea hoy para mantenerla');
  });

  it('US-008-04 si hoy ya hay una tarea completada, no insiste', () => {
    const t = setup(progress({ currentStreak: 3, lastCompletedDay: '2026-11-14' }));
    expect(t.text()).not.toContain('para mantenerla');
  });

  it('US-008-04 sin racha dice «Sin racha» y no pide mantenerla', () => {
    const t = setup(progress({ currentStreak: 0 }));
    expect(t.text()).toContain('Sin racha');
    expect(t.text()).not.toContain('para mantenerla');
  });

  it('US-008-04 tocar el resumen abre la pantalla de progreso', () => {
    const t = setup(progress());
    t.el.querySelector<HTMLButtonElement>('button.summary')?.click();
    expect(t.navigate).toHaveBeenCalledWith(['/progreso']);
  });

  it('US-008-04 la carga no bloquea: muestra un indicador y pide los datos si no los hay', () => {
    const t = setup(null, 'loading');
    expect(t.text()).toContain('Cargando tu progreso…');
    expect(t.el.querySelector('[role="status"]')).not.toBeNull();
    expect(t.el.querySelector('button')).toBeNull();
  });

  it('US-008-04 con error y sin dato ofrece Reintentar, que vuelve a cargar', () => {
    const t = setup(null, 'error');
    expect(t.text()).toContain('No pudimos cargar tu progreso');
    expect(t.el.querySelector('[role="alert"]')).not.toBeNull();
    const retry = Array.from(t.el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar')
    );
    retry?.click();
    expect(t.load).toHaveBeenCalledTimes(1);
  });

  it('US-008-04 un usuario nuevo ve nivel 1 con 0 XP y sin racha', () => {
    const t = setup(progress({ totalXp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: 50 }));
    expect(t.text()).toContain('Nivel 1');
    expect(t.text()).toContain('0 / 50 XP');
    expect(t.text()).toContain('Sin racha');
  });

  it('US-008-04 el botón tiene nombre accesible y el área táctil es de un botón', () => {
    const t = setup(progress());
    const button = t.el.querySelector<HTMLButtonElement>('button.summary');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-label')).toContain('Ver mi progreso');
  });

  it('US-008-04 usa ChangeDetectionStrategy.OnPush', () => {
    expect((ProgressSummary as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});

describe('ProgressSummary · sistema de diseño (spec 010)', () => {
  it('US-010-03 la racha es una pastilla con llama y número; con racha viva lleva halo (alive)', () => {
    const { el } = setup(progress({ currentStreak: 6, lastCompletedDay: '2026-11-14' }));
    const streak = el.querySelector('.streak');
    expect(streak?.classList.contains('pill')).toBe(true);
    expect(streak?.classList.contains('alive')).toBe(true);
    expect(streak?.querySelector('app-icon')).not.toBeNull();
    expect(streak?.textContent).toContain('6');
  });

  it('US-010-03 sin racha la pastilla es neutra y sin halo', () => {
    const { el } = setup(progress({ currentStreak: 0 }));
    const streak = el.querySelector('.streak');
    expect(streak?.classList.contains('none')).toBe(true);
    expect(streak?.classList.contains('alive')).toBe(false);
  });

  it('US-010-03 la barra conserva su semántica y el relleno es hijo de la pista', () => {
    const { el, rules } = setup(progress({ xpIntoLevel: 75, xpForNextLevel: 150 }));
    const bar = el.querySelector('.bar');
    expect(bar?.getAttribute('role')).toBe('progressbar');
    expect(bar?.getAttribute('aria-valuetext')).toBe(rules.xpBar(75, 150));
    expect(bar?.querySelector('.fill')).not.toBeNull();
  });

  it('US-010-03 el aviso de racha viva se conserva dentro de la tarjeta', () => {
    const { el, text, rules } = setup(
      progress({ currentStreak: 3, lastCompletedDay: '2026-11-13' })
    );
    expect(text()).toContain(rules.summary.keepStreak);
    expect(el.querySelector('.hint')).not.toBeNull();
  });
});
