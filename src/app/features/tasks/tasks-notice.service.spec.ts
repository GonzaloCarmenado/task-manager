import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksNoticeService } from './tasks-notice.service';

describe('TasksNoticeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
  });
  afterEach(() => vi.useRealTimers());

  it('US-007-01 sin aviso al empezar', () => {
    expect(TestBed.inject(TasksNoticeService).notice()).toBeNull();
  });

  it('US-007-01 muestra el aviso y lo borra solo a los 3 s', () => {
    const s = TestBed.inject(TasksNoticeService);
    s.show('Tarea completada', false);
    expect(s.notice()).toEqual({ text: 'Tarea completada', error: false });

    vi.advanceTimersByTime(2_999);
    expect(s.notice()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(s.notice()).toBeNull();
  });

  it('US-007-01 un error se marca como tal', () => {
    const s = TestBed.inject(TasksNoticeService);
    s.show('No se pudo', true);
    expect(s.notice()?.error).toBe(true);
  });

  it('US-007-01 un aviso nuevo sustituye al anterior y reinicia el plazo', () => {
    const s = TestBed.inject(TasksNoticeService);
    s.show('Uno', false);
    vi.advanceTimersByTime(2_000);
    s.show('Dos', false);
    vi.advanceTimersByTime(2_000);
    expect(s.notice()?.text).toBe('Dos');
    vi.advanceTimersByTime(1_000);
    expect(s.notice()).toBeNull();
  });
});
