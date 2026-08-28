"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import {
  DomainError,
  MATRIX_TYPES,
  andDependenciesSatisfied,
  assertCanAddDependency,
  claimDelivered,
  nextSequenceNumber,
  normalizeE164,
  transitionOperationalStatus,
  type ActorType,
  type BaseStatus,
  type UserRole,
} from "@matriz/core";
import {
  auditLogs,
  deadlineExtensions,
  deadlineRules,
  inboxItems,
  notificationEvents,
  matrices,
  outboxMessages,
  responsibles,
  taskDependencies,
  taskNotes,
  taskResponsibles,
  tasks,
  taskStatusHistory,
  users,
} from "@matriz/db";
import { createSession, destroySession, requireUser, setSessionCookie } from "./auth";
import { materializeDeadlineRule } from "./deadline-materialize";
import { todayCivil } from "./dates";
import { getDb } from "./db";
import { getDefaultCalendarId, loadHolidayDates } from "./queries";
import {
  completeRecurringPeriod,
  createInitialOccurrence,
  parseRecurrenceConfig,
} from "./recurring-occurrences";

function fail(message: string): never {
  throw new Error(message);
}

function revalidateAll(matrixId?: string, taskId?: string) {
  revalidatePath("/");
  revalidatePath("/inbox");
  revalidatePath("/overview");
  revalidatePath("/matrices");
  revalidatePath("/responsibles");
  if (matrixId) revalidatePath(`/matrices/${matrixId}`);
  if (matrixId && taskId) revalidatePath(`/matrices/${matrixId}/tasks/${taskId}`);
}

async function writeAudit(input: {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string;
  before?: unknown;
  after?: unknown;
  origin?: string;
  actorType?: ActorType;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    id: uuidv7(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorType: input.actorType ?? "USER",
    actorUserId: input.actorUserId,
    before: input.before ?? null,
    after: input.after ?? null,
    origin: input.origin ?? "WEB_UI",
  });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !user.active) {
    return { error: "E-mail ou senha inválidos." };
  }
  const ok = await compare(password, user.passwordHash);
  if (!ok) {
    return { error: "E-mail ou senha inválidos." };
  }
  const token = await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  await setSessionCookie(token);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const matrixSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  type: z.enum(MATRIX_TYPES),
});

export async function createMatrixAction(formData: FormData) {
  const user = await requireUser();
  const parsed = matrixSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    type: String(formData.get("type") ?? "OTHER"),
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Dados inválidos");
  }
  const db = getDb();
  const id = uuidv7();
  await db.insert(matrices).values({
    id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    type: parsed.data.type,
    createdBy: user.id,
  });
  await writeAudit({
    entityType: "Matrix",
    entityId: id,
    action: "CREATE",
    actorUserId: user.id,
    after: parsed.data,
  });
  revalidateAll();
  redirect(`/matrices/${id}`);
}

export async function archiveMatrixAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    fail("Somente administrador arquiva matriz.");
  }
  const id = String(formData.get("matrixId") ?? "");
  const db = getDb();
  const existing = await db.select().from(matrices).where(eq(matrices.id, id)).limit(1);
  if (!existing[0]) fail("Matriz não encontrada.");
  await db.update(matrices).set({ archivedAt: new Date(), updatedAt: new Date() }).where(eq(matrices.id, id));
  await writeAudit({
    entityType: "Matrix",
    entityId: id,
    action: "UPDATE",
    actorUserId: user.id,
    before: { archivedAt: existing[0].archivedAt },
    after: { archivedAt: "now" },
  });
  revalidateAll(id);
}

export async function createResponsibleAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name) fail("Nome obrigatório.");
  let e164: string | null = null;
  try {
    if (whatsapp) e164 = normalizeE164(whatsapp);
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "WhatsApp inválido.");
  }
  const db = getDb();
  const id = uuidv7();
  await db.insert(responsibles).values({
    id,
    name,
    role: role || null,
    whatsappNumber: whatsapp || null,
    whatsappNumberE164: e164,
    email: email || null,
    notes: notes || null,
    whatsappOptInStatus: "UNKNOWN",
  });
  await writeAudit({
    entityType: "Responsible",
    entityId: id,
    action: "CREATE",
    actorUserId: user.id,
    after: { name, role, whatsappNumberE164: e164 },
  });
  revalidateAll();
  redirect(`/responsibles/${id}`);
}

export async function updateResponsibleAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const active = formData.getAll("active").includes("true");
  if (!name) fail("Nome obrigatório.");
  let e164: string | null = null;
  try {
    if (whatsapp) e164 = normalizeE164(whatsapp);
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "WhatsApp inválido.");
  }
  const db = getDb();
  await db
    .update(responsibles)
    .set({
      name,
      role: role || null,
      whatsappNumber: whatsapp || null,
      whatsappNumberE164: e164,
      email: email || null,
      notes: notes || null,
      active,
      updatedAt: new Date(),
    })
    .where(eq(responsibles.id, id));
  await writeAudit({
    entityType: "Responsible",
    entityId: id,
    action: "UPDATE",
    actorUserId: user.id,
    after: { name, active, whatsappNumberE164: e164 },
  });
  revalidateAll();
}

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const matrixId = String(formData.get("matrixId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const deadlineType = String(formData.get("deadlineType") ?? "FIXED_DATE");
  const fixedDate = String(formData.get("fixedDate") ?? "").trim() || null;
  const businessDaysRaw = String(formData.get("businessDays") ?? "").trim();
  const businessDays = businessDaysRaw ? Number(businessDaysRaw) : null;
  const responsibleIds = formData.getAll("responsibleIds").map(String).filter(Boolean);
  const dependsOnIds = formData.getAll("dependsOnIds").map(String).filter(Boolean);
  if (!title) fail("Título obrigatório.");
  if (deadlineType === "FIXED_DATE" && !fixedDate) fail("Informe a data do prazo fixo.");
  if (
    (deadlineType === "BUSINESS_DAYS_AFTER_CREATION" ||
      deadlineType === "BUSINESS_DAYS_AFTER_DEPENDENCY" ||
      deadlineType === "CALENDAR_DAYS_AFTER_TRIGGER") &&
    (!businessDays || businessDays <= 0)
  ) {
    fail("Informe a quantidade de dias.");
  }
  if (
    (deadlineType === "BUSINESS_DAYS_AFTER_DEPENDENCY" || deadlineType === "CALENDAR_DAYS_AFTER_TRIGGER") &&
    dependsOnIds.length === 0
  ) {
    fail("Prazo após gatilho exige pelo menos um pré-requisito.");
  }

  const db = getDb();
  const holidayList = await loadHolidayDates();
  const createdOn = todayCivil();
  try {
    const taskId = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM matrices WHERE id = ${matrixId} FOR UPDATE`);
      const existing = await tx.select({ n: tasks.sequenceNumber }).from(tasks).where(eq(tasks.matrixId, matrixId));
      const sequenceNumber = nextSequenceNumber(existing.map((r) => r.n));
      const calendarId = await getDefaultCalendarId();
      const id = uuidv7();

      const predsForDeadline = dependsOnIds.length
        ? await tx.select().from(tasks).where(inArray(tasks.id, dependsOnIds))
        : [];
      const recurringNth =
        deadlineType === "RECURRING_BUSINESS_DAY"
          ? businessDays && businessDays > 0
            ? businessDays
            : 3
          : businessDays;
      const materialized = materializeDeadlineRule({
        deadlineType,
        fixedDate,
        businessDays: recurringNth,
        holidays: holidayList,
        createdOn,
        predecessors: predsForDeadline.map((p) => ({
          baseStatus: p.baseStatus,
          completedAt: p.completedAt,
        })),
      });

      let baseStatus: BaseStatus = "PENDING";
      if (dependsOnIds.length > 0) {
        const preds = await tx.select().from(tasks).where(inArray(tasks.id, dependsOnIds));
        const sat = andDependenciesSatisfied(
          preds.map((p) => ({ dependsOnTaskId: p.id, predecessorStatus: p.baseStatus as BaseStatus })),
        );
        if (!sat) baseStatus = "BLOCKED";
      }

      await tx.insert(tasks).values({
        id,
        matrixId,
        sequenceNumber,
        displayOrder: sequenceNumber,
        title,
        description: description || null,
        baseStatus,
        extensionStatus: "NONE",
        originalDueDate: materialized.originalDueDate,
        currentDueDate: materialized.currentDueDate,
        createdBy: user.id,
      });
      const ruleId = uuidv7();
      const recurrenceConfig =
        deadlineType === "RECURRING_BUSINESS_DAY"
          ? {
              nth: recurringNth!,
              unit: "BUSINESS_DAY" as const,
              period: "MONTH" as const,
              startPolicy: "CURRENT_PERIOD" as const,
            }
          : null;
      await tx.insert(deadlineRules).values({
        id: ruleId,
        taskId: id,
        deadlineType,
        fixedDate: deadlineType === "FIXED_DATE" ? fixedDate : null,
        amount: materialized.amount,
        unit: materialized.amount
          ? deadlineType === "CALENDAR_DAYS_AFTER_TRIGGER"
            ? "CALENDAR_DAY"
            : "BUSINESS_DAY"
          : null,
        triggerTaskId:
          deadlineType === "BUSINESS_DAYS_AFTER_DEPENDENCY" ||
          deadlineType === "CALENDAR_DAYS_AFTER_TRIGGER"
            ? (dependsOnIds[0] ?? null)
            : null,
        recurrenceConfig,
        calendarId,
        calculatedDueDate: materialized.currentDueDate,
        waitingForTrigger: materialized.waitingForTrigger,
        explanation: materialized.explanation,
        computedAt: new Date(),
      });
      if (deadlineType === "RECURRING_BUSINESS_DAY") {
        await createInitialOccurrence(tx, {
          taskId: id,
          ruleId,
          nth: recurringNth!,
          holidays: holidayList,
          today: createdOn,
        });
      }
      for (const responsibleId of responsibleIds) {
        await tx.insert(taskResponsibles).values({
          id: uuidv7(),
          taskId: id,
          responsibleId,
          assignedBy: user.id,
        });
      }
      const existingDeps = await tx.select().from(taskDependencies);
      for (const dependsOnTaskId of dependsOnIds) {
        assertCanAddDependency(
          existingDeps.map((d) => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId })),
          { taskId: id, dependsOnTaskId },
        );
        await tx.insert(taskDependencies).values({
          id: uuidv7(),
          taskId: id,
          dependsOnTaskId,
          createdBy: user.id,
        });
        existingDeps.push({
          id: "",
          taskId: id,
          dependsOnTaskId,
          createdAt: new Date(),
          createdBy: user.id,
          satisfiedAt: null,
        });
      }
      await tx.insert(taskStatusHistory).values({
        id: uuidv7(),
        taskId: id,
        fromStatus: null,
        toStatus: baseStatus,
        actorType: "USER",
        actorUserId: user.id,
        reason: "TaskCreated",
      });
      await tx.insert(auditLogs).values({
        id: uuidv7(),
        entityType: "Task",
        entityId: id,
        action: "CREATE",
        actorType: "USER",
        actorUserId: user.id,
        after: { title, sequenceNumber, deadlineType, fixedDate, baseStatus },
        origin: "WEB_UI",
      });
      return id;
    });
    revalidateAll(matrixId, taskId);
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "Não foi possível criar a demanda.");
  }
}

export async function assignResponsiblesAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const responsibleIds = formData.getAll("responsibleIds").map(String).filter(Boolean);
  const db = getDb();
  const current = await db.select().from(taskResponsibles).where(eq(taskResponsibles.taskId, taskId));
  const wanted = new Set(responsibleIds);
  for (const row of current) {
    if (!wanted.has(row.responsibleId) && row.active) {
      await db
        .update(taskResponsibles)
        .set({ active: false })
        .where(eq(taskResponsibles.id, row.id));
    }
  }
  for (const responsibleId of responsibleIds) {
    const existing = current.find((r) => r.responsibleId === responsibleId);
    if (existing) {
      if (!existing.active) {
        await db.update(taskResponsibles).set({ active: true }).where(eq(taskResponsibles.id, existing.id));
      }
    } else {
      await db.insert(taskResponsibles).values({
        id: uuidv7(),
        taskId,
        responsibleId,
        assignedBy: user.id,
      });
    }
  }
  await writeAudit({
    entityType: "Task",
    entityId: taskId,
    action: "UPDATE",
    actorUserId: user.id,
    after: { responsibleIds },
  });
  revalidateAll(matrixId, taskId);
}

export async function addDependencyAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    fail("Somente ADMIN altera dependências no MVP.");
  }
  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const dependsOnTaskId = String(formData.get("dependsOnTaskId") ?? "");
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const all = await tx.select().from(taskDependencies);
      const result = assertCanAddDependency(
        all.map((d) => ({ taskId: d.taskId, dependsOnTaskId: d.dependsOnTaskId })),
        { taskId, dependsOnTaskId },
      );
      if (result.duplicate) return;
      const pred = await tx.select().from(tasks).where(eq(tasks.id, dependsOnTaskId)).limit(1);
      const dependent = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!pred[0] || !dependent[0]) throw new Error("Tarefa não encontrada");
      if (pred[0].matrixId !== dependent[0].matrixId) {
        throw new DomainError("CROSS_MATRIX", "Dependência precisa ser da mesma matriz");
      }
      await tx.insert(taskDependencies).values({
        id: uuidv7(),
        taskId,
        dependsOnTaskId,
        createdBy: user.id,
        satisfiedAt: pred[0].baseStatus === "COMPLETED" ? new Date() : null,
      });
      if (pred[0].baseStatus !== "COMPLETED" && dependent[0].baseStatus !== "COMPLETED") {
        const from = dependent[0].baseStatus as BaseStatus;
        transitionOperationalStatus({
          from,
          to: "BLOCKED",
          actorType: "SYSTEM",
          actorRole: null,
          reason: "UNSATISFIED_DEPENDENCY",
        });
        await tx
          .update(tasks)
          .set({ baseStatus: "BLOCKED", updatedAt: new Date() })
          .where(eq(tasks.id, taskId));
        await tx.insert(taskStatusHistory).values({
          id: uuidv7(),
          taskId,
          fromStatus: from,
          toStatus: "BLOCKED",
          actorType: "SYSTEM",
          actorUserId: user.id,
          reason: "UNSATISFIED_DEPENDENCY",
        });
      }
      await tx.insert(auditLogs).values({
        id: uuidv7(),
        entityType: "Task",
        entityId: taskId,
        action: "UPDATE",
        actorType: "USER",
        actorUserId: user.id,
        after: { dependsOnTaskId },
        origin: "WEB_UI",
      });
    });
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "Dependência rejeitada.");
  }
  revalidateAll(matrixId, taskId);
}

export async function changeStatusAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const to = String(formData.get("to") ?? "") as BaseStatus;
  const actorType = "USER" as ActorType;
  const db = getDb();
  const holidays = await loadHolidayDates();
  try {
    await db.transaction(async (tx) => {
      const row = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!row[0]) throw new Error("missing");
      const from = row[0].baseStatus as BaseStatus;
      if (to === "WAITING_FOR_VALIDATION") {
        claimDelivered({ from, actorType: "SYSTEM" });
        await applyStatus(tx, {
          taskId,
          from,
          to: "WAITING_FOR_VALIDATION",
          actorType: "SYSTEM",
          userId: user.id,
          reason: "CLAIMS_DELIVERED",
        });
        await tx.insert(inboxItems).values({
          id: uuidv7(),
          kind: "DELIVERY_CLAIM",
          status: "OPEN",
          taskId,
          matrixId: row[0].matrixId,
          title: `Validar entrega: ${row[0].title}`,
          body: "Alguém informou que concluiu esta demanda. Confirme antes de marcar como entregue.",
          suggestedAction: "VALIDATE_DELIVERY",
          requiresHumanAction: true,
          correlationId: uuidv7(),
        });
        return;
      }
      transitionOperationalStatus({
        from,
        to,
        actorType,
        actorRole: user.role as UserRole,
      });
      const completed = to === "COMPLETED";
      const [rule] = await tx
        .select()
        .from(deadlineRules)
        .where(eq(deadlineRules.taskId, taskId))
        .limit(1);
      const recurrenceConfig = parseRecurrenceConfig(rule?.recurrenceConfig);
      const isActiveRecurring =
        completed &&
        rule?.deadlineType === "RECURRING_BUSINESS_DAY" &&
        !rule.recurrenceEndedAt &&
        recurrenceConfig;

      if (isActiveRecurring) {
        await completeRecurringPeriod(tx, {
          taskId,
          ruleId: rule.id,
          userId: user.id,
          holidays,
          recurrenceConfig,
        });
        await applyStatus(tx, {
          taskId,
          from,
          to: "PENDING",
          actorType,
          userId: user.id,
          reason: "RECURRING_PERIOD_COMPLETED",
          completed: false,
        });
        return;
      }

      await applyStatus(tx, {
        taskId,
        from,
        to,
        actorType,
        userId: user.id,
        reason: completed ? "ADMIN_VALIDATED" : "USER",
        completed,
      });
      if (completed) {
        await satisfyAndUnblock(tx, taskId, user.id, holidays);
      }
    });
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "Transição inválida.");
  }
  revalidateAll(matrixId, taskId);
}

async function applyStatus(
  tx: {
    update: ReturnType<typeof getDb>["update"];
    insert: ReturnType<typeof getDb>["insert"];
  },
  input: {
    taskId: string;
    from: BaseStatus;
    to: BaseStatus;
    actorType: ActorType;
    userId: string;
    reason: string;
    completed?: boolean;
  },
) {
  await tx
    .update(tasks)
    .set({
      baseStatus: input.to,
      completedAt: input.completed ? new Date() : input.to === "COMPLETED" ? new Date() : null,
      cancelledAt: input.to === "CANCELLED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, input.taskId));
  await tx.insert(taskStatusHistory).values({
    id: uuidv7(),
    taskId: input.taskId,
    fromStatus: input.from,
    toStatus: input.to,
    actorType: input.actorType,
    actorUserId: input.userId,
    reason: input.reason,
  });
  await tx.insert(auditLogs).values({
    id: uuidv7(),
    entityType: "Task",
    entityId: input.taskId,
    action: "TRANSITION",
    actorType: input.actorType,
    actorUserId: input.userId,
    before: { baseStatus: input.from },
    after: { baseStatus: input.to },
    origin: "WEB_UI",
  });
}

async function recomputeDependencyDeadlines(
  tx: {
    update: ReturnType<typeof getDb>["update"];
    select: ReturnType<typeof getDb>["select"];
  },
  completedTaskId: string,
  holidays: string[],
) {
  const edges = await tx
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependsOnTaskId, completedTaskId));
  const dependentIds = [...new Set(edges.map((e) => e.taskId))];
  for (const taskId of dependentIds) {
    const [rule] = await tx.select().from(deadlineRules).where(eq(deadlineRules.taskId, taskId)).limit(1);
    if (
      !rule ||
      !rule.amount ||
      (rule.deadlineType !== "BUSINESS_DAYS_AFTER_DEPENDENCY" &&
        rule.deadlineType !== "CALENDAR_DAYS_AFTER_TRIGGER")
    ) {
      continue;
    }

    const deps = await tx.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId));
    const predIds = deps.map((d) => d.dependsOnTaskId);
    const preds = predIds.length ? await tx.select().from(tasks).where(inArray(tasks.id, predIds)) : [];
    const materialized = materializeDeadlineRule({
      deadlineType: rule.deadlineType,
      fixedDate: null,
      businessDays: rule.amount,
      holidays,
      createdOn: todayCivil(),
      predecessors: preds.map((p) => ({ baseStatus: p.baseStatus, completedAt: p.completedAt })),
    });

    const [taskRow] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!taskRow) continue;

    await tx
      .update(deadlineRules)
      .set({
        calculatedDueDate: materialized.currentDueDate,
        waitingForTrigger: materialized.waitingForTrigger,
        explanation: materialized.explanation,
        computedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deadlineRules.id, rule.id));

    await tx
      .update(tasks)
      .set({
        originalDueDate: taskRow.originalDueDate ?? materialized.originalDueDate,
        currentDueDate: materialized.currentDueDate,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));
  }
}

async function satisfyAndUnblock(
  tx: {
    update: ReturnType<typeof getDb>["update"];
    insert: ReturnType<typeof getDb>["insert"];
    select: ReturnType<typeof getDb>["select"];
  },
  completedTaskId: string,
  userId: string,
  holidays: string[],
) {
  const blocked = await tx
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.dependsOnTaskId, completedTaskId));
  for (const dep of blocked) {
    await tx
      .update(taskDependencies)
      .set({ satisfiedAt: new Date() })
      .where(eq(taskDependencies.id, dep.id));
  }
  const dependentIds = [...new Set(blocked.map((d) => d.taskId))];
  for (const dependentId of dependentIds) {
    const deps = await tx.select().from(taskDependencies).where(eq(taskDependencies.taskId, dependentId));
    const predIds = deps.map((d) => d.dependsOnTaskId);
    const preds = predIds.length ? await tx.select().from(tasks).where(inArray(tasks.id, predIds)) : [];
    const sat = andDependenciesSatisfied(
      preds.map((p) => ({ dependsOnTaskId: p.id, predecessorStatus: p.baseStatus as BaseStatus })),
    );
    if (!sat) continue;
    const dependent = await tx.select().from(tasks).where(eq(tasks.id, dependentId)).limit(1);
    if (!dependent[0] || dependent[0].baseStatus !== "BLOCKED") continue;
    const to: BaseStatus = "IN_PROGRESS";
    transitionOperationalStatus({
      from: "BLOCKED",
      to,
      actorType: "SYSTEM",
      actorRole: null,
    });
    await applyStatus(tx, {
      taskId: dependentId,
      from: "BLOCKED",
      to,
      actorType: "SYSTEM",
      userId,
      reason: "DEPENDENCIES_SATISFIED",
    });
  }
  await recomputeDependencyDeadlines(tx, completedTaskId, holidays);
  await tx.insert(outboxMessages).values({
    id: uuidv7(),
    aggregateType: "Task",
    aggregateId: completedTaskId,
    eventName: "TaskCompleted",
    jobType: "RECOMPUTE_DEADLINES",
    payload: { taskId: completedTaskId },
    status: "PENDING",
    idempotencyKey: `recompute:${completedTaskId}:${Date.now()}`,
    correlationId: uuidv7(),
  });
}

export async function addNoteAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) fail("Nota vazia.");
  const db = getDb();
  await db.insert(taskNotes).values({
    id: uuidv7(),
    taskId,
    body,
    createdBy: user.id,
  });
  await writeAudit({
    entityType: "Task",
    entityId: taskId,
    action: "UPDATE",
    actorUserId: user.id,
    after: { note: body.slice(0, 120) },
  });
  revalidateAll(matrixId, taskId);
}

/**
 * Registra que o admin enviou o lembrete pelo WhatsApp dele (ADR-008).
 * Alimenta o dedupe de §7.1: a mesma tarefa/pessoa não reaparece no mesmo dia.
 */
export async function markReminderSentAction(formData: FormData) {
  const user = await requireUser();
  const responsibleId = String(formData.get("responsibleId") ?? "");
  const kind = String(formData.get("kind") ?? "SINGLE");
  const message = String(formData.get("message") ?? "");
  const dedupeKeys = String(formData.get("dedupeKeys") ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (!responsibleId || dedupeKeys.length === 0) fail("Lembrete inválido.");

  const db = getDb();
  const sentOn = todayCivil();
  const correlationId = uuidv7();

  for (const key of dedupeKeys) {
    const taskId = key.split(":")[1] ?? null;
    await db
      .insert(notificationEvents)
      .values({
        id: uuidv7(),
        dedupeKey: key,
        channel: "WHATSAPP_ASSISTED",
        kind,
        result: "SENT",
        taskId,
        responsibleId,
        messageBody: message.slice(0, 2000),
        sentOn,
        sentBy: user.id,
        correlationId,
      })
      .onConflictDoNothing();
  }

  await writeAudit({
    entityType: "Responsible",
    entityId: responsibleId,
    action: "UPDATE",
    actorUserId: user.id,
    after: { reminderSent: kind, tasks: dedupeKeys.length, channel: "WHATSAPP_ASSISTED" },
  });

  revalidatePath("/reminders");
  revalidatePath("/inbox");
}

export async function requestExtensionAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const requestedDueDate = String(formData.get("requestedDueDate") ?? "").trim() || null;
  if (!taskId || !reason) fail("Informe o motivo do pedido.");

  const db = getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) fail("Tarefa não encontrada.");

  const [open] = await db
    .select({ id: deadlineExtensions.id })
    .from(deadlineExtensions)
    .where(and(eq(deadlineExtensions.taskId, taskId), eq(deadlineExtensions.status, "REQUESTED")))
    .limit(1);
  if (open) fail("Já existe um pedido em análise para esta tarefa.");

  const extId = uuidv7();
  const inboxId = uuidv7();

  await db.transaction(async (tx) => {
    await tx.insert(deadlineExtensions).values({
      id: extId,
      taskId,
      previousDueDate: task.currentDueDate,
      requestedDueDate,
      requestedByUserId: user.id,
      reason,
      requestSource: "USER",
      inboxItemId: inboxId,
      status: "REQUESTED",
    });
    await tx
      .update(tasks)
      .set({ extensionStatus: "REQUESTED", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
    await tx.insert(inboxItems).values({
      id: inboxId,
      kind: "EXTENSION_REQUEST",
      status: "OPEN",
      taskId,
      matrixId,
      title: `Pedido de prorrogação: ${task.title}`,
      body: reason,
      suggestedAction: "COPY_TO_CHEFS_GROUP",
      requiresHumanAction: true,
      correlationId: uuidv7(),
    });
  });

  await writeAudit({
    entityType: "DeadlineExtension",
    entityId: extId,
    action: "CREATE",
    actorUserId: user.id,
    after: { status: "REQUESTED", requestedDueDate, reason: reason.slice(0, 120) },
  });

  revalidateAll(matrixId, taskId);
}

export async function approveExtensionAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") fail("Somente administrador aprova prorrogação.");

  const extensionId = String(formData.get("extensionId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const approvedDueDate = String(formData.get("approvedDueDate") ?? "").trim();
  if (!extensionId || !approvedDueDate) fail("Informe a data aprovada.");

  const db = getDb();
  const [ext] = await db.select().from(deadlineExtensions).where(eq(deadlineExtensions.id, extensionId)).limit(1);
  if (!ext || ext.status !== "REQUESTED") fail("Pedido não encontrado ou já decidido.");

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) fail("Tarefa não encontrada.");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(deadlineExtensions)
      .set({
        status: "APPROVED",
        approvedDueDate,
        approvedBy: user.id,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(deadlineExtensions.id, extensionId));

    await tx
      .update(tasks)
      .set({
        currentDueDate: approvedDueDate,
        extensionStatus: "APPROVED",
        extensionCount: task.extensionCount + 1,
        cachedDeadlineStatus: null,
        deadlineStatusComputedAt: null,
        deadlineStatusAsOf: null,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    const [rule] = await tx.select().from(deadlineRules).where(eq(deadlineRules.taskId, taskId)).limit(1);
    if (rule?.deadlineType === "FIXED_DATE") {
      await tx
        .update(deadlineRules)
        .set({
          fixedDate: approvedDueDate,
          calculatedDueDate: approvedDueDate,
          computedAt: now,
          updatedAt: now,
        })
        .where(eq(deadlineRules.id, rule.id));
    }

    if (ext.inboxItemId) {
      await tx
        .update(inboxItems)
        .set({ status: "RESOLVED", resolvedAt: now, resolvedBy: user.id, updatedAt: now })
        .where(eq(inboxItems.id, ext.inboxItemId));
    }
  });

  await writeAudit({
    entityType: "DeadlineExtension",
    entityId: extensionId,
    action: "UPDATE",
    actorUserId: user.id,
    before: { currentDueDate: task.currentDueDate },
    after: { status: "APPROVED", approvedDueDate },
  });

  revalidateAll(matrixId, taskId);
}

export async function rejectExtensionAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") fail("Somente administrador rejeita prorrogação.");

  const extensionId = String(formData.get("extensionId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const db = getDb();
  const [ext] = await db.select().from(deadlineExtensions).where(eq(deadlineExtensions.id, extensionId)).limit(1);
  if (!ext || ext.status !== "REQUESTED") fail("Pedido não encontrado ou já decidido.");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(deadlineExtensions)
      .set({
        status: "REJECTED",
        rejectedBy: user.id,
        rejectedAt: now,
        notes,
        updatedAt: now,
      })
      .where(eq(deadlineExtensions.id, extensionId));

    await tx
      .update(tasks)
      .set({ extensionStatus: "REJECTED", updatedAt: now })
      .where(eq(tasks.id, taskId));

    if (ext.inboxItemId) {
      await tx
        .update(inboxItems)
        .set({ status: "RESOLVED", resolvedAt: now, resolvedBy: user.id, updatedAt: now })
        .where(eq(inboxItems.id, ext.inboxItemId));
    }
  });

  await writeAudit({
    entityType: "DeadlineExtension",
    entityId: extensionId,
    action: "UPDATE",
    actorUserId: user.id,
    after: { status: "REJECTED" },
  });

  revalidateAll(matrixId, taskId);
}

export async function updateTaskAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const fixedDate = String(formData.get("fixedDate") ?? "").trim() || null;
  if (!taskId || !title) fail("Título obrigatório.");

  const db = getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) fail("Tarefa não encontrada.");

  const [rule] = await db.select().from(deadlineRules).where(eq(deadlineRules.taskId, taskId)).limit(1);
  const now = new Date();

  await db.transaction(async (tx) => {
    const taskPatch: Record<string, unknown> = {
      title,
      description: description || null,
      updatedAt: now,
    };

    if (rule?.deadlineType === "FIXED_DATE" && fixedDate) {
      taskPatch.currentDueDate = fixedDate;
      if (!task.originalDueDate) taskPatch.originalDueDate = fixedDate;
      taskPatch.cachedDeadlineStatus = null;
      taskPatch.deadlineStatusComputedAt = null;
      taskPatch.deadlineStatusAsOf = null;

      await tx
        .update(deadlineRules)
        .set({
          fixedDate,
          calculatedDueDate: fixedDate,
          computedAt: now,
          updatedAt: now,
        })
        .where(eq(deadlineRules.id, rule.id));
    }

    await tx.update(tasks).set(taskPatch).where(eq(tasks.id, taskId));
  });

  await writeAudit({
    entityType: "Task",
    entityId: taskId,
    action: "UPDATE",
    actorUserId: user.id,
    after: { title, fixedDate },
  });

  revalidateAll(matrixId, taskId);
}

export async function confirmDeliveryAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") fail("Somente administrador confirma entrega.");

  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  if (!taskId) fail("Tarefa inválida.");

  const db = getDb();
  const holidays = await loadHolidayDates();
  const actorType = "USER" as ActorType;

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!row) throw new Error("missing");
      const from = row.baseStatus as BaseStatus;
      if (from !== "WAITING_FOR_VALIDATION") {
        throw new DomainError("NOT_WAITING", "Tarefa não está aguardando validação.");
      }
      transitionOperationalStatus({
        from,
        to: "COMPLETED",
        actorType,
        actorRole: user.role as UserRole,
      });

      const [rule] = await tx
        .select()
        .from(deadlineRules)
        .where(eq(deadlineRules.taskId, taskId))
        .limit(1);
      const recurrenceConfig = parseRecurrenceConfig(rule?.recurrenceConfig);
      const isActiveRecurring =
        rule?.deadlineType === "RECURRING_BUSINESS_DAY" && !rule.recurrenceEndedAt && recurrenceConfig;

      if (isActiveRecurring) {
        await completeRecurringPeriod(tx, {
          taskId,
          ruleId: rule.id,
          userId: user.id,
          holidays,
          recurrenceConfig,
        });
        await applyStatus(tx, {
          taskId,
          from,
          to: "PENDING",
          actorType,
          userId: user.id,
          reason: "RECURRING_PERIOD_COMPLETED",
          completed: false,
        });
      } else {
        await applyStatus(tx, {
          taskId,
          from,
          to: "COMPLETED",
          actorType,
          userId: user.id,
          reason: "ADMIN_VALIDATED",
          completed: true,
        });
        await satisfyAndUnblock(tx, taskId, user.id, holidays);
      }

      const now = new Date();
      await tx
        .update(inboxItems)
        .set({ status: "RESOLVED", resolvedAt: now, resolvedBy: user.id, updatedAt: now })
        .where(
          and(eq(inboxItems.taskId, taskId), eq(inboxItems.kind, "DELIVERY_CLAIM"), eq(inboxItems.status, "OPEN")),
        );
    });
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "Não foi possível confirmar a entrega.");
  }
  revalidateAll(matrixId, taskId);
}

export async function rejectDeliveryClaimAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") fail("Somente administrador recusa validação.");

  const taskId = String(formData.get("taskId") ?? "");
  const matrixId = String(formData.get("matrixId") ?? "");
  if (!taskId) fail("Tarefa inválida.");

  const db = getDb();
  const actorType = "USER" as ActorType;

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!row) throw new Error("missing");
      const from = row.baseStatus as BaseStatus;
      if (from !== "WAITING_FOR_VALIDATION") {
        throw new DomainError("NOT_WAITING", "Tarefa não está aguardando validação.");
      }
      transitionOperationalStatus({
        from,
        to: "IN_PROGRESS",
        actorType,
        actorRole: user.role as UserRole,
      });
      await applyStatus(tx, {
        taskId,
        from,
        to: "IN_PROGRESS",
        actorType,
        userId: user.id,
        reason: "DELIVERY_REJECTED",
      });

      const now = new Date();
      await tx
        .update(inboxItems)
        .set({ status: "RESOLVED", resolvedAt: now, resolvedBy: user.id, updatedAt: now })
        .where(
          and(eq(inboxItems.taskId, taskId), eq(inboxItems.kind, "DELIVERY_CLAIM"), eq(inboxItems.status, "OPEN")),
        );
    });
  } catch (error) {
    fail(error instanceof DomainError ? error.message : "Não foi possível recusar a entrega.");
  }
  revalidateAll(matrixId, taskId);
}

export async function resolveInboxItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) fail("Item inválido.");
  const db = getDb();
  await db
    .update(inboxItems)
    .set({
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(inboxItems.id, itemId));
  revalidatePath("/inbox");
  revalidatePath("/");
}
