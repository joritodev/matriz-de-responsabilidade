import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  attentionRank,
  computeDeadlineStatus,
  isMatrixActive,
  projectObservations,
  type BaseStatus,
  type DeadlineStatus,
  type MatrixType,
} from "@matriz/core";
import {
  auditLogs,
  businessCalendars,
  deadlineRules,
  holidays,
  matrices,
  responsibles,
  systemSettings,
  taskDependencies,
  taskNotes,
  taskResponsibles,
  tasks,
  taskStatusHistory,
} from "@matriz/db";
import { getDb } from "./db";
import { todayCivil } from "./dates";

export type TaskRow = {
  id: string;
  matrixId: string;
  matrixName: string;
  sequenceNumber: number;
  displayOrder: number;
  title: string;
  description: string | null;
  baseStatus: BaseStatus;
  extensionStatus: "NONE" | "REQUESTED" | "APPROVED" | "REJECTED";
  originalDueDate: string | null;
  currentDueDate: string | null;
  deadlineType: string | null;
  deadlineStatus: DeadlineStatus;
  responsibles: { id: string; name: string }[];
  prerequisites: { id: string; sequenceNumber: number; title: string; status: BaseStatus }[];
  observations: string[];
  completedAt: string | null;
};

async function holidayDates(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ observedOn: holidays.observedOn }).from(holidays);
  return rows.map((r) => r.observedOn);
}

async function dueSoonDays(): Promise<number> {
  const db = getDb();
  const row = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "due_soon_business_days"))
    .limit(1);
  const value = row[0]?.value;
  return typeof value === "number" ? value : 3;
}

export async function listMatrices(includeArchived: boolean) {
  const db = getDb();
  const rows = await db.select().from(matrices).orderBy(asc(matrices.name));
  const allTasks = await db.select().from(tasks);
  const holidaysList = await holidayDates();
  const soon = await dueSoonDays();
  const today = todayCivil();

  return rows
    .filter((m) => includeArchived || isMatrixActive(m.archivedAt))
    .map((m) => {
      const matrixTasks = allTasks.filter((t) => t.matrixId === m.id && t.baseStatus !== "CANCELLED");
      const withStatus = matrixTasks.map((t) => ({
        t,
        deadlineStatus: computeDeadlineStatus({
          baseStatus: t.baseStatus as BaseStatus,
          currentDueDate: t.currentDueDate,
          today,
          holidays: holidaysList,
          dueSoonBusinessDays: soon,
        }),
      }));
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        type: m.type as MatrixType,
        archivedAt: m.archivedAt,
        active: isMatrixActive(m.archivedAt),
        updatedAt: m.updatedAt,
        taskCount: matrixTasks.length,
        overdue: withStatus.filter((x) => x.deadlineStatus === "OVERDUE").length,
        dueToday: withStatus.filter((x) => x.deadlineStatus === "DUE_TODAY").length,
        blocked: matrixTasks.filter((t) => t.baseStatus === "BLOCKED").length,
      };
    });
}

export async function getMatrix(id: string) {
  const db = getDb();
  const rows = await db.select().from(matrices).where(eq(matrices.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listResponsibles() {
  const db = getDb();
  return db.select().from(responsibles).orderBy(asc(responsibles.name));
}

export async function getResponsible(id: string) {
  const db = getDb();
  const rows = await db.select().from(responsibles).where(eq(responsibles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function loadTaskRows(matrixId?: string): Promise<TaskRow[]> {
  const db = getDb();
  const taskRows = matrixId
    ? await db.select().from(tasks).where(eq(tasks.matrixId, matrixId)).orderBy(asc(tasks.displayOrder), asc(tasks.sequenceNumber))
    : await db.select().from(tasks).orderBy(asc(tasks.displayOrder), asc(tasks.sequenceNumber));

  if (taskRows.length === 0) return [];

  const ids = taskRows.map((t) => t.id);
  const matrixIds = [...new Set(taskRows.map((t) => t.matrixId))];
  const matrixRows = await db.select().from(matrices).where(inArray(matrices.id, matrixIds));
  const matrixName = new Map(matrixRows.map((m) => [m.id, m.name]));

  const rules = await db.select().from(deadlineRules).where(inArray(deadlineRules.taskId, ids));
  const ruleByTask = new Map(rules.map((r) => [r.taskId, r]));

  const assigns = await db
    .select({
      taskId: taskResponsibles.taskId,
      id: responsibles.id,
      name: responsibles.name,
      active: taskResponsibles.active,
    })
    .from(taskResponsibles)
    .innerJoin(responsibles, eq(responsibles.id, taskResponsibles.responsibleId))
    .where(and(inArray(taskResponsibles.taskId, ids), eq(taskResponsibles.active, true)));

  const deps = await db.select().from(taskDependencies).where(inArray(taskDependencies.taskId, ids));
  const predIds = [...new Set(deps.map((d) => d.dependsOnTaskId))];
  const predRows = predIds.length
    ? await db.select().from(tasks).where(inArray(tasks.id, predIds))
    : [];
  const predById = new Map(predRows.map((t) => [t.id, t]));

  const notes = await db
    .select()
    .from(taskNotes)
    .where(and(inArray(taskNotes.taskId, ids), isNull(taskNotes.deletedAt)))
    .orderBy(desc(taskNotes.createdAt));

  const holidaysList = await holidayDates();
  const soon = await dueSoonDays();
  const today = todayCivil();

  return taskRows.map((t) => {
    const deadlineStatus = computeDeadlineStatus({
      baseStatus: t.baseStatus as BaseStatus,
      currentDueDate: t.currentDueDate,
      today,
      holidays: holidaysList,
      dueSoonBusinessDays: soon,
    });
    const prereqs = deps
      .filter((d) => d.taskId === t.id)
      .map((d) => {
        const pred = predById.get(d.dependsOnTaskId);
        return pred
          ? {
              id: pred.id,
              sequenceNumber: pred.sequenceNumber,
              title: pred.title,
              status: pred.baseStatus as BaseStatus,
            }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const lastNote = notes.find((n) => n.taskId === t.id)?.body ?? null;
    const overdueDays =
      deadlineStatus === "OVERDUE" && t.currentDueDate
        ? Math.max(
            0,
            Math.round(
              (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${t.currentDueDate}T12:00:00Z`)) /
                86400000,
            ),
          )
        : 0;
    return {
      id: t.id,
      matrixId: t.matrixId,
      matrixName: matrixName.get(t.matrixId) ?? "",
      sequenceNumber: t.sequenceNumber,
      displayOrder: t.displayOrder,
      title: t.title,
      description: t.description,
      baseStatus: t.baseStatus as BaseStatus,
      extensionStatus: t.extensionStatus as TaskRow["extensionStatus"],
      originalDueDate: t.originalDueDate,
      currentDueDate: t.currentDueDate,
      deadlineType: ruleByTask.get(t.id)?.deadlineType ?? null,
      deadlineStatus,
      responsibles: assigns
        .filter((a) => a.taskId === t.id)
        .map((a) => ({ id: a.id, name: a.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      prerequisites: prereqs,
      observations: projectObservations({
        sequenceNumber: t.sequenceNumber,
        baseStatus: t.baseStatus as BaseStatus,
        deadlineStatus,
        extensionStatus: t.extensionStatus as TaskRow["extensionStatus"],
        blockedBySequenceNumbers: prereqs.filter((p) => p.status !== "COMPLETED").map((p) => p.sequenceNumber),
        completedAt: t.completedAt?.toISOString() ?? null,
        overdueBusinessDays: overdueDays,
        lastNote,
      }),
      completedAt: t.completedAt?.toISOString() ?? null,
    };
  });
}

export async function getTaskDetail(taskId: string) {
  const rows = await loadTaskRows();
  const task = rows.find((t) => t.id === taskId);
  if (!task) return null;
  const db = getDb();
  const history = await db
    .select()
    .from(taskStatusHistory)
    .where(eq(taskStatusHistory.taskId, taskId))
    .orderBy(desc(taskStatusHistory.createdAt));
  const audits = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "Task"), eq(auditLogs.entityId, taskId)))
    .orderBy(desc(auditLogs.createdAt));
  const notes = await db
    .select()
    .from(taskNotes)
    .where(and(eq(taskNotes.taskId, taskId), isNull(taskNotes.deletedAt)))
    .orderBy(desc(taskNotes.createdAt));
  const rule = await db.select().from(deadlineRules).where(eq(deadlineRules.taskId, taskId)).limit(1);
  return { task, history, audits, notes, rule: rule[0] ?? null };
}

export async function dashboardSummary() {
  const rows = await loadTaskRows();
  const open = rows.filter((t) => t.baseStatus !== "COMPLETED" && t.baseStatus !== "CANCELLED");
  const ranked = [...open].sort((a, b) => attentionRank(a) - attentionRank(b) || a.sequenceNumber - b.sequenceNumber);
  return {
    dueToday: open.filter((t) => t.deadlineStatus === "DUE_TODAY").length,
    dueSoon: open.filter((t) => t.deadlineStatus === "DUE_SOON").length,
    overdue: open.filter((t) => t.deadlineStatus === "OVERDUE").length,
    blocked: open.filter((t) => t.baseStatus === "BLOCKED").length,
    waitingValidation: open.filter((t) => t.baseStatus === "WAITING_FOR_VALIDATION").length,
    attention: ranked.slice(0, 8),
  };
}

export async function listAudit(limit = 40) {
  const db = getDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function getDefaultCalendarId() {
  const db = getDb();
  const row = await db
    .select()
    .from(businessCalendars)
    .where(eq(businessCalendars.isDefault, true))
    .limit(1);
  if (!row[0]) throw new Error("Calendário padrão ausente — rode o seed");
  return row[0].id;
}

export async function pingDatabase(): Promise<boolean> {
  const db = getDb();
  await db.execute(sql`SELECT 1`);
  return true;
}
