import { Injectable, inject } from '@angular/core';
import { TITLE_MAX, Task } from '../../core/models/task';
import { CLOCK } from '../../core/services/clock';
import { addDays, daysBetween, parseLocalDay, toLocalDay } from '../../core/utils/local-date';

export type GroupKind = 'overdue' | 'today' | 'tomorrow' | 'date' | 'none';

export interface TaskGroup {
  readonly kind: GroupKind;
  /** `YYYY-MM-DD` para los días concretos; el propio `kind` en el resto. */
  readonly key: string;
  readonly label: string;
  readonly tasks: readonly Task[];
}

const dayFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const weekdayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'long' });
const shortDateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

const byCreation = (a: Task, b: Task): number => a.createdAt.localeCompare(b.createdAt);

/** Con hora primero (ascendente) y después sin hora, por creación. */
function byDayOrder(a: Task, b: Task): number {
  if (a.dueTime !== null && b.dueTime !== null) {
    return a.dueTime.localeCompare(b.dueTime) || byCreation(a, b);
  }
  if (a.dueTime !== null) return -1;
  if (b.dueTime !== null) return 1;
  return byCreation(a, b);
}

/** Agrupado, orden y textos estáticos de la lista y del formulario de tareas. */
@Injectable({ providedIn: 'root' })
export class TasksConstructorService {
  private readonly clock = inject(CLOCK);

  readonly list = {
    title: 'Tareas',
    newTask: 'Nueva tarea',
    loading: 'Cargando tus tareas…',
    emptyTitle: 'Todo despejado por aquí',
    emptyDescription: 'No tienes tareas pendientes. Apunta la primera y empieza a tacharlas.',
    createFirst: 'Crear primera tarea',
    errorTitle: 'No pudimos cargar tus tareas',
    errorDescription: 'Revisa tu conexión e inténtalo de nuevo.',
    retry: 'Reintentar',
    completedTitle: 'Completadas',
    noCompleted: 'Todavía no has completado ninguna tarea en los últimos 30 días.',
    overdueTag: 'Atrasada',
    markDone: 'Marcar como hecha',
    postpone: 'Posponer',
    markUndone: 'Marcar como pendiente',
    doneNotice: 'Tarea completada',
    undoneNotice: 'Tarea pendiente otra vez',
    failNotice: 'No se pudo guardar el cambio. Inténtalo de nuevo.',
    deleteFailNotice: 'No se pudo borrar la tarea. Inténtalo de nuevo.',
  } as const;

  readonly form = {
    createTitle: 'Nueva tarea',
    editTitle: 'Editar tarea',
    titleLabel: 'Título de la tarea',
    titlePlaceholder: '¿Qué necesitas hacer?',
    titleRequired: 'Escribe un título para tu tarea.',
    titleTooLong: `El título no puede pasar de ${TITLE_MAX} caracteres.`,
    saveBlocked: 'Escribe un título para poder guardar',
    dateLabel: 'Fecha prevista',
    optional: 'opcional',
    today: 'Hoy',
    tomorrow: 'Mañana',
    pickDate: 'Elegir fecha',
    clearDate: 'Quitar fecha',
    noDate: 'Sin fecha',
    timeLabel: 'Hora',
    timeNeedsDate: 'Elige una fecha para poder poner una hora.',
    clearTime: 'Quitar hora',
    save: 'Guardar tarea',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    postpone: 'Posponer',
    delete: 'Borrar tarea',
    deleteTitle: '¿Borrar esta tarea?',
    deleteWarning: 'Esta acción no se puede deshacer.',
    deleteConfirm: 'Sí, borrar',
    deleteCancel: 'No, conservar',
    saveError: 'No se pudo guardar la tarea. Revisa tu conexión e inténtalo de nuevo.',
    deleteError: 'No se pudo borrar la tarea. Revisa tu conexión e inténtalo de nuevo.',
    counter: 'caracteres',
  } as const;

  todayDay(): string {
    return toLocalDay(this.clock());
  }

  tomorrowDay(): string {
    return addDays(this.todayDay(), 1);
  }

  /** Una ocurrencia con fecha posterior a hoy se ve, pero no se puede completar hasta su día. */
  isFuture(task: Task): boolean {
    return (
      task.seriesId !== null &&
      task.completedAt === null &&
      task.dueDate !== null &&
      task.dueDate > this.todayDay()
    );
  }

  /** «Disponible mañana», «Disponible el jueves» (esta semana) o «Disponible el 30 de noviembre». */
  availableLabel(task: Task): string {
    const day = task.dueDate;
    if (day === null) return '';
    if (day === this.tomorrowDay()) return 'Disponible mañana';
    const date = parseLocalDay(day);
    return daysBetween(this.todayDay(), day) <= 6
      ? `Disponible el ${weekdayFormat.format(date)}`
      : `Disponible el ${shortDateFormat.format(date)}`;
  }

  /** Aviso al completar: con serie nombra la próxima ocurrencia (o dice que era la última). */
  completedNotice(next: string | null | undefined): string {
    if (next === undefined) return this.list.doneNotice;
    if (next === null) return 'Hecho. Era la última repetición';
    const text = dayFormat.format(parseLocalDay(next)).replace(',', '');
    return `Hecho. Próxima: ${text}`;
  }

  isOverdue(task: Task): boolean {
    return task.completedAt === null && task.dueDate !== null && task.dueDate < this.todayDay();
  }

  /** «Jueves, 19 de noviembre». */
  dayLabel(day: string): string {
    const text = dayFormat.format(parseLocalDay(day));
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
    return capitalized;
  }

  group(tasks: readonly Task[]): { groups: TaskGroup[]; completed: Task[] } {
    const today = this.todayDay();
    const tomorrow = this.tomorrowDay();
    const pending = tasks.filter((t) => t.completedAt === null);
    const completed = tasks
      .filter((t) => t.completedAt !== null)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

    const overdue = pending
      .filter((t) => t.dueDate !== null && t.dueDate < today)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || byDayOrder(a, b));
    const dayTasks = (day: string): Task[] =>
      pending.filter((t) => t.dueDate === day).sort(byDayOrder);
    const later = [
      ...new Set(
        pending.filter((t) => t.dueDate !== null && t.dueDate > tomorrow).map((t) => t.dueDate)
      ),
    ].sort() as string[];
    const undated = pending.filter((t) => t.dueDate === null).sort(byCreation);

    const groups: TaskGroup[] = [
      { kind: 'overdue', key: 'overdue', label: 'Atrasadas', tasks: overdue },
      { kind: 'today', key: 'today', label: 'Hoy', tasks: dayTasks(today) },
      { kind: 'tomorrow', key: 'tomorrow', label: 'Mañana', tasks: dayTasks(tomorrow) },
      ...later.map((day): TaskGroup => ({
        kind: 'date',
        key: day,
        label: this.dayLabel(day),
        tasks: dayTasks(day),
      })),
      { kind: 'none', key: 'none', label: 'Sin fecha', tasks: undated },
    ];

    return { groups: groups.filter((g) => g.tasks.length > 0), completed };
  }
}
