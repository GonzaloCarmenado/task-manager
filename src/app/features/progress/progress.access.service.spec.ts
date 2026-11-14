import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressRow } from '../../core/models/progress';
import { AuthAccessService } from '../../core/services/auth.access.service';
import { CLOCK } from '../../core/services/clock';
import { SupabaseService } from '../../core/services/supabase';
import { ProgressAccessService } from './progress.access.service';

type Result = { data: unknown; error: unknown };
type Settle = (signal: AbortSignal | undefined) => Result | Promise<Result>;

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const ok = (data: unknown): Result => ({ data, error: null });
const fail = (error: unknown): Result => ({ data: null, error });

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

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const activeSpies: { mockRestore: () => void }[] = [];

function setup(options: { userId?: string | null; now?: Date } = {}) {
  const userId = signal<string | null>(options.userId === undefined ? USER_A : options.userId);
  const queue: Settle[] = [];
  const calls: { name: string; args: unknown }[] = [];
  const rpc = vi.fn((name: string, args: unknown) => {
    calls.push({ name, args });
    const settle = queue.shift() ?? (() => ok(row()));
    let used: AbortSignal | undefined;
    const chain = {
      abortSignal: (s: AbortSignal) => {
        used = s;
        return chain;
      },
      then: (onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(settle(used)).then(onFulfilled, onRejected),
    };
    return chain;
  });
  const consoleSpies = (['log', 'warn', 'error', 'debug', 'info'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => undefined)
  );

  activeSpies.push(...consoleSpies);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SupabaseService, useValue: { client: { rpc } } },
      { provide: AuthAccessService, useValue: { userId } },
      { provide: CLOCK, useValue: () => options.now ?? new Date(2026, 10, 14, 23, 59, 0) },
    ],
  });
  return {
    service: TestBed.inject(ProgressAccessService),
    userId,
    rpc,
    calls,
    next: (settle: Settle) => queue.push(settle),
    consoleSpies,
  };
}

afterEach(() => activeSpies.forEach((spy) => spy.mockRestore()));

describe('ProgressAccessService · carga', () => {
  it('US-008-04 llama a get_progress con el día local (también a las 23:59) y mapea la respuesta', async () => {
    const { service, next, calls } = setup();
    next(() =>
      ok(
        row({
          total_xp: 60,
          best_streak: 4,
          current_streak: 2,
          xp_today: 20,
          last_completed_day: '2026-11-14',
        })
      )
    );

    await service.load();

    expect(calls[0]).toEqual({ name: 'get_progress', args: { p_today: '2026-11-14' } });
    expect(service.status()).toBe('ready');
    expect(service.progress()).toMatchObject({
      totalXp: 60,
      level: 2,
      xpIntoLevel: 10,
      currentStreak: 2,
    });
  });

  it('US-008-04 estados: idle, loading mientras carga y ready', async () => {
    const { service, next } = setup();
    expect(service.status()).toBe('idle');
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));

    const loading = service.load();
    expect(service.status()).toBe('loading');
    await flush();
    release(ok(row()));
    await loading;
    expect(service.status()).toBe('ready');
  });

  it('US-008-04 un fallo sin datos previos deja el estado en error', async () => {
    const { service, next } = setup();
    next(() => fail(new Error('Failed to fetch')));
    await service.load();
    expect(service.status()).toBe('error');
    expect(service.progress()).toBeNull();
  });

  it('US-008-04 una respuesta con forma inesperada se trata como error', async () => {
    const { service, next } = setup();
    next(() => ok({ total_xp: 'mucho' }));
    await service.load();
    expect(service.status()).toBe('error');
  });

  it('US-008-04 un fallo al recargar conserva el último dato de esta apertura', async () => {
    const { service, next } = setup();
    next(() => ok(row({ total_xp: 30 })));
    await service.load();
    next(() => fail(new Error('Failed to fetch')));
    await service.load();
    expect(service.progress()?.totalXp).toBe(30);
    expect(service.status()).toBe('ready');
  });

  it('US-008-04 sin respuesta en 8 s aborta la consulta y da error', async () => {
    vi.useFakeTimers();
    try {
      const { service, next } = setup();
      next(
        (signal) =>
          new Promise<Result>((_, reject) =>
            signal?.addEventListener('abort', () => reject(new Error('AbortError')))
          )
      );
      const loading = service.load();
      await vi.advanceTimersByTimeAsync(8_001);
      await loading;
      expect(service.status()).toBe('error');
    } finally {
      vi.useRealTimers();
    }
  });

  it('US-008-04 sin identidad no consulta nada', async () => {
    const { service, rpc } = setup({ userId: null });
    await service.load();
    expect(rpc).not.toHaveBeenCalled();
    expect(service.progress()).toBeNull();
  });

  it('US-008-04 el progreso se indexa por usuario y no se mezcla', async () => {
    const { service, next, userId } = setup();
    next(() => ok(row({ total_xp: 80 })));
    await service.load();
    expect(service.progress()?.totalXp).toBe(80);

    userId.set(USER_B);
    expect(service.progress()).toBeNull();
    expect(service.status()).toBe('idle');
  });

  it('US-008-04 una respuesta tardía de otro usuario no se mezcla con el actual', async () => {
    const { service, next, userId } = setup();
    let release: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (release = resolve)));
    const loading = service.load();
    await flush();
    userId.set(USER_B);
    release(ok(row({ total_xp: 500 })));
    await loading;
    expect(service.progress()).toBeNull();
  });

  it('US-008-04 una recarga más antigua que resuelve después no pisa una más nueva', async () => {
    const { service, next } = setup();
    let releaseOld: (r: Result) => void = () => undefined;
    next(() => new Promise<Result>((resolve) => (releaseOld = resolve)));
    const older = service.load();
    await flush();
    next(() => ok(row({ total_xp: 90 })));
    await service.load();

    releaseOld(ok(row({ total_xp: 10 })));
    await older;
    expect(service.progress()?.totalXp).toBe(90);
  });

  it('US-008-04 nunca escribe en consola, ni con errores', async () => {
    const { service, next, consoleSpies } = setup();
    next(() => fail(new Error('detalle interno')));
    await service.load();
    next(() => ok(row()));
    await service.load();
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});

describe('ProgressAccessService · tras completar o desmarcar', () => {
  async function loaded(initial: Partial<ProgressRow> = {}) {
    const ctx = setup();
    ctx.next(() => ok(row(initial)));
    await ctx.service.load();
    return ctx;
  }

  it('US-008-01 al completar recarga y emite +10 XP con el dato confirmado', async () => {
    const { service, next } = await loaded({ total_xp: 20 });
    const before = service.progress();
    next(() => ok(row({ total_xp: 30, xp_today: 10 })));

    await service.afterToggle(true, before);

    expect(service.celebration()).toEqual({
      xpDelta: 10,
      capped: false,
      streakDays: null,
      leveledUpTo: null,
    });
    expect(service.levelUp()).toBeNull();
  });

  it('US-008-01 con error al recargar no hay celebración ni XP inventado', async () => {
    const { service, next } = await loaded({ total_xp: 20 });
    const before = service.progress();
    next(() => fail(new Error('Failed to fetch')));

    await service.afterToggle(true, before);

    expect(service.celebration()).toBeNull();
    expect(service.progress()?.totalXp).toBe(20);
  });

  it('US-008-02 subir de nivel completando emite la subida una sola vez', async () => {
    const { service, next } = await loaded({ total_xp: 40 });
    next(() => ok(row({ total_xp: 50 })));
    await service.afterToggle(true, service.progress());
    expect(service.levelUp()).toBe(2);

    service.consumeLevelUp();
    expect(service.levelUp()).toBeNull();
  });

  it('US-008-02 bajar de nivel al desmarcar no abre pantalla, y avisa los XP quitados', async () => {
    const { service, next } = await loaded({ total_xp: 50 });
    next(() => ok(row({ total_xp: 40 })));
    await service.afterToggle(false, service.progress());
    expect(service.levelUp()).toBeNull();
    expect(service.celebration()?.xpDelta).toBe(-10);
  });

  it('US-008-03 la primera tarea del día emite la racha', async () => {
    const { service, next } = await loaded({ current_streak: 2, total_xp: 0 });
    next(() => ok(row({ current_streak: 3, total_xp: 10 })));
    await service.afterToggle(true, service.progress());
    expect(service.celebration()?.streakDays).toBe(3);
  });

  it('US-008-01 una celebración vacía (desmarcar sin XP) no se emite', async () => {
    const { service, next } = await loaded({ total_xp: 30 });
    next(() => ok(row({ total_xp: 30 })));
    await service.afterToggle(false, service.progress());
    expect(service.celebration()).toBeNull();
  });

  it('US-008-01 dismissCelebration la quita', async () => {
    const { service, next } = await loaded({ total_xp: 20 });
    next(() => ok(row({ total_xp: 30 })));
    await service.afterToggle(true, service.progress());
    expect(service.celebration()).not.toBeNull();
    service.dismissCelebration();
    expect(service.celebration()).toBeNull();
  });

  it('US-008-01 sin dato previo la recarga actualiza el resumen pero no inventa celebración', async () => {
    const { service, next } = setup();
    next(() => ok(row({ total_xp: 10 })));
    await service.afterToggle(true, null);
    await flush();
    expect(service.progress()?.totalXp).toBe(10);
    expect(service.celebration()).toBeNull();
  });
});
