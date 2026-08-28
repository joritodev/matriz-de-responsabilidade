export type CivilDate = string;

function parseCivil(date: CivilDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid civil date: ${date}`);
  }
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function formatCivil(date: Date): CivilDate {
  return date.toISOString().slice(0, 10);
}

function addCalendarDays(date: CivilDate, days: number): CivilDate {
  const d = parseCivil(date);
  d.setUTCDate(d.getUTCDate() + days);
  return formatCivil(d);
}

export function isWeekend(date: CivilDate): boolean {
  const day = parseCivil(date).getUTCDay();
  return day === 0 || day === 6;
}

export function isBusinessDay(date: CivilDate, holidays: CivilDate[]): boolean {
  if (isWeekend(date)) return false;
  return !holidays.includes(date);
}

export function addBusinessDays(start: CivilDate, amount: number, holidays: CivilDate[]): CivilDate {
  if (amount === 0) return start;
  const step = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  let current = start;
  while (remaining > 0) {
    current = addCalendarDays(current, step);
    if (isBusinessDay(current, holidays)) remaining -= 1;
  }
  return current;
}

export function businessDaysBetween(from: CivilDate, to: CivilDate, holidays: CivilDate[]): number {
  if (from === to) return 0;
  let count = 0;
  let current = from;
  const step = from < to ? 1 : -1;
  while (current !== to) {
    current = addCalendarDays(current, step);
    if (isBusinessDay(current, holidays)) count += 1;
  }
  return step * count;
}
