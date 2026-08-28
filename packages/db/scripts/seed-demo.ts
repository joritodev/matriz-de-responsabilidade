import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import {
  andDependenciesSatisfied,
  assertCanAddDependency,
  materializeFixedDate,
  nextSequenceNumber,
  normalizeE164,
} from "@matriz/core";
import { createDb } from "../src/client";
import {
  businessCalendars,
  deadlineRules,
  matrices,
  responsibles,
  taskDependencies,
  taskResponsibles,
  tasks,
  users,
} from "../src/schema/index";

const { db, client } = createDb(process.env.DATABASE_URL!);

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@local.test"));
  if (!admin) throw new Error("seed admin missing");
  const [calendar] = await db.select().from(businessCalendars).where(eq(businessCalendars.code, "BR-NATIONAL"));
  if (!calendar) throw new Error("calendar missing");

  const existingGeral = await db.select().from(matrices);
  if (existingGeral.some((m) => m.name === "Matriz Geral")) {
    console.log("demo data already present");
    return;
  }

  const geralId = uuidv7();
  const academyId = uuidv7();
  await db.insert(matrices).values([
    { id: geralId, name: "Matriz Geral", description: "Demandas transversais", type: "GENERAL", createdBy: admin.id },
    { id: academyId, name: "OD Academy", description: "Curso", type: "COURSE", createdBy: admin.id },
  ]);

  const matheusId = uuidv7();
  const giovanniId = uuidv7();
  const franciscoId = uuidv7();
  await db.insert(responsibles).values([
    {
      id: matheusId,
      name: "Matheus",
      role: "Operação",
      whatsappNumber: "11 99988-7766",
      whatsappNumberE164: normalizeE164("11 99988-7766"),
    },
    { id: giovanniId, name: "Giovanni", role: "Professor" },
    { id: franciscoId, name: "Francisco", role: "Professor" },
  ]);

  const seq = nextSequenceNumber([]);
  const dates = materializeFixedDate("2026-08-28");
  const task1 = uuidv7();
  await db.insert(tasks).values({
    id: task1,
    matrixId: geralId,
    sequenceNumber: seq,
    displayOrder: seq,
    title: "Demanda inicial",
    description: "Caso A — prazo fixo, sem pré-requisito",
    baseStatus: "PENDING",
    originalDueDate: dates.originalDueDate,
    currentDueDate: dates.currentDueDate,
    createdBy: admin.id,
  });
  await db.insert(deadlineRules).values({
    id: uuidv7(),
    taskId: task1,
    deadlineType: "FIXED_DATE",
    fixedDate: "2026-08-28",
    calendarId: calendar.id,
    calculatedDueDate: dates.currentDueDate,
    explanation: { type: "FIXED_DATE", date: "2026-08-28" },
  });
  await db.insert(taskResponsibles).values({
    id: uuidv7(),
    taskId: task1,
    responsibleId: matheusId,
    assignedBy: admin.id,
  });

  const t2 = uuidv7();
  const t3 = uuidv7();
  await db.insert(tasks).values([
    {
      id: t2,
      matrixId: academyId,
      sequenceNumber: 1,
      displayOrder: 1,
      title: "Elaborar versão 1",
      baseStatus: "PENDING",
      originalDueDate: "2026-09-10",
      currentDueDate: "2026-09-10",
      createdBy: admin.id,
    },
    {
      id: t3,
      matrixId: academyId,
      sequenceNumber: 2,
      displayOrder: 2,
      title: "Revisar versão 1",
      baseStatus: "BLOCKED",
      originalDueDate: "2026-09-15",
      currentDueDate: "2026-09-15",
      createdBy: admin.id,
    },
  ]);
  for (const taskId of [t2, t3]) {
    await db.insert(deadlineRules).values({
      id: uuidv7(),
      taskId,
      deadlineType: "FIXED_DATE",
      calendarId: calendar.id,
      fixedDate: taskId === t2 ? "2026-09-10" : "2026-09-15",
    });
  }
  await db.insert(taskResponsibles).values([
    { id: uuidv7(), taskId: t2, responsibleId: giovanniId, assignedBy: admin.id },
    { id: uuidv7(), taskId: t2, responsibleId: franciscoId, assignedBy: admin.id },
  ]);
  assertCanAddDependency([], { taskId: t3, dependsOnTaskId: t2 });
  await db.insert(taskDependencies).values({
    id: uuidv7(),
    taskId: t3,
    dependsOnTaskId: t2,
    createdBy: admin.id,
  });
  let cycleOk = false;
  try {
    assertCanAddDependency([{ taskId: t3, dependsOnTaskId: t2 }], { taskId: t2, dependsOnTaskId: t3 });
  } catch {
    cycleOk = true;
  }
  if (!cycleOk) throw new Error("cycle should be rejected");
  if (andDependenciesSatisfied([{ dependsOnTaskId: t2, predecessorStatus: "PENDING" }])) {
    throw new Error("AND should block");
  }
  console.log("demo ok", { geralId, academyId, e164: normalizeE164("11 99988-7766") });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => client.end());
