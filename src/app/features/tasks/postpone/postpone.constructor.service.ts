import { Injectable, inject } from '@angular/core';
import { Task } from '../../../core/models/task';
import { addDays, parseLocalDay, toLocalDay } from '../../../core/utils/local-date';
import { TasksConstructorService } from '../tasks.constructor.service';

export type PostponeOption = 'later-today' | 'tomorrow' | 'next-week' | 'custom';

export interface PostponeTarget {
  readonly dueDate: string;
  readonly dueTime: string | null;
}

export interface PostponeChoice {
  readonly option: Exclude<PostponeOption, 'custom'>;
  readonly target: PostponeTarget;
  /** «Más tarde hoy», «Mañana», «La semana que viene». */
  readonly label: string;
  /** «hoy a las 17:30», «Sábado, 15 de noviembre · a las 09:00». */
  readonly detail: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Clave comparable de (fecha, hora); sin hora cuenta solo la fecha. */
const key = (date: string, time: string | null): string => `${date} ${time ?? ''}`;

/** Reglas de posponer: opciones válidas, mínimo del selector de fecha, contador y textos. */
@Injectable({ providedIn: 'root' })
export class PostponeConstructorService {
  private readonly tasks = inject(TasksConstructorService);

  readonly sheet = {
    title: 'Posponer tarea',
    action: 'Posponer',
    close: 'Cerrar',
    custom: 'Elegir fecha',
    customDetail: 'Elige un día en el calendario',
    customPast: 'Elige un día posterior al actual de la tarea.',
  } as const;

  readonly failNotice = 'No se pudo posponer la tarea. Inténtalo de nuevo.';

  /** Solo las opciones que posponen de verdad (destino estrictamente posterior). */
  choices(task: Task, now: Date): PostponeChoice[] {
    const today = toLocalDay(now);
    const result: PostponeChoice[] = [];

    if (task.dueTime !== null && task.dueDate !== null && task.dueDate <= today) {
      const soon = new Date(now.getTime() + 60 * 60 * 1000);
      const target = {
        dueDate: toLocalDay(soon),
        dueTime: `${pad(soon.getHours())}:${pad(soon.getMinutes())}`,
      };
      const when = target.dueDate === today ? 'hoy' : 'mañana';
      result.push({
        option: 'later-today',
        target,
        label: 'Más tarde hoy',
        detail: `${when} a las ${target.dueTime}`,
      });
    }

    const tomorrow = addDays(today, 1);
    const daysToMonday = (1 - parseLocalDay(today).getDay() + 7) % 7 || 7;
    const nextMonday = addDays(today, daysToMonday);
    result.push(
      this.dayChoice('tomorrow', 'Mañana', tomorrow, task),
      this.dayChoice('next-week', 'La semana que viene', nextMonday, task)
    );

    return result.filter((c) => this.isLater(task, c.target));
  }

  /** Primer día que admite el selector: hoy si está atrasada o sin fecha; si no, el siguiente a su fecha. */
  customMin(task: Task, now: Date): string {
    const today = toLocalDay(now);
    return task.dueDate === null || task.dueDate < today ? today : addDays(task.dueDate, 1);
  }

  /** Destino del selector de fecha, o `null` si el día no es posterior (o no hay día). */
  customTarget(task: Task, day: string, now: Date): PostponeTarget | null {
    if (day === '' || day < this.customMin(task, now)) return null;
    return { dueDate: day, dueTime: task.dueTime };
  }

  /** Sube el contador solo si la tarea ya tenía fecha y pasa a algo posterior. */
  countsAsPostponed(task: Task, target: PostponeTarget): boolean {
    return task.dueDate !== null && this.isLater(task, target);
  }

  noticeText(target: PostponeTarget, now: Date): string {
    const today = toLocalDay(now);
    const at = target.dueTime === null ? '' : ` a las ${target.dueTime}`;
    if (target.dueDate === today)
      return target.dueTime === null ? 'Tarea pospuesta a hoy' : `Tarea pospuesta${at}`;
    if (target.dueDate === addDays(today, 1)) return `Tarea pospuesta a Mañana${at}`;
    const day = this.tasks.dayLabel(target.dueDate);
    return `Tarea pospuesta al ${day.charAt(0).toLowerCase()}${day.slice(1)}${at}`;
  }

  private dayChoice(
    option: 'tomorrow' | 'next-week',
    label: string,
    day: string,
    task: Task
  ): PostponeChoice {
    const dueTime = task.dueDate === null ? null : task.dueTime;
    const base = this.tasks.dayLabel(day);
    return {
      option,
      target: { dueDate: day, dueTime },
      label,
      detail: dueTime === null ? base : `${base} · a las ${dueTime}`,
    };
  }

  /** El destino es estrictamente posterior a (fecha, hora) de la tarea; sin fecha, siempre. */
  private isLater(task: Task, target: PostponeTarget): boolean {
    if (task.dueDate === null) return true;
    if (task.dueTime === null) return target.dueDate > task.dueDate;
    return key(target.dueDate, target.dueTime) > key(task.dueDate, task.dueTime);
  }
}
