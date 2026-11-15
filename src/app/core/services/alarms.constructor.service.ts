import { Injectable } from '@angular/core';
import { ALARM_CHANNEL_ID, AlarmPlan, MAX_ALARMS } from '../models/alarm';
import { Task } from '../models/task';

/** FNV-1a de 32 bits sobre el id de la tarea, limitado a un entero positivo (Android exige un entero). */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash & 0x7fffffff || 1;
}

/** Instante local de una tarea con fecha y hora, o `null` si no tiene ambas. */
function dueInstant(task: Task): Date | null {
  if (task.dueDate === null || task.dueTime === null) return null;
  const [y, m, d] = task.dueDate.split('-').map(Number);
  const [hh, mm] = task.dueTime.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Qué tareas tienen aviso, con qué identificador y con qué textos. Lógica pura y textos estáticos. */
@Injectable({ providedIn: 'root' })
export class AlarmsConstructorService {
  readonly copy = {
    prompt: {
      title: 'Te avisamos a tu hora',
      description:
        'Para avisarte a la hora de tus tareas, necesitamos permiso para enviarte notificaciones.',
      allow: 'Permitir',
      later: 'Ahora no',
    },
    banner: {
      message: 'Las alarmas están desactivadas, así que no te avisaremos a la hora.',
      activate: 'Activar alarmas',
      dismiss: 'Cerrar',
    },
    exact: {
      title: 'Alarmas y recordatorios',
      description:
        'Para sonar a la hora exacta, permite «Alarmas y recordatorios» en los ajustes del móvil. Si no, el aviso puede retrasarse unos minutos.',
      openSettings: 'Ir a ajustes',
      skip: 'Omitir por ahora',
    },
    indicator: {
      scheduled: (time: string): string => `Avisará a las ${time}`,
      none: 'Sin alarma',
    },
    channel: {
      id: ALARM_CHANNEL_ID,
      name: 'Recordatorios',
      description: 'Avisos a la hora de tus tareas',
    },
  } as const;

  notificationId(taskId: string): number {
    return fnv1a(taskId);
  }

  /** Una tarea tiene aviso si está pendiente y su fecha y hora están en el futuro (hora local). */
  hasAlarm(task: Task, now: Date): boolean {
    if (task.completedAt !== null) return false;
    const at = dueInstant(task);
    return at !== null && at.getTime() > now.getTime();
  }

  /** Avisos que deben estar programados: los más próximos, hasta `MAX_ALARMS`, por orden de hora. */
  plan(tasks: readonly Task[], now: Date): AlarmPlan[] {
    return tasks
      .filter((task) => this.hasAlarm(task, now))
      .map((task): AlarmPlan => {
        const at = dueInstant(task) as Date;
        return {
          taskId: task.id,
          notificationId: this.notificationId(task.id),
          at,
          title: task.title,
          body: `Es la hora (${task.dueTime})`,
        };
      })
      .sort((a, b) => a.at.getTime() - b.at.getTime() || a.taskId.localeCompare(b.taskId))
      .slice(0, MAX_ALARMS);
  }
}
