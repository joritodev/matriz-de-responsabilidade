import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  materializeMonthlyOccurrence,
  nextPeriod,
  periodFromStart,
  resolveInitialPeriod,
  type RecurrenceConfig,
} from "@matriz/core";
import { deadlineOccurrences, deadlineRules, tasks, type Database } from "@matriz/db";

type Tx = Pick<Database, "insert" | "update" | "select">;

export function parseRecurrenceConfig(raw: unknown): RecurrenceConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const config = raw as Record<string, unknown>;
  if (config.period !== "MONTH" || config.unit !== "BUSINESS_DAY") return null;
  const nth = Number(config.nth);
  if (!nth || nth <= 0) return null;
  return {
    nth,
    unit: "BUSINESS_DAY",
    period: "MONTH",
    startPolicy:
      config.startPolicy === "NEXT_PERIOD" ? "NEXT_PERIOD" : "CURRENT_PERIOD",
  };
}

export async function createInitialOccurrence(
  tx: Tx,
  input: {
    taskId: string;
    ruleId: string;
    nth: number;
    holidays: string[];
    today: string;
    startPolicy?: "CURRENT_PERIOD" | "NEXT_PERIOD";
  },
) {
  const { year, month } = resolveInitialPeriod(
    input.today,
    input.nth,
    input.holidays,
    input.startPolicy ?? "CURRENT_PERIOD",
  );
  const materialized = materializeMonthlyOccurrence(year, month, input.nth, input.holidays);
  await tx.insert(deadlineOccurrences).values({
    id: uuidv7(),
    taskId: input.taskId,
    deadlineRuleId: input.ruleId,
    periodStart: materialized.periodStart,
    periodEnd: materialized.periodEnd,
    dueDate: materialized.dueDate,
    status: "OPEN",
    explanation: materialized.explanation,
  });
  return materialized;
}

export async function completeRecurringPeriod(
  tx: Tx,
  input: {
    taskId: string;
    ruleId: string;
    userId: string;
    holidays: string[];
    recurrenceConfig: RecurrenceConfig;
  },
) {
  const [open] = await tx
    .select()
    .from(deadlineOccurrences)
    .where(and(eq(deadlineOccurrences.taskId, input.taskId), eq(deadlineOccurrences.status, "OPEN")))
    .limit(1);
  if (!open) {
    throw new Error("OPEN_OCCURRENCE_MISSING");
  }

  await tx
    .update(deadlineOccurrences)
    .set({
      status: "COMPLETED",
      completedAt: new Date(),
      completedBy: input.userId,
      updatedAt: new Date(),
    })
    .where(eq(deadlineOccurrences.id, open.id));

  const current = periodFromStart(open.periodStart);
  const upcoming = nextPeriod(current.year, current.month);
  const nextMaterialized = materializeMonthlyOccurrence(
    upcoming.year,
    upcoming.month,
    input.recurrenceConfig.nth,
    input.holidays,
  );

  await tx.insert(deadlineOccurrences).values({
    id: uuidv7(),
    taskId: input.taskId,
    deadlineRuleId: input.ruleId,
    periodStart: nextMaterialized.periodStart,
    periodEnd: nextMaterialized.periodEnd,
    dueDate: nextMaterialized.dueDate,
    status: "OPEN",
    explanation: nextMaterialized.explanation,
  });

  const [taskRow] = await tx.select().from(tasks).where(eq(tasks.id, input.taskId)).limit(1);

  await tx
    .update(deadlineRules)
    .set({
      calculatedDueDate: nextMaterialized.dueDate,
      explanation: nextMaterialized.explanation,
      computedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(deadlineRules.id, input.ruleId));

  await tx
    .update(tasks)
    .set({
      baseStatus: "PENDING",
      originalDueDate: taskRow?.originalDueDate ?? open.dueDate,
      currentDueDate: nextMaterialized.dueDate,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, input.taskId));

  return nextMaterialized;
}
