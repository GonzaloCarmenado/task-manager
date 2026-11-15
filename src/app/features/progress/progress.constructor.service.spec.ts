import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Progress, ProgressRow } from '../../core/models/progress';
import { ProgressConstructorService } from './progress.constructor.service';

function service(): ProgressConstructorService {
  TestBed.resetTestingModule();
  return TestBed.inject(ProgressConstructorService);
}

function row(over: Partial<ProgressRow> = {}): ProgressRow {
  return {
    total_xp: 0,
    best_streak: 0,
    current_streak: 0,
    xp_today: 0,
    last_completed_day: null,
    ...over,
  };
}

describe('ProgressConstructorService · curva de niveles', () => {
  it('US-008-02 el XP para alcanzar el nivel N es 25·N·(N−1)', () => {
    const s = service();
    expect([1, 2, 3, 4, 5, 6].map((n) => s.xpToReach(n))).toEqual([0, 50, 150, 300, 500, 750]);
  });

  it('US-008-02 el nivel cambia justo en cada umbral y no antes', () => {
    const s = service();
    expect(s.levelOf(0)).toBe(1);
    expect(s.levelOf(49)).toBe(1);
    expect(s.levelOf(50)).toBe(2);
    expect(s.levelOf(149)).toBe(2);
    expect(s.levelOf(150)).toBe(3);
    expect(s.levelOf(299)).toBe(3);
    expect(s.levelOf(300)).toBe(4);
    expect(s.levelOf(500)).toBe(5);
    expect(s.levelOf(100000)).toBeGreaterThan(40);
  });

  it('US-008-02 un XP negativo o no finito cuenta como nivel 1', () => {
    const s = service();
    expect(s.levelOf(-5)).toBe(1);
    expect(s.levelOf(Number.NaN)).toBe(1);
  });
});

describe('ProgressConstructorService · toProgress', () => {
  it('US-008-02 un usuario nuevo está en el nivel 1 con 0 XP y racha 0', () => {
    expect(service().toProgress(row())).toEqual({
      totalXp: 0,
      level: 1,
      xpIntoLevel: 0,
      xpForNextLevel: 50,
      currentStreak: 0,
      bestStreak: 0,
      xpToday: 0,
      lastCompletedDay: null,
    });
  });

  it('US-008-02 calcula el XP dentro del nivel y lo que dura el nivel', () => {
    const p = service().toProgress(
      row({
        total_xp: 170,
        best_streak: 5,
        current_streak: 2,
        xp_today: 30,
        last_completed_day: '2026-11-14',
      })
    );
    expect(p.level).toBe(3);
    expect(p.xpIntoLevel).toBe(20);
    expect(p.xpForNextLevel).toBe(150);
    expect(p.currentStreak).toBe(2);
    expect(p.bestStreak).toBe(5);
    expect(p.xpToday).toBe(30);
    expect(p.lastCompletedDay).toBe('2026-11-14');
  });
});

describe('ProgressConstructorService · celebración', () => {
  const at = (totalXp: number, over: Partial<ProgressRow> = {}): Progress =>
    service().toProgress(row({ total_xp: totalXp, ...over }));

  it('US-008-01 completar da +10 XP', () => {
    const s = service();
    const c = s.celebration(at(20), at(30), true);
    expect(c).toEqual({ xpDelta: 10, capped: false, streakDays: null, leveledUpTo: null });
  });

  it('US-008-01 con el tope alcanzado no da XP y lo dice', () => {
    const s = service();
    const c = s.celebration(at(20, { xp_today: 100 }), at(20, { xp_today: 100 }), true);
    expect(c.xpDelta).toBe(0);
    expect(c.capped).toBe(true);
  });

  it('US-008-03 la primera tarea del día muestra la racha', () => {
    const s = service();
    const c = s.celebration(at(0, { current_streak: 2 }), at(10, { current_streak: 3 }), true);
    expect(c.streakDays).toBe(3);
  });

  it('US-008-03 la segunda tarea del día no repite la racha', () => {
    const s = service();
    const c = s.celebration(at(10, { current_streak: 3 }), at(20, { current_streak: 3 }), true);
    expect(c.streakDays).toBeNull();
  });

  it('US-008-01 desmarcar indica los XP realmente quitados', () => {
    const s = service();
    const c = s.celebration(at(30), at(20), false);
    expect(c.xpDelta).toBe(-10);
    expect(c.capped).toBe(false);
    expect(c.streakDays).toBeNull();
  });

  it('US-008-01 desmarcar una tarea sin XP quita 0 y no indica cifra', () => {
    const s = service();
    const c = s.celebration(at(30), at(30), false);
    expect(c.xpDelta).toBe(0);
    expect(s.xpText(c)).toBeNull();
  });

  it('US-008-02 subir de nivel indica el nivel final una sola vez', () => {
    const s = service();
    const c = s.celebration(at(40), at(50), true);
    expect(c.leveledUpTo).toBe(2);
  });

  it('US-008-02 bajar de nivel al desmarcar no abre pantalla', () => {
    const s = service();
    const c = s.celebration(at(50), at(40), false);
    expect(c.leveledUpTo).toBeNull();
    expect(c.xpDelta).toBe(-10);
  });

  it('US-008-01 sin dato anterior no se inventa nada', () => {
    const s = service();
    const c = s.celebration(null, at(10), true);
    expect(c).toEqual({ xpDelta: 0, capped: false, streakDays: null, leveledUpTo: null });
  });
});

describe('ProgressConstructorService · textos', () => {
  it('US-008-01 los textos de XP son los acordados', () => {
    const s = service();
    expect(s.xpText({ xpDelta: 10, capped: false, streakDays: null, leveledUpTo: null })).toBe(
      '+10 XP'
    );
    expect(s.xpText({ xpDelta: -10, capped: false, streakDays: null, leveledUpTo: null })).toBe(
      '−10 XP'
    );
    expect(s.xpText({ xpDelta: 0, capped: true, streakDays: null, leveledUpTo: null })).toBe(
      'Hoy ya has llegado al tope de XP'
    );
  });

  it('US-008-03 el texto de la racha concuerda en singular y plural', () => {
    const s = service();
    expect(s.streakText(1)).toBe('Llevas 1 día');
    expect(s.streakText(4)).toBe('Llevas 4 días');
    expect(s.streakLabel(1)).toBe('1 día seguido');
    expect(s.streakLabel(7)).toBe('7 días seguidos');
    expect(s.streakLabel(0)).toBe('Sin racha');
  });

  it('US-008-04 los textos de la franja y de la pantalla no usan términos técnicos ni rangos', () => {
    const s = service();
    const all = JSON.stringify([s.summary, s.screen, s.levelUp]);
    expect(all).not.toMatch(/trigger|RLS|supabase|get_progress|XP total \(/i);
    expect(all).not.toMatch(/bronce|plata|oro|maestro|leyenda/i);
    expect(s.summary.keepStreak).toBe('Completa 1 tarea hoy para mantenerla');
    expect(s.screen.title).toBe('Tu progreso');
    expect(s.levelUp.continue).toBe('Continuar');
  });

  it('US-008-04 el texto de la barra y el de nivel son legibles', () => {
    const s = service();
    expect(s.xpBar(20, 150)).toBe('20 / 150 XP');
    expect(s.levelLabel(3)).toBe('Nivel 3');
    expect(s.todayXp(30)).toBe('30 / 100');
  });
});
