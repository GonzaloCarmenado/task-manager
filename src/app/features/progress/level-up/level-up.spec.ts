import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { ProgressAccessService } from '../progress.access.service';
import { LevelUp } from './level-up';

type ComponentDef = { ɵcmp: { onPush: boolean } };

function setup(level: string) {
  const consumeLevelUp = vi.fn();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LevelUp],
    providers: [
      provideRouter([]),
      { provide: ProgressAccessService, useValue: { consumeLevelUp } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ level }) } },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LevelUp);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    el,
    navigate,
    consumeLevelUp,
    text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  };
}

describe('LevelUp', () => {
  it('US-008-02 muestra el nivel nuevo y la enhorabuena', () => {
    const { text } = setup('4');
    expect(text()).toContain('¡Has subido de nivel!');
    expect(text()).toContain('4');
    expect(text()).toContain('Enhorabuena');
  });

  it('US-008-02 Continuar vuelve a la lista y consume la subida', () => {
    const { el, navigate, consumeLevelUp } = setup('2');
    el.querySelector<HTMLButtonElement>('button.continue')?.click();
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(consumeLevelUp).toHaveBeenCalledTimes(1);
  });

  it('US-008-02 tocar en cualquier parte también vuelve a la lista', () => {
    const { el, navigate } = setup('2');
    el.querySelector<HTMLElement>('.screen')?.click();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('US-008-02 un nivel inválido vuelve a la lista en vez de mostrar basura', () => {
    const { navigate, text } = setup('abc');
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(text()).not.toContain('NaN');
  });

  it('US-008-02 no incluye completadas, +25 XP ni el flujo de huella', () => {
    const { text } = setup('3');
    expect(text()).not.toMatch(/completadas|\+25|huella|notificaci/i);
  });

  it('US-008-02 usa ChangeDetectionStrategy.OnPush', () => {
    expect((LevelUp as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});

describe('LevelUp · sistema de diseño (spec 010)', () => {
  it('US-010-03 es un modal de nivel 3: tarjeta con destellos decorativos sobre el velo', () => {
    const { el } = setup('4');
    expect(el.querySelector('.card')).not.toBeNull();
    const sparkles = el.querySelector('.card app-illustration');
    expect(sparkles?.getAttribute('kind')).toBe('sparkles');
    expect(sparkles?.getAttribute('aria-hidden')).toBe('true');
  });

  it('US-010-03 el nivel nuevo se anuncia y Continuar sigue siendo el botón principal', () => {
    const { el } = setup('5');
    expect(el.querySelector('.level')?.getAttribute('aria-live')).toBe('polite');
    expect(el.querySelector('button.continue')?.textContent).toContain('Continuar');
  });
});
