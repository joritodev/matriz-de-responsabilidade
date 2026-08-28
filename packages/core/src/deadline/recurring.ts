import { addCalendarDays, isBusinessDay, type CivilDate } from "./calendar";

export type RecurrenceConfig = {
  nth: number;
  unit: "BUSINESS_DAY";
  period: "MONTH";
  startPolicy?: "CURRENT_PERIOD" | "NEXT_PERIOD";
};

export type MaterializedOccurrence = {
  periodStart: CivilDate;
  periodEnd: CivilDate;
  dueDate: CivilDate;
  explanation: Record<string, unknown>;
};

export function lastDayOfMonth(year: number, month: number): CivilDate {
  const d = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  return d.toISOString().slice(0, 10);
}

export function periodBounds(year: number, month: number): { periodStart: CivilDate; periodEnd: CivilDate } {
  return {
    periodStart: `${year}-${String(month).padStart(2, "0")}-01`,
    periodEnd: lastDayOfMonth(year, month),
  };
}

export function addCalendarMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function nthBusinessDayOfMonth(
  year: number,
  month: number,
  nth: number,
  holidays: CivilDate[],
): CivilDate {
  if (nth <= 0) {
    throw new Error("nth must be positive");
  }
  const { periodStart, periodEnd } = periodBounds(year, month);
  let count = 0;
  let current = periodStart;
  while (current <= periodEnd) {
    if (isBusinessDay(current, holidays)) {
      count += 1;
      if (count === nth) return current;
    }
    current = addCalendarDays(current, 1);
  }
  throw new Error(`Month ${year}-${String(month).padStart(2, "0")} has fewer than ${nth} business days`);
}

export function materializeMonthlyOccurrence(
  year: number,
  month: number,
  nth: number,
  holidays: CivilDate[],
): MaterializedOccurrence {
  const bounds = periodBounds(year, month);
  const dueDate = nthBusinessDayOfMonth(year, month, nth, holidays);
  return {
    ...bounds,
    dueDate,
    explanation: {
      type: "RECURRING_BUSINESS_DAY",
      nth,
      period: "MONTH",
      year,
      month,
      dueDate,
      periodStart: bounds.periodStart,
      periodEnd: bounds.periodEnd,
    },
  };
}

export function resolveInitialPeriod(
  today: CivilDate,
  nth: number,
  holidays: CivilDate[],
  startPolicy: "CURRENT_PERIOD" | "NEXT_PERIOD" = "CURRENT_PERIOD",
): { year: number; month: number } {
  const [year, month] = today.split("-").map(Number);
  if (!year || !month) throw new Error(`Invalid civil date: ${today}`);
  if (startPolicy === "CURRENT_PERIOD") {
    return { year, month };
  }
  const { dueDate } = materializeMonthlyOccurrence(year, month, nth, holidays);
  if (today > dueDate) {
    return addCalendarMonth(year, month, 1);
  }
  return { year, month };
}

export function nextPeriod(year: number, month: number): { year: number; month: number } {
  return addCalendarMonth(year, month, 1);
}

export function periodFromStart(periodStart: CivilDate): { year: number; month: number } {
  const [year, month] = periodStart.split("-").map(Number);
  if (!year || !month) throw new Error(`Invalid period start: ${periodStart}`);
  return { year, month };
}
