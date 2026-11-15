import { TestBed } from '@angular/core/testing';
import { MAX_ALARMS } from '../models/alarm';
import { Task } from '../models/task';
import { AlarmsConstructorService } from './alarms.constructor.service';

let seq = 0;
function task(over: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    title: `Tarea ${seq}`,
    dueDate: '2026-11-14',
    dueTime: '11:00',
    completedAt: null,
    createdAt: `2026-11-01T10:${String(seq % 60).padStart(2, '0')}:00.000Z`,
    postponedCount: 0,
    seriesId: null,
    seriesDate: null,
    ...over,
  };
}

const NOW = new Date(2026, 10, 14, 9, 0, 0); // sábado 14 de noviembre de 2026, 09:00

describe('AlarmsConstructorService · plan', () => {
  let service: AlarmsConstructorService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlarmsConstructorService);
  });

  it('US-006-01 programa las tareas pendientes con fecha y hora futuras, en hora local', () => {
    const t = task({ dueDate: '2026-11-14', dueTime: '11:30' });
    const [alarm] = service.plan([t], NOW);

    expect(alarm.taskId).toBe(t.id);
    expect(alarm.at.getFullYear()).toBe(2026);
    expect(alarm.at.getMonth()).toBe(10);
    expect(alarm.at.getDate()).toBe(14);
    expect(alarm.at.getHours()).toBe(11);
    expect(alarm.at.getMinutes()).toBe(30);
  });

  it('US-006-01 no programa tareas sin hora, sin fecha, completadas ni con la hora ya pasada', () => {
    const plan = service.plan(
      [
        task({ dueTime: null }),
        task({ dueDate: null, dueTime: null }),
        task({ completedAt: '2026-11-13T10:00:00.000Z' }),
        task({ dueDate: '2026-11-14', dueTime: '08:59' }),
        task({ dueDate: '2026-11-14', dueTime: '09:00' }), // justo ahora: no es futuro
        task({ dueDate: '2026-11-13', dueTime: '23:00' }),
      ],
      NOW
    );
    expect(plan).toEqual([]);
  });

  it('US-006-01 la hora local manda también a las 23:59 y a las 00:01', () => {
    const late = new Date(2026, 10, 14, 23, 59, 30);
    expect(service.plan([task({ dueDate: '2026-11-15', dueTime: '00:01' })], late)).toHaveLength(1);
    expect(service.plan([task({ dueDate: '2026-11-14', dueTime: '23:59' })], late)).toHaveLength(0);
  });

  it('US-006-01 ordena por hora y limita a 60 avisos', () => {
    const many = Array.from({ length: 70 }, (_, i) =>
      task({
        dueDate: '2026-11-20',
        dueTime: `${String(Math.floor(i / 6) + 8).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}`,
      })
    );
    const plan = service.plan([...many].reverse(), NOW);

    expect(plan).toHaveLength(MAX_ALARMS);
    const times = plan.map((a) => a.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('US-006-01 no modifica la lista recibida', () => {
    const input = [task({ dueTime: '12:00' }), task({ dueTime: '10:00' })];
    const copy = [...input];
    service.plan(input, NOW);
    expect(input).toEqual(copy);
  });

  it('US-006-01 hasAlarm refleja las mismas reglas que el plan', () => {
    expect(service.hasAlarm(task({ dueTime: '11:00' }), NOW)).toBe(true);
    expect(service.hasAlarm(task({ dueTime: null }), NOW)).toBe(false);
    expect(service.hasAlarm(task({ completedAt: '2026-11-13T10:00:00.000Z' }), NOW)).toBe(false);
    expect(service.hasAlarm(task({ dueTime: '08:00' }), NOW)).toBe(false);
  });
});

describe('AlarmsConstructorService · identificador', () => {
  let service: AlarmsConstructorService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlarmsConstructorService);
  });

  it('US-006-01 el identificador es estable, entero y positivo', () => {
    const id = '5f0f6c1e-7a0e-4b52-9f6b-0d2d1c2b3a4f';
    const first = service.notificationId(id);
    expect(service.notificationId(id)).toBe(first);
    expect(Number.isInteger(first)).toBe(true);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThanOrEqual(0x7fffffff);
  });

  it('US-006-01 ids distintos dan identificadores distintos (sin colisiones en una muestra grande)', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      ids.add(service.notificationId(`aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`));
    }
    expect(ids.size).toBe(5000);
  });

  it('US-006-01 el plan lleva el identificador de cada tarea', () => {
    const t = task();
    expect(service.plan([t], NOW)[0].notificationId).toBe(service.notificationId(t.id));
  });
});

describe('AlarmsConstructorService · textos', () => {
  const FORBIDDEN = /\bXP\b|racha|nivel|misi[óo]n|puntos|token|plugin|android|supabase|spam/i;
  let service: AlarmsConstructorService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AlarmsConstructorService);
  });

  it('US-006-03 la notificación lleva el título de la tarea y «Es la hora» con la hora', () => {
    const [alarm] = service.plan([task({ title: 'Llamar al fontanero', dueTime: '16:30' })], NOW);
    expect(alarm.title).toBe('Llamar al fontanero');
    expect(alarm.body).toBe('Es la hora (16:30)');
  });

  it('US-006-02 define los textos del aviso previo, el banner, la hoja exacta y los indicadores', () => {
    const c = service.copy;
    expect(c.prompt.title).toBe('Te avisamos a tu hora');
    expect(c.prompt.allow).toBe('Permitir');
    expect(c.prompt.later).toBe('Ahora no');
    expect(c.banner.message).toContain('desactivadas');
    expect(c.banner.activate).toBe('Activar alarmas');
    expect(c.exact.openSettings).toBe('Ir a ajustes');
    expect(c.exact.skip).toBe('Omitir por ahora');
    expect(c.exact.description).toContain('unos minutos');
    expect(c.indicator.scheduled('11:00')).toBe('Avisará a las 11:00');
    expect(c.indicator.none).toBe('Sin alarma');
    expect(c.channel.id).toBe('reminders');
    expect(c.channel.name).toBe('Recordatorios');
  });

  it('US-006-03 ningún texto habla de XP, rachas ni de términos técnicos ni promete más de lo que hay', () => {
    const c = service.copy;
    const texts = [
      ...Object.values(c.prompt),
      ...Object.values(c.banner),
      ...Object.values(c.exact),
      c.indicator.scheduled('11:00'),
      c.indicator.none,
      c.channel.name,
      c.channel.description,
      service.plan([task({ title: 'x' })], NOW)[0].body,
    ];
    for (const text of texts) {
      expect(text, text).not.toMatch(FORBIDDEN);
    }
  });
});
