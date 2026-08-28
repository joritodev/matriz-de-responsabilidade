import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  attentionRank,
  buildDateValidationMessage,
  buildExtensionApprovedToResponsibleText,
  buildExtensionRejectedToResponsibleText,
  buildExtensionRequestToChefsText,
  buildReminderMessage,
  buildWhatsAppChatLink,
  computeDeadlineStatus,
  dateValidationDueLabel,
  dedupeKey,
  formatDeadlineExplanation,
  isMatrixActive,
  planDailyReminders,
  projectObservations,
  type BaseStatus,
  type DeadlineStatus,
  type MatrixType,
  type PlannedReminder,
  type ReminderCandidate,
  type SkipReason,
} from "@matriz/core";
import {
  auditLogs,
  businessCalendars,
  deadlineExtensions,
  deadlineRules,
  holidays,
  inboxItems,
  matrices,
  notificationEvents,
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
  extensionCount: number;
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

export async function loadHolidayDates(): Promise<string[]> {
  return holidayDates();
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
      waitingForTrigger: ruleByTask.get(t.id)?.waitingForTrigger ?? false,
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
      extensionCount: t.extensionCount,
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
  const extensions = await db
    .select()
    .from(deadlineExtensions)
    .where(eq(deadlineExtensions.taskId, taskId))
    .orderBy(desc(deadlineExtensions.requestedAt));

  const copyInput = {
    matrixName: task.matrixName,
    sequenceNumber: task.sequenceNumber,
    taskTitle: task.title,
    responsibleNames: task.responsibles.map((r) => r.name),
    currentDueDate: task.currentDueDate,
    requestedDueDate: null as string | null,
    reason: null as string | null,
    extensionNumber: task.extensionCount,
  };

  const open = extensions.find((e) => e.status === "REQUESTED");
  const last = extensions[0];
  const chefsCopyText = open
    ? buildExtensionRequestToChefsText({
        ...copyInput,
        requestedDueDate: open.requestedDueDate,
        reason: open.reason,
      })
    : null;
  const responsibleApprovedText =
    last?.status === "APPROVED"
      ? buildExtensionApprovedToResponsibleText({
          ...copyInput,
          currentDueDate: last.previousDueDate,
          approvedDueDate: last.approvedDueDate,
          requestedDueDate: last.requestedDueDate,
          reason: last.reason,
        })
      : null;
  const responsibleRejectedText =
    last?.status === "REJECTED"
      ? buildExtensionRejectedToResponsibleText({
          ...copyInput,
          reason: last.reason,
        })
      : null;

  return {
    task,
    history,
    audits,
    notes,
    rule: rule[0] ?? null,
    extensions,
    chefsCopyText,
    responsibleApprovedText,
    responsibleRejectedText,
  };
}

export async function dashboardSummary() {
  const rows = await loadTaskRows();
  const open = rows.filter((t) => t.baseStatus !== "COMPLETED" && t.baseStatus !== "CANCELLED");
  const ranked = [...open].sort((a, b) => attentionRank(a) - attentionRank(b) || a.sequenceNumber - b.sequenceNumber);
  return {
    dueToday: open.filter((t) => t.deadlineStatus === "DUE_TODAY").length,
    dueSoon: open.filter((t) => t.deadlineStatus === "DUE_SOON").length,
    overdue: open.filter((t) => t.deadlineStatus === "OVERDUE").length,
    waitingTrigger: open.filter((t) => t.deadlineStatus === "WAITING_FOR_TRIGGER").length,
    blocked: open.filter((t) => t.baseStatus === "BLOCKED").length,
    waitingValidation: open.filter((t) => t.baseStatus === "WAITING_FOR_VALIDATION").length,
    extensionRequests: open.filter((t) => t.extensionStatus === "REQUESTED").length,
    attention: ranked.slice(0, 8),
  };
}

export type TodayReminder = PlannedReminder & {
  chatLink: string | null;
  blockedReason: string | null;
  taskTitles: string[];
};

export type TodayRemindersResult = {
  today: string;
  reminders: TodayReminder[];
  alreadySent: number;
  skipped: { name: string; taskTitle: string; reason: SkipReason }[];
};

const SKIP_LABELS: Record<SkipReason, string> = {
  TASK_CLOSED: "tarefa concluída ou cancelada",
  NO_DEADLINE_PRESSURE: "prazo ainda confortável",
  WAITING_FOR_TRIGGER: "aguardando gatilho — não é atraso da pessoa",
  BLOCKED_IS_NOT_LATE: "bloqueada por pré-requisito — não se cobra atraso",
  RESPONSIBLE_INACTIVE: "responsável inativo",
  OPTED_OUT: "responsável pediu para não receber",
  MATRIX_ARCHIVED: "matriz arquivada",
  ALREADY_SENT_TODAY: "já enviado hoje",
};

export function skipLabel(reason: SkipReason): string {
  return SKIP_LABELS[reason];
}

/**
 * Passada diária do admin (ADR-008). Agrupa por pessoa via digest do core
 * e esconde o que já foi enviado hoje.
 */
export async function listTodayReminders(): Promise<TodayRemindersResult> {
  const db = getDb();
  const today = todayCivil();

  const rows = await db
    .select({
      taskId: tasks.id,
      sequenceNumber: tasks.sequenceNumber,
      taskTitle: tasks.title,
      baseStatus: tasks.baseStatus,
      cachedDeadlineStatus: tasks.cachedDeadlineStatus,
      currentDueDate: tasks.currentDueDate,
      matrixName: matrices.name,
      matrixArchivedAt: matrices.archivedAt,
      responsibleId: responsibles.id,
      responsibleName: responsibles.name,
      responsibleActive: responsibles.active,
      e164: responsibles.whatsappNumberE164,
      optIn: responsibles.whatsappOptInStatus,
    })
    .from(taskResponsibles)
    .innerJoin(tasks, eq(tasks.id, taskResponsibles.taskId))
    .innerJoin(matrices, eq(matrices.id, tasks.matrixId))
    .innerJoin(responsibles, eq(responsibles.id, taskResponsibles.responsibleId))
    .where(
      and(
        eq(taskResponsibles.active, true),
        isNull(tasks.completedAt),
        isNull(tasks.cancelledAt),
        inArray(tasks.cachedDeadlineStatus, ["DUE_SOON", "DUE_TODAY", "OVERDUE"]),
      ),
    );

  const sentToday = await db
    .select({ dedupeKey: notificationEvents.dedupeKey })
    .from(notificationEvents)
    .where(and(eq(notificationEvents.sentOn, today), eq(notificationEvents.result, "SENT")));
  const sentKeys = new Set(sentToday.map((r) => r.dedupeKey));

  const candidates: ReminderCandidate[] = rows.map((row) => {
    const base: ReminderCandidate = {
      taskId: row.taskId,
      responsibleId: row.responsibleId,
      responsibleName: row.responsibleName,
      sequenceNumber: row.sequenceNumber,
      taskTitle: row.taskTitle,
      matrixName: row.matrixName,
      matrixArchived: row.matrixArchivedAt !== null,
      dueDate: row.currentDueDate,
      baseStatus: row.baseStatus as BaseStatus,
      deadlineStatus: (row.cachedDeadlineStatus as DeadlineStatus | null) ?? "ON_TIME",
      overdueDays: overdueCalendarDays(row.currentDueDate, today),
      responsibleActive: row.responsibleActive,
      optInStatus: row.optIn,
      alreadySentToday: false,
    };
    return { ...base, alreadySentToday: sentKeys.has(dedupeKey(base, today)) };
  });

  const plan = planDailyReminders(candidates, { today });
  const phoneByResponsible = new Map(rows.map((r) => [r.responsibleId, r.e164]));
  const titleByTask = new Map(rows.map((r) => [r.taskId, r.taskTitle]));

  const reminders: TodayReminder[] = plan.planned.map((planned) => {
    const e164 = phoneByResponsible.get(planned.responsibleId) ?? null;
    return {
      ...planned,
      chatLink: e164 ? buildWhatsAppChatLink(e164, planned.message) : null,
      blockedReason: e164 ? null : "Sem número de WhatsApp cadastrado",
      taskTitles: planned.taskIds.map((id) => titleByTask.get(id) ?? id),
    };
  });

  return {
    today,
    reminders,
    alreadySent: plan.skipped.filter((s) => s.reason === "ALREADY_SENT_TODAY").length,
    skipped: plan.skipped
      .filter((s) => s.reason !== "ALREADY_SENT_TODAY" && s.reason !== "NO_DEADLINE_PRESSURE")
      .map((s) => ({
        name: s.candidate.responsibleName,
        taskTitle: s.candidate.taskTitle,
        reason: s.reason,
      })),
  };
}

export type ReminderTarget = {
  responsibleId: string;
  name: string;
  chatLink: string | null;
  message: string;
  blockedReason: string | null;
};

export type InboxItemRow = Awaited<ReturnType<typeof selectOpenInboxItems>>[number] & {
  targets: ReminderTarget[];
  chefsCopyText: string | null;
};

function selectOpenInboxItems() {
  const db = getDb();
  return db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.status, "OPEN"))
    .orderBy(desc(inboxItems.createdAt))
    .limit(50);
}

export async function listInboxItems(): Promise<InboxItemRow[]> {
  const db = getDb();
  const rows = await selectOpenInboxItems();

  const taskIds = [...new Set(rows.map((r) => r.taskId).filter((id): id is string => Boolean(id)))];
  if (taskIds.length === 0) {
    return rows.map((row) => ({ ...row, targets: [], chefsCopyText: null }));
  }

  const taskRows = await loadTaskRows();
  const taskById = new Map(taskRows.map((t) => [t.id, t]));
  const openExtensions = await db
    .select()
    .from(deadlineExtensions)
    .where(and(inArray(deadlineExtensions.taskId, taskIds), eq(deadlineExtensions.status, "REQUESTED")));
  const extByTask = new Map(openExtensions.map((e) => [e.taskId, e]));

  const assignments = await db
    .select({
      taskId: taskResponsibles.taskId,
      responsibleId: responsibles.id,
      name: responsibles.name,
      e164: responsibles.whatsappNumberE164,
      optIn: responsibles.whatsappOptInStatus,
      active: responsibles.active,
      taskTitle: tasks.title,
      matrixName: matrices.name,
      currentDueDate: tasks.currentDueDate,
      cachedDeadlineStatus: tasks.cachedDeadlineStatus,
    })
    .from(taskResponsibles)
    .innerJoin(responsibles, eq(responsibles.id, taskResponsibles.responsibleId))
    .innerJoin(tasks, eq(tasks.id, taskResponsibles.taskId))
    .innerJoin(matrices, eq(matrices.id, tasks.matrixId))
    .where(and(inArray(taskResponsibles.taskId, taskIds), eq(taskResponsibles.active, true)))
    .orderBy(asc(responsibles.name));

  const today = todayCivil();
  const byTask = new Map<string, ReminderTarget[]>();

  for (const row of assignments) {
    const deadlineStatus = (row.cachedDeadlineStatus as DeadlineStatus | null) ?? "ON_TIME";
    const message = buildReminderMessage({
      responsibleName: row.name,
      taskTitle: row.taskTitle,
      matrixName: row.matrixName,
      dueDate: row.currentDueDate,
      deadlineStatus,
      overdueDays: overdueCalendarDays(row.currentDueDate, today),
    });

    const list = byTask.get(row.taskId) ?? [];
    list.push({
      responsibleId: row.responsibleId,
      name: row.name,
      chatLink: row.e164 ? buildWhatsAppChatLink(row.e164, message) : null,
      message,
      blockedReason: reminderBlockedReason(row.active, row.e164, row.optIn),
    });
    byTask.set(row.taskId, list);
  }

  return rows.map((row) => {
    let chefsCopyText: string | null = null;
    if (row.kind === "EXTENSION_REQUEST" && row.taskId) {
      const task = taskById.get(row.taskId);
      const ext = extByTask.get(row.taskId);
      if (task && ext) {
        chefsCopyText = buildExtensionRequestToChefsText({
          matrixName: task.matrixName,
          sequenceNumber: task.sequenceNumber,
          taskTitle: task.title,
          responsibleNames: task.responsibles.map((r) => r.name),
          currentDueDate: task.currentDueDate,
          requestedDueDate: ext.requestedDueDate,
          reason: ext.reason,
          extensionNumber: task.extensionCount,
        });
      }
    }
    return {
      ...row,
      targets: row.taskId ? (byTask.get(row.taskId) ?? []) : [],
      chefsCopyText,
    };
  });
}

function reminderBlockedReason(active: boolean, e164: string | null, optIn: string): string | null {
  if (!active) return "Responsável inativo";
  if (!e164) return "Sem número de WhatsApp cadastrado";
  if (optIn === "OPTED_OUT") return "Responsável pediu para não receber lembretes";
  return null;
}

function overdueCalendarDays(dueDate: string | null, today: string): number {
  if (!dueDate) return 0;
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(due) || Number.isNaN(now) || now <= due) return 0;
  return Math.round((now - due) / 86_400_000);
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

const DATE_PRESSURE_STATUSES: DeadlineStatus[] = ["DUE_SOON", "DUE_TODAY", "OVERDUE"];

export type DateValidationGroup = {
  responsibleId: string;
  responsibleName: string;
  chatLink: string | null;
  blockedReason: string | null;
  message: string;
  tasks: {
    taskId: string;
    matrixId: string;
    matrixName: string;
    sequenceNumber: number;
    title: string;
    deadlineStatus: DeadlineStatus;
  }[];
};

export async function listDateValidationGroups(): Promise<DateValidationGroup[]> {
  const [rows, people, rules] = await Promise.all([
    loadTaskRows(),
    listResponsibles(),
    getDb().select().from(deadlineRules),
  ]);
  const ruleByTask = new Map(rules.map((r) => [r.taskId, r]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const byResponsible = new Map<string, TaskRow[]>();

  for (const task of rows) {
    if (task.baseStatus === "COMPLETED" || task.baseStatus === "CANCELLED") continue;
    if (!DATE_PRESSURE_STATUSES.includes(task.deadlineStatus)) continue;
    for (const responsible of task.responsibles) {
      const list = byResponsible.get(responsible.id) ?? [];
      list.push(task);
      byResponsible.set(responsible.id, list);
    }
  }

  const groups: DateValidationGroup[] = [];

  for (const [responsibleId, tasks] of byResponsible) {
    const person = personById.get(responsibleId);
    if (!person?.active) continue;

    const sorted = [...tasks].sort(
      (a, b) => attentionRank(a) - attentionRank(b) || a.sequenceNumber - b.sequenceNumber,
    );

    const taskLines = sorted.map((task) => {
      const rule = ruleByTask.get(task.id);
      const explanation = rule
        ? formatDeadlineExplanation(
            rule.deadlineType,
            rule.explanation as Record<string, unknown> | null,
          )
        : null;
      const blocked = task.prerequisites.filter((p) => p.status !== "COMPLETED");
      const prerequisiteNote = blocked.length
        ? `depende da etapa #${blocked.map((p) => p.sequenceNumber).join(", #")}`
        : null;

      return {
        matrixName: task.matrixName,
        sequenceNumber: task.sequenceNumber,
        title: task.title,
        dueLabel: dateValidationDueLabel({
          currentDueDate: task.currentDueDate,
          deadlineExplanation: explanation,
        }),
        prerequisiteNote,
      };
    });

    const message = buildDateValidationMessage({
      responsibleName: person.name,
      tasks: taskLines,
    });

    groups.push({
      responsibleId,
      responsibleName: person.name,
      chatLink: person.whatsappNumberE164 ? buildWhatsAppChatLink(person.whatsappNumberE164, message) : null,
      blockedReason: reminderBlockedReason(person.active, person.whatsappNumberE164, person.whatsappOptInStatus),
      message,
      tasks: sorted.map((task) => ({
        taskId: task.id,
        matrixId: task.matrixId,
        matrixName: task.matrixName,
        sequenceNumber: task.sequenceNumber,
        title: task.title,
        deadlineStatus: task.deadlineStatus,
      })),
    });
  }

  return groups.sort((a, b) => a.responsibleName.localeCompare(b.responsibleName, "pt-BR"));
}

export async function countOpenInboxItems(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inboxItems)
    .where(eq(inboxItems.status, "OPEN"));
  return row?.count ?? 0;
}

export type ExtensionHistoryRow = {
  id: string;
  status: string;
  reason: string | null;
  previousDueDate: string | null;
  requestedDueDate: string | null;
  approvedDueDate: string | null;
  requestedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  taskId: string;
  taskTitle: string;
  matrixName: string;
  matrixId: string;
  sequenceNumber: number;
  responsibleNames: string[];
};

export async function listExtensionHistory(): Promise<ExtensionHistoryRow[]> {
  const db = getDb();
  const extensions = await db
    .select()
    .from(deadlineExtensions)
    .orderBy(desc(deadlineExtensions.requestedAt))
    .limit(100);
  const taskRows = await loadTaskRows();
  const taskById = new Map(taskRows.map((t) => [t.id, t]));

  return extensions.map((ext) => {
    const task = taskById.get(ext.taskId);
    return {
      id: ext.id,
      status: ext.status,
      reason: ext.reason,
      previousDueDate: ext.previousDueDate,
      requestedDueDate: ext.requestedDueDate,
      approvedDueDate: ext.approvedDueDate,
      requestedAt: ext.requestedAt,
      approvedAt: ext.approvedAt,
      rejectedAt: ext.rejectedAt,
      taskId: ext.taskId,
      taskTitle: task?.title ?? "—",
      matrixName: task?.matrixName ?? "—",
      matrixId: task?.matrixId ?? "",
      sequenceNumber: task?.sequenceNumber ?? 0,
      responsibleNames: task?.responsibles.map((r) => r.name) ?? [],
    };
  });
}
