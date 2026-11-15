import { Injectable } from '@angular/core';
import { Recurrence } from '../../../core/models/recurrence';
import { parseLocalDay, weekdayOf } from '../../../core/utils/local-date';
import { firstOnOrAfter } from '../../../core/utils/recurrence';

export type FrequencyOption = 'none' | 'daily' | 'weekdays';

/** Lo que se está configurando en la hoja, antes de convertirlo en regla. */
export interface RecurrenceDraft {
  readonly option: FrequencyOption;
  readonly interval: number;
  /** 1 = lunes … 7 = domingo. */
  readonly weekdays: readonly number[];
  readonly monthDay: number;
  readonly until: string | null;
}

export interface DayOption {
  readonly value: number;
  readonly letter: string;
  /** «lunes». */
  readonly name: string;
  /** «Lun». */
  readonly short: string;
}

const DAYS: readonly DayOption[] = [
  { value: 1, letter: 'L', name: 'lunes', short: 'Lun' },
  { value: 2, letter: 'M', name: 'martes', short: 'Mar' },
  { value: 3, letter: 'X', name: 'miércoles', short: 'Mié' },
  { value: 4, letter: 'J', name: 'jueves', short: 'Jue' },
  { value: 5, letter: 'V', name: 'viernes', short: 'Vie' },
  { value: 6, letter: 'S', name: 'sábado', short: 'Sáb' },
  { value: 7, letter: 'D', name: 'domingo', short: 'Dom' },
];

const dayFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** «lunes, miércoles y viernes». */
function joinNatural(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Opciones, textos y reglas de la hoja «Configurar repetición» y del texto de repetición de las tareas. */
@Injectable({ providedIn: 'root' })
export class RecurrenceConstructorService {
  readonly sheet = {
    title: 'Configurar repetición',
    frequency: 'Frecuencia',
    weekdaysLabel: 'Repetir los días',
    weekdaysHelp: 'Elige al menos un día',
    summaryTitle: 'Resumen de repetición',
    discard: 'Descartar',
    done: 'Listo',
    close: 'Cerrar',
  } as const;

  readonly row = {
    label: 'Repetir',
    none: 'No se repite',
    needsDate: 'Elige una fecha para repetir la tarea',
    clearedByDate: 'Sin fecha la tarea ya no se repite.',
    active: 'Activa',
  } as const;

  readonly frequencies: readonly { value: FrequencyOption; label: string }[] = [
    { value: 'none', label: 'No se repite' },
    { value: 'daily', label: 'Todos los días' },
    { value: 'weekdays', label: 'Días de la semana' },
  ];

  readonly days: readonly DayOption[] = DAYS;

  /** Borrador inicial de la hoja: la regla actual o «No se repite» con el día de la fecha marcado. */
  draftFrom(rule: Recurrence | null, firstDay: string): RecurrenceDraft {
    const monthDay = Number(firstDay.slice(8, 10));
    if (rule === null) {
      return {
        option: 'none',
        interval: 1,
        weekdays: [weekdayOf(firstDay)],
        monthDay,
        until: null,
      };
    }
    return {
      option: rule.kind === 'weekly' ? 'weekdays' : 'daily',
      interval: rule.interval,
      weekdays: rule.kind === 'weekly' ? rule.weekdays : [weekdayOf(firstDay)],
      monthDay: rule.monthDay ?? monthDay,
      until: rule.until,
    };
  }

  /** La regla del borrador (`null` = no se repite). `startDate` es la fecha del formulario. */
  toRule(draft: RecurrenceDraft, startDate: string): Recurrence | null {
    switch (draft.option) {
      case 'none':
        return null;
      case 'daily':
        return {
          kind: 'daily',
          interval: 1,
          weekdays: [],
          monthDay: null,
          startDate,
          until: draft.until,
        };
      case 'weekdays':
        return {
          kind: 'weekly',
          interval: 1,
          weekdays: [...draft.weekdays].sort((a, b) => a - b),
          monthDay: null,
          startDate,
          until: draft.until,
        };
    }
  }

  /** Motivo por el que el borrador no se puede aplicar, o `null`. */
  problem(draft: RecurrenceDraft, _startDate: string): string | null {
    if (draft.option === 'weekdays' && draft.weekdays.length === 0) return this.sheet.weekdaysHelp;
    return null;
  }

  /** Texto corto de la regla para la lista y la fila «Repetir»: «Todos los días», «Lun, jue». */
  describe(rule: Recurrence): string {
    if (rule.kind === 'weekly' && rule.weekdays.length < 7) {
      return rule.weekdays
        .map((d, i) => (i === 0 ? DAYS[d - 1].short : DAYS[d - 1].short.toLowerCase()))
        .join(', ');
    }
    return 'Todos los días';
  }

  /** Resumen en lenguaje natural y primera ocurrencia (`null` si no se repite o es inválido). */
  summary(
    draft: RecurrenceDraft,
    startDate: string,
    today: string
  ): { rule: string; first: string } | null {
    const rule = this.toRule(draft, startDate);
    if (rule === null || this.problem(draft, startDate) !== null) return null;
    const first = firstOnOrAfter(rule, startDate > today ? startDate : today);
    if (first === null) return null;
    const text = dayFormat.format(parseLocalDay(first)).replace(',', '');
    const names =
      rule.kind === 'weekly'
        ? `los ${joinNatural(rule.weekdays.map((d) => DAYS[d - 1].name))}`
        : 'todos los días';
    return { rule: `Se repetirá ${names}`, first: `Primera ocurrencia: ${text}` };
  }
}
