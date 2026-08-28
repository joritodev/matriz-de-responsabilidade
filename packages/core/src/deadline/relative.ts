import { addBusinessDays, addCalendarDaysExclusive, type CivilDate } from "./calendar";

export type MaterializedRelativeDeadline = {
  originalDueDate: CivilDate | null;
  currentDueDate: CivilDate | null;
  waitingForTrigger: boolean;
};

export function civilDateFromInstant(iso: string, timeZone = "America/Sao_Paulo"): CivilDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function materializeBusinessDaysAfterCreation(
  anchor: CivilDate,
  amount: number,
  holidays: CivilDate[],
): MaterializedRelativeDeadline {
  if (amount <= 0) {
    throw new Error("amount must be positive");
  }
  const due = addBusinessDays(anchor, amount, holidays);
  return {
    originalDueDate: due,
    currentDueDate: due,
    waitingForTrigger: false,
  };
}

export function materializeBusinessDaysAfterDependency(
  triggerCompletedAt: string | Date | null | undefined,
  amount: number,
  holidays: CivilDate[],
  timeZone = "America/Sao_Paulo",
): MaterializedRelativeDeadline {
  if (amount <= 0) {
    throw new Error("amount must be positive");
  }
  if (!triggerCompletedAt) {
    return {
      originalDueDate: null,
      currentDueDate: null,
      waitingForTrigger: true,
    };
  }
  const anchor =
    triggerCompletedAt instanceof Date
      ? civilDateFromInstant(triggerCompletedAt.toISOString(), timeZone)
      : civilDateFromInstant(triggerCompletedAt, timeZone);
  const due = addBusinessDays(anchor, amount, holidays);
  return {
    originalDueDate: due,
    currentDueDate: due,
    waitingForTrigger: false,
  };
}

/** Âncora = data civil da última conclusão validada quando todas as dependências estão COMPLETED. */
export function resolveDependencyTriggerInstant(
  predecessors: { baseStatus: string; completedAt: string | Date | null | undefined }[],
): string | Date | null {
  if (predecessors.length === 0) return null;
  if (!predecessors.every((p) => p.baseStatus === "COMPLETED" && p.completedAt)) return null;
  let latest: Date | null = null;
  for (const pred of predecessors) {
    const at = pred.completedAt instanceof Date ? pred.completedAt : new Date(pred.completedAt!);
    if (!latest || at > latest) latest = at;
  }
  return latest;
}

export function materializeCalendarDaysAfterTrigger(
  triggerCompletedAt: string | Date | null | undefined,
  amount: number,
  timeZone = "America/Sao_Paulo",
): MaterializedRelativeDeadline {
  if (amount <= 0) {
    throw new Error("amount must be positive");
  }
  if (!triggerCompletedAt) {
    return {
      originalDueDate: null,
      currentDueDate: null,
      waitingForTrigger: true,
    };
  }
  const anchor =
    triggerCompletedAt instanceof Date
      ? civilDateFromInstant(triggerCompletedAt.toISOString(), timeZone)
      : civilDateFromInstant(triggerCompletedAt, timeZone);
  const due = addCalendarDaysExclusive(anchor, amount);
  return {
    originalDueDate: due,
    currentDueDate: due,
    waitingForTrigger: false,
  };
}
