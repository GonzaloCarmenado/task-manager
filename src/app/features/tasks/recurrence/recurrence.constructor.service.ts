import { Injectable } from '@angular/core';
import { INTERVAL_MAX, INTERVAL_MIN, Recurrence } from '../../../core/models/recurrence';
import { parseLocalDay, weekdayOf } from '../../../core/utils/local-date';
import { firstOnOrAfter } from '../../../core/utils/recurrence';

export type FrequencyOption = 'none' | 'daily' | 'weekdays' | 'ndays' | 'nweeks' | 'monthly';

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

const monthDayFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' });

/** Opción de la hoja que corresponde a una regla. */
function optionOf(rule: Recurrence): FrequencyOption {
  if (rule.kind === 'monthly') return 'monthly';
  if (rule.kind === 'weekly') return rule.interval > 1 ? 'nweeks' : 'weekdays';
  return rule.interval > 1 ? 'ndays' : 'daily';
}

const dayFormat = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «30 dic». */
function shortDay(day: string): string {
  const [, month, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[month - 1]}`;
}

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
    untilError: 'La fecha de fin no puede ser anterior a la primera ocurrencia',
    every: 'Repetir cada',
    ending: 'Finalización',
    never: 'Nunca',
    neverDetail: 'Sin límite de tiempo',
    onDate: 'El día…',
    onDateDetail: 'Termina en la fecha que elijas',
    endDate: 'Fecha de fin',
    less: 'Menos',
    more: 'Más',
    days: 'días',
    weeks: 'semanas',
    monthDayLabel: 'Día del mes',
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

  /** Hoja «Esta tarea se repite» al editar o borrar una ocurrencia. */
  readonly choice = {
    kicker: 'Repetición',
    title: 'Esta tarea se repite',
    single: 'Solo esta',
    series: 'Toda la serie',
    edit: {
      text: '¿Dónde quieres aplicar los cambios?',
      singleDetail: 'Cambia únicamente esta ocurrencia. La repetición no cambia.',
      seriesDetail:
        'Cambia el título y la hora de la serie, y la ocurrencia pendiente se coloca en su próximo día.',
      cancel: 'Cancelar',
    },
    delete: {
      text: '¿Cómo quieres borrar esta tarea que se repite?',
      singleDetail: 'Borra esta ocurrencia y aparece la siguiente en su día.',
      seriesDetail: 'Borra la ocurrencia pendiente y la tarea deja de repetirse.',
      kept: 'Las ocurrencias ya completadas se conservan.',
      cancel: 'Volver atrás',
    },
  } as const;

  readonly frequencies: readonly { value: FrequencyOption; label: string }[] = [
    { value: 'none', label: 'No se repite' },
    { value: 'daily', label: 'Todos los días' },
    { value: 'weekdays', label: 'Días de la semana' },
    { value: 'ndays', label: 'Cada N días' },
    { value: 'nweeks', label: 'Cada N semanas' },
    { value: 'monthly', label: 'Un día del mes' },
  ];

  readonly intervalMin = INTERVAL_MIN;
  readonly intervalMax = INTERVAL_MAX;

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
      option: optionOf(rule),
      interval: rule.interval,
      weekdays: rule.kind === 'weekly' ? rule.weekdays : [weekdayOf(firstDay)],
      monthDay: rule.monthDay ?? monthDay,
      until: rule.until,
    };
  }

  /** La regla del borrador (`null` = no se repite). `startDate` es la fecha del formulario. */
  toRule(draft: RecurrenceDraft, startDate: string): Recurrence | null {
    const common = { startDate, until: draft.until };
    const days = [...draft.weekdays].sort((a, b) => a - b);
    switch (draft.option) {
      case 'none':
        return null;
      case 'daily':
        return { kind: 'daily', interval: 1, weekdays: [], monthDay: null, ...common };
      case 'ndays':
        return {
          kind: 'daily',
          interval: draft.interval,
          weekdays: [],
          monthDay: null,
          ...common,
        };
      case 'weekdays':
        return { kind: 'weekly', interval: 1, weekdays: days, monthDay: null, ...common };
      case 'nweeks':
        return {
          kind: 'weekly',
          interval: draft.interval,
          weekdays: days,
          monthDay: null,
          ...common,
        };
      case 'monthly':
        return {
          kind: 'monthly',
          interval: 1,
          weekdays: [],
          monthDay: draft.monthDay,
          ...common,
        };
    }
  }

  /** Motivo por el que el borrador no se puede aplicar, o `null`. */
  problem(draft: RecurrenceDraft, startDate: string): string | null {
    if (draft.option === 'none') return null;
    const needsDays = draft.option === 'weekdays' || draft.option === 'nweeks';
    if (needsDays && draft.weekdays.length === 0) return this.sheet.weekdaysHelp;
    if (draft.until !== null) {
      const rule = this.toRule(draft, startDate);
      const first = rule === null ? null : firstOnOrAfter({ ...rule, until: null }, startDate);
      if (first === null || draft.until < first) return this.sheet.untilError;
    }
    return null;
  }

  /** Aviso del día del mes cuando algún mes no lo tiene (29, 30 o 31). */
  monthHint(draft: RecurrenceDraft): string | null {
    if (draft.option !== 'monthly' || draft.monthDay < 29) return null;
    return 'En los meses que no tengan ese día, será el último día del mes.';
  }

  /** Texto corto de la regla: «Todos los días», «Lun, jue», «Cada 2 semanas: vie», «El día 15 de cada mes». */
  describe(rule: Recurrence): string {
    const base = this.describeBase(rule);
    return rule.until === null ? base : `${base} · hasta ${shortDay(rule.until)}`;
  }

  private describeBase(rule: Recurrence): string {
    if (rule.kind === 'monthly') return `El día ${rule.monthDay} de cada mes`;
    if (rule.kind === 'weekly') {
      if (rule.interval > 1) {
        const days = rule.weekdays.map((d) => DAYS[d - 1].short.toLowerCase()).join(', ');
        return `Cada ${rule.interval} semanas: ${days}`;
      }
      if (rule.weekdays.length < 7) {
        return rule.weekdays
          .map((d, i) => (i === 0 ? DAYS[d - 1].short : DAYS[d - 1].short.toLowerCase()))
          .join(', ');
      }
      return 'Todos los días';
    }
    return rule.interval > 1 ? `Cada ${rule.interval} días` : 'Todos los días';
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
    const until =
      rule.until === null ? '' : `, hasta el ${monthDayFormat.format(parseLocalDay(rule.until))}`;
    return {
      rule: `Se repetirá ${this.sentence(rule)}${until}`,
      first: `Primera ocurrencia: ${text}`,
    };
  }

  private sentence(rule: Recurrence): string {
    if (rule.kind === 'monthly') return `el día ${rule.monthDay} de cada mes`;
    if (rule.kind === 'weekly') {
      const names = joinNatural(rule.weekdays.map((d) => DAYS[d - 1].name));
      return rule.interval > 1 ? `cada ${rule.interval} semanas, los ${names}` : `los ${names}`;
    }
    return rule.interval > 1 ? `cada ${rule.interval} días` : 'todos los días';
  }
}
