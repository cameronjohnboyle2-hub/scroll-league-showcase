const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string): void {
  if (!isIsoDate(value)) throw new Error(`Invalid ISO date: ${value}`);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toLocalDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDays(localDate: string, days: number): string {
  assertIsoDate(localDate);
  const date = new Date(`${localDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  assertIsoDate(a);
  assertIsoDate(b);
  return a.localeCompare(b);
}

export function dateRange(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(startDate, index));
}

export function formatShortDate(localDate: string): string {
  assertIsoDate(localDate);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${localDate}T12:00:00.000Z`)
  );
}

export function formatWeekday(localDate: string): string {
  assertIsoDate(localDate);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${localDate}T12:00:00.000Z`)
  );
}
