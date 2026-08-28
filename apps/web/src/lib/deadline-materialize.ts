import {
  materializeBusinessDaysAfterCreation,
  materializeBusinessDaysAfterDependency,
  materializeCalendarDaysAfterTrigger,
  materializeFixedDate,
  materializeMonthlyOccurrence,
  resolveDependencyTriggerInstant,
  resolveInitialPeriod,
  type DeadlineType,
} from "@matriz/core";

export type DeadlineMaterialization = {
  originalDueDate: string | null;
  currentDueDate: string | null;
  waitingForTrigger: boolean;
  amount: number | null;
  explanation: Record<string, unknown>;
};

export function materializeDeadlineRule(input: {
  deadlineType: DeadlineType | string;
  fixedDate: string | null;
  businessDays: number | null;
  holidays: string[];
  createdOn: string;
  predecessors: { baseStatus: string; completedAt: Date | string | null | undefined }[];
}): DeadlineMaterialization {
  const { deadlineType, fixedDate, businessDays, holidays, createdOn, predecessors } = input;

  if (deadlineType === "FIXED_DATE" && fixedDate) {
    const dates = materializeFixedDate(fixedDate);
    return {
      ...dates,
      amount: null,
      explanation: { type: "FIXED_DATE", date: dates.currentDueDate, source: "cadastro" },
    };
  }

  if (deadlineType === "BUSINESS_DAYS_AFTER_CREATION" && businessDays) {
    const dates = materializeBusinessDaysAfterCreation(createdOn, businessDays, holidays);
    return {
      ...dates,
      amount: businessDays,
      explanation: {
        type: "BUSINESS_DAYS_AFTER_CREATION",
        amount: businessDays,
        anchor: createdOn,
      },
    };
  }

  if (deadlineType === "BUSINESS_DAYS_AFTER_DEPENDENCY" && businessDays) {
    const trigger = resolveDependencyTriggerInstant(predecessors);
    const dates = materializeBusinessDaysAfterDependency(trigger, businessDays, holidays);
    return {
      ...dates,
      amount: businessDays,
      explanation: {
        type: "BUSINESS_DAYS_AFTER_DEPENDENCY",
        amount: businessDays,
        waitingForTrigger: dates.waitingForTrigger,
        anchor: trigger,
      },
    };
  }

  if (deadlineType === "CALENDAR_DAYS_AFTER_TRIGGER" && businessDays) {
    const trigger = resolveDependencyTriggerInstant(predecessors);
    const dates = materializeCalendarDaysAfterTrigger(trigger, businessDays);
    return {
      ...dates,
      amount: businessDays,
      explanation: {
        type: "CALENDAR_DAYS_AFTER_TRIGGER",
        amount: businessDays,
        waitingForTrigger: dates.waitingForTrigger,
        anchor: trigger,
      },
    };
  }

  if (deadlineType === "RECURRING_BUSINESS_DAY") {
    const nth = businessDays && businessDays > 0 ? businessDays : 3;
    const { year, month } = resolveInitialPeriod(createdOn, nth, holidays);
    const occurrence = materializeMonthlyOccurrence(year, month, nth, holidays);
    return {
      originalDueDate: occurrence.dueDate,
      currentDueDate: occurrence.dueDate,
      waitingForTrigger: false,
      amount: nth,
      explanation: occurrence.explanation,
    };
  }

  return {
    originalDueDate: null,
    currentDueDate: null,
    waitingForTrigger: false,
    amount: null,
    explanation: { type: deadlineType },
  };
}
