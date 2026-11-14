import { TestBed } from '@angular/core/testing';
import { Task } from '../../../../core/models/task';
import { CLOCK } from '../../../../core/services/clock';
import { PostponeConstructorService } from '../postpone.constructor.service';
import { PostponeSheet } from './postpone-sheet';

type ComponentDef = { ɵcmp: { onPush: boolean } };

// Sábado 14 de noviembre de 2026, 10:00.
const NOW = new Date(2026, 10, 14, 10, 0, 0);

const TASK: Task = {
  id: 't1',
  title: 'Llamar al dentista',
  dueDate: '2026-11-14',
  dueTime: '09:00',
  completedAt: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  postponedCount: 0,
};

describe('PostponeSheet', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostponeSheet],
      providers: [{ provide: CLOCK, useValue: () => NOW }],
    }).compileComponents();
  });

  function render(task: Task = TASK) {
    const fixture = TestBed.createComponent(PostponeSheet);
    fixture.componentRef.setInput('task', task);
    const choose = vi.fn();
    const dismiss = vi.fn();
    fixture.componentInstance.choose.subscribe(choose);
    fixture.componentInstance.dismiss.subscribe(dismiss);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      choose,
      dismiss,
      text: () => el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      options: () => Array.from(el.querySelectorAll<HTMLButtonElement>('button.option')),
      date: () => el.querySelector<HTMLInputElement>('input[type="date"]'),
    };
  }

  it('US-007-01 muestra el título de la tarea y sus opciones con el detalle', () => {
    const { text, options } = render();
    expect(text()).toContain('Posponer tarea');
    expect(text()).toContain('Llamar al dentista');
    const labels = options().map(
      (b) =>
        `${b.querySelector('.label')?.textContent} | ${b.querySelector('.detail')?.textContent}`
    );
    expect(labels).toEqual([
      'Más tarde hoy | hoy a las 11:00',
      'Mañana | Domingo, 15 de noviembre · a las 09:00',
      'La semana que viene | Lunes, 16 de noviembre · a las 09:00',
    ]);
  });

  it('US-007-01 elegir una opción emite su destino', () => {
    const { options, choose } = render();
    options()[1].click();
    expect(choose).toHaveBeenCalledWith({ dueDate: '2026-11-15', dueTime: '09:00' });
  });

  it('US-007-01 los botones son de tipo button y tienen nombre accesible', () => {
    const { el } = render();
    const buttons = Array.from(el.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => {
      expect(b.getAttribute('type')).toBe('button');
      expect((b.textContent ?? '').trim().length).toBeGreaterThan(0);
    });
  });

  it('US-007-01 elegir fecha usa el selector nativo con el mínimo de la tarea', () => {
    const { date, text } = render();
    expect(date()?.min).toBe('2026-11-15'); // la tarea es de hoy: el día siguiente
    expect(text()).toContain('Elegir fecha');
  });

  it('US-007-01 una tarea atrasada admite desde hoy', () => {
    const { date } = render({ ...TASK, dueDate: '2026-11-01' });
    expect(date()?.min).toBe('2026-11-14');
  });

  it('US-007-01 una fecha válida emite su destino conservando la hora', () => {
    const { date, choose } = render();
    const input = date() as HTMLInputElement;
    input.value = '2026-11-20';
    input.dispatchEvent(new Event('change'));
    expect(choose).toHaveBeenCalledWith({ dueDate: '2026-11-20', dueTime: '09:00' });
  });

  it('US-007-01 una fecha no posterior no se acepta y se explica', () => {
    const { fixture, date, choose, text } = render();
    const input = date() as HTMLInputElement;
    input.value = '2026-11-14';
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(choose).not.toHaveBeenCalled();
    expect(text()).toContain(TestBed.inject(PostponeConstructorService).sheet.customPast);
  });

  it('US-007-01 cerrar sin elegir emite dismiss y no cambia nada', () => {
    const { el, choose, dismiss } = render();
    el.querySelector<HTMLButtonElement>('button.close')?.click();
    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(choose).not.toHaveBeenCalled();
  });

  it('US-007-01 tocar fuera de la hoja la cierra; tocar dentro, no', () => {
    const { el, dismiss } = render();
    el.querySelector<HTMLElement>('.sheet')?.click();
    expect(dismiss).not.toHaveBeenCalled();
    el.querySelector<HTMLElement>('.backdrop')?.click();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('US-007-01 el botón atrás del sistema cierra la hoja', () => {
    const { fixture, dismiss } = render();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(dismiss).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('US-007-01 es un diálogo modal accesible y sin elementos de prototipo', () => {
    const { el, text } = render();
    const dialog = el.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(text()).not.toMatch(/simulador|misi[óo]n|XP|racha|Asignar fecha/i);
  });

  it('US-007-01 usa ChangeDetectionStrategy.OnPush', () => {
    expect((PostponeSheet as unknown as ComponentDef).ɵcmp.onPush).toBe(true);
  });
});
