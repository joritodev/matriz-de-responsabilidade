"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";
import { eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import {
  DomainError,
  MATRIX_TYPES,
  andDependenciesSatisfied,
  assertCanAddDependency,
  claimDelivered,
  materializeFixedDate,
  nextSequenceNumber,
  normalizeE164,
  transitionOperationalStatus,
  type ActorType,
  type BaseStatus,
  type UserRole,
} from "@matriz/core";
import {
  auditLogs,
  deadlineRules,
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
import { getDb } from "./db";
import { getDefaultCalendarId } from "./queries";

function fail(message: string): never {
  throw new Error(message);
}

function revalidateAll(matrixId?: string, taskId?: string) {
  revalidatePath("/");
  revalidatePath("/matrices");
  revalidatePath("/overview");
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
  const responsibleIds = formData.getAll("responsibleIds").map(String).filter(Boolean);
  const dependsOnIds = formData.getAll("dependsOnIds").map(String).filter(Boolean);
  if (!title) fail("Título obrigatório.");
  if (deadlineType === "FIXED_DATE" && !fixedDate) fail("Informe a data do prazo fixo.");

  const db = getDb();
  try {
    const taskId = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM matrices WHERE id = ${matrixId} FOR UPDATE`);
      const existing = await tx.select({ n: tasks.sequenceNumber }).from(tasks).where(eq(tasks.matrixId, matrixId));
      const sequenceNumber = nextSequenceNumber(existing.map((r) => r.n));
      const calendarId = await getDefaultCalendarId();
      const dates =
        deadlineType === "FIXED_DATE" && fixedDate ? materializeFixedDate(fixedDate) : null;
      const id = uuidv7();

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
        originalDueDate: dates?.originalDueDate ?? null,
        currentDueDate: dates?.currentDueDate ?? null,
        createdBy: user.id,
      });
      await tx.insert(deadlineRules).values({
        id: uuidv7(),
        taskId: id,
        deadlineType,
        fixedDate: deadlineType === "FIXED_DATE" ? fixedDate : null,
        calendarId,
        calculatedDueDate: dates?.currentDueDate ?? null,
        waitingForTrigger: false,
        explanation: dates
          ? { type: "FIXED_DATE", date: dates.currentDueDate, source: "cadastro" }
          : { type: deadlineType },
        computedAt: new Date(),
      });
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
        return;
      }
      transitionOperationalStatus({
        from,
        to,
        actorType,
        actorRole: user.role as UserRole,
      });
      const completed = to === "COMPLETED";
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
        await satisfyAndUnblock(tx, taskId, user.id);
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

async function satisfyAndUnblock(
  tx: {
    update: ReturnType<typeof getDb>["update"];
    insert: ReturnType<typeof getDb>["insert"];
    select: ReturnType<typeof getDb>["select"];
  },
  completedTaskId: string,
  userId: string,
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
