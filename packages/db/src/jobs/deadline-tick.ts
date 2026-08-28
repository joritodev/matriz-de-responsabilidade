import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { computeDeadlineStatus, type BaseStatus, type DeadlineStatus } from "@matriz/core";
import { createCorrelationId } from "@matriz/shared";
import type { Database } from "../client";
import { deadlineRules, holidays, inboxItems, systemSettings, tasks } from "../schema/index";

function todayCivil(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const ALERT_STATUSES: DeadlineStatus[] = ["DUE_SOON", "DUE_TODAY", "OVERDUE"];

function alertKind(status: DeadlineStatus): "CRITICAL_OVERDUE" | "OTHER" | null {
  if (status === "OVERDUE") return "CRITICAL_OVERDUE";
  if (status === "DUE_TODAY" || status === "DUE_SOON") return "OTHER";
  return null;
}

function alertTitle(status: DeadlineStatus, taskTitle: string): string {
  if (status === "OVERDUE") return `Atrasada: ${taskTitle}`;
  if (status === "DUE_TODAY") return `Vence hoje: ${taskTitle}`;
  return `Vence em breve: ${taskTitle}`;
}

function shouldAlert(baseStatus: BaseStatus): boolean {
  return baseStatus !== "BLOCKED" && baseStatus !== "COMPLETED" && baseStatus !== "CANCELLED";
}

export type DeadlineTickResult = {
  today: string;
  scanned: number;
  cacheUpdated: number;
  alertsCreated: number;
};

export async function runDeadlineTick(
  db: Database,
  options?: { today?: string },
): Promise<DeadlineTickResult> {
  const today = options?.today ?? todayCivil();
  const holidayRows = await db.select({ observedOn: holidays.observedOn }).from(holidays);
  const holidayList = holidayRows.map((r) => r.observedOn);

  const settingRow = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "due_soon_business_days"))
    .limit(1);
  const dueSoonBusinessDays =
    typeof settingRow[0]?.value === "number" ? (settingRow[0].value as number) : 3;

  const openTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        isNull(tasks.completedAt),
        isNull(tasks.cancelledAt),
        notInArray(tasks.baseStatus, ["COMPLETED", "CANCELLED"]),
      ),
    );

  if (openTasks.length === 0) {
    return { today, scanned: 0, cacheUpdated: 0, alertsCreated: 0 };
  }

  const ids = openTasks.map((t) => t.id);
  const rules = await db.select().from(deadlineRules).where(inArray(deadlineRules.taskId, ids));
  const ruleByTask = new Map(rules.map((r) => [r.taskId, r]));

  let cacheUpdated = 0;
  let alertsCreated = 0;

  for (const task of openTasks) {
    const rule = ruleByTask.get(task.id);
    const newStatus = computeDeadlineStatus({
      baseStatus: task.baseStatus as BaseStatus,
      currentDueDate: task.currentDueDate,
      today,
      holidays: holidayList,
      dueSoonBusinessDays,
      waitingForTrigger: rule?.waitingForTrigger ?? false,
    });

    const oldStatus = (task.cachedDeadlineStatus as DeadlineStatus | null) ?? null;
    const needsCache =
      oldStatus !== newStatus || task.deadlineStatusAsOf !== today || !task.deadlineStatusComputedAt;

    if (needsCache) {
      await db
        .update(tasks)
        .set({
          cachedDeadlineStatus: newStatus,
          deadlineStatusComputedAt: new Date(),
          deadlineStatusAsOf: today,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, task.id));
      cacheUpdated += 1;
    }

    if (!shouldAlert(task.baseStatus as BaseStatus)) continue;
    if (!ALERT_STATUSES.includes(newStatus)) continue;
    if (oldStatus === newStatus) continue;

    const kind = alertKind(newStatus);
    if (!kind) continue;

    const existing = await db
      .select({ id: inboxItems.id })
      .from(inboxItems)
      .where(
        and(
          eq(inboxItems.taskId, task.id),
          eq(inboxItems.kind, kind),
          eq(inboxItems.status, "OPEN"),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(inboxItems).values({
      id: uuidv7(),
      kind,
      status: "OPEN",
      taskId: task.id,
      matrixId: task.matrixId,
      title: alertTitle(newStatus, task.title),
      body: `Status de prazo: ${newStatus}. Prazo vigente: ${task.currentDueDate ?? "indefinido"}.`,
      suggestedAction: newStatus === "OVERDUE" ? "VALIDATE_OR_FOLLOW_UP" : "REVIEW_DEADLINE",
      requiresHumanAction: true,
      correlationId: createCorrelationId(),
    });
    alertsCreated += 1;
  }

  return { today, scanned: openTasks.length, cacheUpdated, alertsCreated };
}
