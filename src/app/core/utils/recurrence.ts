import { INTERVAL_MAX, INTERVAL_MIN, Recurrence } from '../models/recurrence';
import { addDays, daysBetween, daysInMonth, weekdayOf } from './local-date';

/** Días que se recorren como máximo buscando una ocurrencia (cubre «cada 30 semanas»: 210 días). */
const SEARCH_DAYS = 400;

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const isInteger = (value: number): boolean => Number.isInteger(value);

/** Una regla coherente: sin campos de otro tipo, intervalos y días en rango y fin no anterior al inicio. */
export function isRecurrenceValid(rule: Recurrence): boolean {
  if (!DAY_FORMAT.test(rule.startDate)) return false;
  if (rule.until !== null && (!DAY_FORMAT.test(rule.until) || rule.until < rule.startDate)) {
    return false;
  }
  if (!isInteger(rule.interval) || rule.interval < INTERVAL_MIN || rule.interval > INTERVAL_MAX) {
    return false;
  }
  switch (rule.kind) {
    case 'daily':
      return rule.weekdays.length === 0 && rule.monthDay === null;
    case 'weekly':
      return (
        rule.monthDay === null &&
        rule.weekdays.length >= 1 &&
        new Set(rule.weekdays).size === rule.weekdays.length &&
        rule.weekdays.every((d) => isInteger(d) && d >= 1 && d <= 7)
      );
    case 'monthly':
      return (
        rule.interval === 1 &&
        rule.weekdays.length === 0 &&
        rule.monthDay !== null &&
        isInteger(rule.monthDay) &&
        rule.monthDay >= 1 &&
        rule.monthDay <= 31
      );
    default:
      return false;
  }
}

/** ¿Cae la regla en ese día? Ignora `until`. Las semanas empiezan en lunes. */
export function occursOn(rule: Recurrence, day: string): boolean {
  if (day < rule.startDate) return false;
  switch (rule.kind) {
    case 'daily':
      return daysBetween(rule.startDate, day) % rule.interval === 0;
    case 'weekly': {
      if (!rule.weekdays.includes(weekdayOf(day))) return false;
      const startMonday = addDays(rule.startDate, -(weekdayOf(rule.startDate) - 1));
      const dayMonday = addDays(day, -(weekdayOf(day) - 1));
      return (daysBetween(startMonday, dayMonday) / 7) % rule.interval === 0;
    }
    case 'monthly': {
      const target = Math.min(rule.monthDay ?? 0, daysInMonth(day));
      return Number(day.slice(8, 10)) === target;
    }
    default:
      return false;
  }
}

/** Primer día válido >= `from` (y >= `startDate`), o `null` si no hay (pasa de `until`, regla inválida). */
export function firstOnOrAfter(rule: Recurrence, from: string): string | null {
  if (!isRecurrenceValid(rule)) return null;
  let day = from < rule.startDate ? rule.startDate : from;
  for (let i = 0; i < SEARCH_DAYS; i += 1) {
    if (rule.until !== null && day > rule.until) return null;
    if (occursOn(rule, day)) return day;
    day = addDays(day, 1);
  }
  return null;
}

/** Siguiente ocurrencia tras `occurrence`: primer día válido posterior a esa fecha y no anterior a `today`. */
export function nextAfter(rule: Recurrence, occurrence: string, today: string): string | null {
  const afterOccurrence = addDays(occurrence, 1);
  return firstOnOrAfter(rule, afterOccurrence > today ? afterOccurrence : today);
}
