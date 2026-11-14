import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Progress } from '../../../core/models/progress';
import { ProgressAccessService, ProgressStatus } from '../progress.access.service';
import { ProgressScreen } from './progress-screen';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function progress(over: Partial<Progress> = {}): Progress {
  return {
    totalXp: 340,
    level: 4,
    xpIntoLevel: 40,
    xpForNextLevel: 200,
    currentStreak: 6,
    bestStreak: 9,
    xpToday: 30,
    lastCompletedDay: '2026-11-14',
    ...over,
  };
}

function setup(data: Progress | null, status: ProgressStatus = 'ready') {
  const load = vi.fn(async () => true);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ProgressScreen],
    providers: [
      provideRouter([]),
      {
        provide: ProgressAccessService,
        useValue: { progress: signal(data), status: signal(status), load },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ProgressScreen);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { el, load, navigate, text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '' };
}

describe('ProgressScreen', () => {
  it('US-008-04 al abrir pide el progreso más reciente', () => {
    expect(setup(progress()).load).toHaveBeenCalledTimes(1);
  });

  it('US-008-04 muestra nivel, XP total, XP para el siguiente nivel, rachas y XP de hoy', () => {
    const { text } = setup(progress());
    expect(text()).toContain('Tu progreso');
    expect(text()).toContain('Nivel 4');
    expect(text()).toContain('340');
    expect(text()).toContain('Faltan 160 XP');
    expect(text()).toContain('6 días seguidos');
    expect(text()).toContain('9 días seguidos');
    expect(text()).toContain('30 / 100');
  });

  it('US-008-04 un usuario nuevo ve nivel 1, 0 XP, racha 0 y un mensaje que anima a empezar', () => {
    const { text } = setup(
      progress({
        totalXp: 0,
        level: 1,
        xpIntoLevel: 0,
        xpForNextLevel: 50,
        currentStreak: 0,
        bestStreak: 0,
        xpToday: 0,
        lastCompletedDay: null,
      })
    );
    expect(text()).toContain('Nivel 1');
    expect(text()).toContain('Faltan 50 XP');
    expect(text()).toContain('Sin racha');
    expect(text()).toContain('Completa tu primera tarea');
  });

  it('US-008-04 no muestra el mensaje de usuario nuevo si ya hay XP', () => {
    expect(setup(progress()).text()).not.toContain('Completa tu primera tarea');
  });

  it('US-008-04 cargando muestra un indicador anunciado', () => {
    const { el, text } = setup(null, 'loading');
    expect(text()).toContain('Cargando tu progreso…');
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });

  it('US-008-04 con error y sin dato ofrece Reintentar', () => {
    const { el, load } = setup(null, 'error');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    const retry = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar')
    );
    retry?.click();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('US-008-04 volver y cerrar llevan a la lista', () => {
    const { el, navigate } = setup(progress());
    el.querySelector<HTMLButtonElement>('button.back')?.click();
    el.querySelector<HTMLButtonElement>('button.close')?.click();
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-008-04 no incluye simuladores, misiones, tienda ni rangos con nombre', () => {
    const { text } = setup(progress());
    expect(text()).not.toMatch(/simula|misi[óo]n|tienda|logros|explorador|maestro|perfil/i);
  });

  it('US-008-04 usa ChangeDetectionStrategy.OnPush', () => {
    expect((ProgressScreen as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
