/**
 * TimeManager — integration point for all date/time operations.
 *
 * Wraps dayjs so the rest of the codebase never imports it directly.
 * If we ever switch to Temporal, luxon, or date-fns, only this file changes.
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/nl';

dayjs.extend(relativeTime);
dayjs.locale('nl');

export type DateInput = string | number | Date | null | undefined;

/**
 * Parse any date-like value into a normalized internal representation.
 * Returns null if the input is invalid or empty.
 */
function parse(input: DateInput) {
  if (!input) return null;
  const d = dayjs(input);
  return d.isValid() ? d : null;
}

/** Format a date for display in the UI (e.g. "27 jul 2026") */
export function formatDate(input: DateInput): string {
  const d = parse(input);
  if (!d) return '';
  return d.format('D MMM YYYY');
}

/** Format a date with time (e.g. "27 jul 2026 14:30") */
export function formatDateTime(input: DateInput): string {
  const d = parse(input);
  if (!d) return '';
  return d.format('D MMM YYYY HH:mm');
}

/** Format as short date (e.g. "27-07-2026") */
export function formatDateShort(input: DateInput): string {
  const d = parse(input);
  if (!d) return '';
  return d.format('DD-MM-YYYY');
}

/** Format as ISO date string (YYYY-MM-DD) — for frontmatter storage */
export function formatISO(input: DateInput): string {
  const d = parse(input);
  if (!d) return '';
  return d.format('YYYY-MM-DD');
}

/** Format as relative time (e.g. "3 dagen geleden") */
export function formatRelative(input: DateInput): string {
  const d = parse(input);
  if (!d) return '';
  return d.fromNow();
}

/** Check if a date is within the last N days */
export function isWithinDays(input: DateInput, days: number): boolean {
  const d = parse(input);
  if (!d) return false;
  return dayjs().diff(d, 'day') <= days;
}

/** Check if a date is in the current year */
export function isCurrentYear(input: DateInput): boolean {
  const d = parse(input);
  if (!d) return false;
  return d.year() === dayjs().year();
}

/** Get today as ISO string (YYYY-MM-DD) */
export function today(): string {
  return dayjs().format('YYYY-MM-DD');
}

/** Get current timestamp as ISO string */
export function now(): string {
  return dayjs().toISOString();
}

/** Check if a date input is valid */
export function isValid(input: DateInput): boolean {
  return parse(input) !== null;
}
