import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { loadEnv } from "@matriz/config";
import {
  assertCanAddDependency,
  blockedByUnsatisfiedDeps,
  materializeBusinessDaysAfterDependency,
  materializeFixedDate,
  materializeMonthlyOccurrence,
  type MatrixType,
} from "@matriz/core";
import { createDb } from "../src/client";
import {
  businessCalendars,
  deadlineOccurrences,
  deadlineRules,
  matrices,
  responsibles,
  taskDependencies,
  taskResponsibles,
  tasks,
  users,
} from "../src/schema/index";

type ResponsibleKey = "matheus" | "giovanni" | "francisco" | "unyleya" | "samps" | "fenilli";

type SeedDeadline =
  | { kind: "fixed"; isoDate: string }
  | { kind: "manual"; label: string }
  | { kind: "business_days_after_dependency"; amount: number }
  | { kind: "recurring_business_day"; nth: number; year: number; month: number };

type SeedTask = {
  sequence: number;
  responsibleKeys: ResponsibleKey[];
  title: string;
  deadline: SeedDeadline;
  dependsOnSequence?: number;
  description?: string;
};

type SeedMatrix = {
  name: string;
  description: string;
  type: MatrixType;
  tasks: SeedTask[];
};

const RESPONSIBLE_DEFS: Record<ResponsibleKey, { name: string; role: string }> = {
  matheus: { name: "Matheus", role: "Administrador/Site" },
  giovanni: { name: "Giovanni Pacelli", role: "Professor" },
  francisco: { name: "Francisco Netto", role: "Professor" },
  unyleya: { name: "Unyleya", role: "Instituição" },
  samps: { name: "Samps Digital", role: "Marketing" },
  fenilli: { name: "Renato Fenilli", role: "Professor" },
};

const PDF_MATRICES: SeedMatrix[] = [
  {
    name: "Responsabilização Geral",
    description: "Importado do PDF — matriz geral",
    type: "GENERAL",
    tasks: [
      {
        sequence: 1,
        responsibleKeys: ["matheus"],
        title: "Atualizar a Assinatura Suprema no Site",
        deadline: { kind: "fixed", isoDate: "2026-08-28" },
      },
      {
        sequence: 2,
        responsibleKeys: ["matheus"],
        title: "Efetuar os Pagamentos da Pós do mês de Agosto",
        deadline: { kind: "fixed", isoDate: "2026-08-28" },
      },
      {
        sequence: 3,
        responsibleKeys: ["matheus"],
        title: "Divulgar as disciplinas do mês nos grupos dos professores da Pós",
        deadline: { kind: "recurring_business_day", nth: 3, year: 2026, month: 8 },
      },
      {
        sequence: 4,
        responsibleKeys: ["matheus"],
        title: "Atualização de todos os Currículos no site",
        deadline: { kind: "fixed", isoDate: "2026-09-10" },
      },
      {
        sequence: 5,
        responsibleKeys: ["matheus"],
        title: "Remover professores que não estão comprometidos com nenhum curso",
        deadline: { kind: "fixed", isoDate: "2026-09-15" },
      },
      {
        sequence: 6,
        responsibleKeys: ["matheus"],
        title: "Validar com o Eldis a data da audiência da ação contra a Fabiana",
        deadline: { kind: "fixed", isoDate: "2026-09-04" },
      },
      {
        sequence: 7,
        responsibleKeys: ["matheus"],
        title: "Emitir Passagens para Brasília para Giovanni, Eldis e Nathan",
        deadline: { kind: "fixed", isoDate: "2026-09-20" },
        dependsOnSequence: 6,
      },
      {
        sequence: 8,
        responsibleKeys: ["matheus"],
        title: "Dar acesso integral a Emmen dos sistemas financeiros",
        deadline: { kind: "fixed", isoDate: "2026-09-15" },
      },
    ],
  },
  {
    name: "Ordenador de Despesas Presencial",
    description: "Importado do PDF",
    type: "PROJECT",
    tasks: [
      {
        sequence: 1,
        responsibleKeys: ["giovanni", "francisco"],
        title: "Definir Ementa",
        deadline: { kind: "fixed", isoDate: "2026-09-30" },
      },
      {
        sequence: 2,
        responsibleKeys: ["giovanni", "francisco"],
        title: "Definir o modelo de remuneração do projeto",
        deadline: { kind: "fixed", isoDate: "2026-09-30" },
      },
      {
        sequence: 3,
        responsibleKeys: ["matheus"],
        title: "Elaborar a Planilha Financeira e Determinar o ponto de equilíbrio",
        deadline: { kind: "fixed", isoDate: "2026-10-15" },
        dependsOnSequence: 2,
      },
    ],
  },
  {
    name: "Pós-Graduação Ordenação de Despesas",
    description: "Importado do PDF — primeira turma em 29/10",
    type: "COURSE",
    tasks: [
      {
        sequence: 1,
        responsibleKeys: ["unyleya"],
        title: "Lançar a Pós no site",
        deadline: { kind: "fixed", isoDate: "2026-08-31" },
        description: "Primeira turma começa no dia 29 de outubro",
      },
      {
        sequence: 2,
        responsibleKeys: ["giovanni", "francisco"],
        title: "Definir a data da live de lançamento da Pós",
        deadline: { kind: "fixed", isoDate: "2026-09-11" },
      },
      {
        sequence: 3,
        responsibleKeys: ["samps"],
        title: "Preparar material para a live",
        deadline: { kind: "business_days_after_dependency", amount: 15 },
        dependsOnSequence: 2,
      },
    ],
  },
  {
    name: "OD Academy",
    description: "Importado do PDF",
    type: "COURSE",
    tasks: [
      {
        sequence: 1,
        responsibleKeys: ["fenilli"],
        title: "Definir o escopo do material necessário",
        deadline: { kind: "fixed", isoDate: "2026-09-11" },
      },
      {
        sequence: 2,
        responsibleKeys: ["giovanni", "francisco"],
        title: "Levantar os materiais e organizar para envio ao Fenilli",
        deadline: { kind: "fixed", isoDate: "2026-09-25" },
        dependsOnSequence: 1,
      },
      {
        sequence: 3,
        responsibleKeys: ["fenilli"],
        title: "Elaborar versão 1 do OD Academy",
        deadline: { kind: "fixed", isoDate: "2026-10-25" },
        dependsOnSequence: 2,
      },
    ],
  },
  {
    name: "Licitaweek 5ª Edição",
    description: "Importado do PDF",
    type: "EVENT",
    tasks: [
      {
        sequence: 1,
        responsibleKeys: ["giovanni", "fenilli", "francisco"],
        title: "Definir data, ementa e participantes",
        deadline: { kind: "fixed", isoDate: "2026-09-30" },
      },
    ],
  },
];

async function main() {
  const env = loadEnv();
  const { db, client } = createDb(env.databaseUrl);

  const [admin] = await db.select().from(users).where(eq(users.email, "admin@local.test"));
  if (!admin) throw new Error("seed admin missing");

  const [calendar] = await db
    .select()
    .from(businessCalendars)
    .where(eq(businessCalendars.code, "BR-NATIONAL"));
  if (!calendar) throw new Error("calendar missing");

  const existing = await db.select().from(matrices);
  if (existing.some((m) => m.name === "Responsabilização Geral")) {
    console.log("PDF matrices already imported");
    return;
  }

  const responsibleIds = new Map<ResponsibleKey, string>();
  for (const [key, def] of Object.entries(RESPONSIBLE_DEFS) as [ResponsibleKey, { name: string; role: string }][]) {
    const found = await db.select().from(responsibles).where(eq(responsibles.name, def.name)).limit(1);
    if (found[0]) {
      responsibleIds.set(key, found[0].id);
      continue;
    }
    const id = uuidv7();
    await db.insert(responsibles).values({
      id,
      name: def.name,
      role: def.role,
    });
    responsibleIds.set(key, id);
  }

  for (const matrixSeed of PDF_MATRICES) {
    const matrixId = uuidv7();
    await db.insert(matrices).values({
      id: matrixId,
      name: matrixSeed.name,
      description: matrixSeed.description,
      type: matrixSeed.type,
      createdBy: admin.id,
    });

    const taskIds = new Map<number, string>();
    const taskStatuses = new Map<number, string>();

    for (const taskSeed of matrixSeed.tasks) {
      const taskId = uuidv7();
      taskIds.set(taskSeed.sequence, taskId);

      const deadlineNote =
        taskSeed.deadline.kind === "manual"
          ? `Prazo: ${taskSeed.deadline.label}`
          : taskSeed.deadline.kind === "business_days_after_dependency"
            ? `Prazo: ${taskSeed.deadline.amount} dias úteis após dependência`
            : taskSeed.deadline.kind === "recurring_business_day"
              ? `Prazo: ${taskSeed.deadline.nth}º dia útil de cada mês`
              : undefined;
      const description = [taskSeed.description, deadlineNote].filter(Boolean).join(" — ") || null;

      let originalDueDate: string | null = null;
      let currentDueDate: string | null = null;
      let deadlineType:
        | "FIXED_DATE"
        | "MANUAL"
        | "BUSINESS_DAYS_AFTER_DEPENDENCY"
        | "RECURRING_BUSINESS_DAY" = "MANUAL";
      let fixedDate: string | null = null;
      let amount: number | null = null;
      let waitingForTrigger = false;
      let recurrenceConfig: Record<string, unknown> | null = null;
      let explanation: Record<string, unknown>;
      let occurrenceMaterialized: ReturnType<typeof materializeMonthlyOccurrence> | null = null;

      if (taskSeed.deadline.kind === "fixed") {
        const dates = materializeFixedDate(taskSeed.deadline.isoDate);
        originalDueDate = dates.originalDueDate;
        currentDueDate = dates.currentDueDate;
        deadlineType = "FIXED_DATE";
        fixedDate = taskSeed.deadline.isoDate;
        explanation = { type: "FIXED_DATE", date: taskSeed.deadline.isoDate };
      } else if (taskSeed.deadline.kind === "business_days_after_dependency") {
        const dates = materializeBusinessDaysAfterDependency(null, taskSeed.deadline.amount, []);
        originalDueDate = dates.originalDueDate;
        currentDueDate = dates.currentDueDate;
        deadlineType = "BUSINESS_DAYS_AFTER_DEPENDENCY";
        amount = taskSeed.deadline.amount;
        waitingForTrigger = dates.waitingForTrigger;
        explanation = {
          type: "BUSINESS_DAYS_AFTER_DEPENDENCY",
          amount: taskSeed.deadline.amount,
          waitingForTrigger: dates.waitingForTrigger,
        };
      } else if (taskSeed.deadline.kind === "recurring_business_day") {
        occurrenceMaterialized = materializeMonthlyOccurrence(
          taskSeed.deadline.year,
          taskSeed.deadline.month,
          taskSeed.deadline.nth,
          [],
        );
        originalDueDate = occurrenceMaterialized.dueDate;
        currentDueDate = occurrenceMaterialized.dueDate;
        deadlineType = "RECURRING_BUSINESS_DAY";
        amount = taskSeed.deadline.nth;
        recurrenceConfig = {
          nth: taskSeed.deadline.nth,
          unit: "BUSINESS_DAY",
          period: "MONTH",
          startPolicy: "CURRENT_PERIOD",
        };
        explanation = occurrenceMaterialized.explanation;
      } else {
        explanation = { type: "MANUAL", label: taskSeed.deadline.label };
        waitingForTrigger = Boolean(taskSeed.dependsOnSequence);
      }

      let baseStatus: "PENDING" | "BLOCKED" = "PENDING";
      if (taskSeed.dependsOnSequence) {
        const predecessorStatus = taskStatuses.get(taskSeed.dependsOnSequence) ?? "PENDING";
        const blocked = blockedByUnsatisfiedDeps([
          { dependsOnTaskId: "x", predecessorStatus: predecessorStatus as "PENDING" },
        ]);
        if (blocked.length > 0) baseStatus = "BLOCKED";
      }

      await db.insert(tasks).values({
        id: taskId,
        matrixId,
        sequenceNumber: taskSeed.sequence,
        displayOrder: taskSeed.sequence,
        title: taskSeed.title,
        description,
        baseStatus,
        originalDueDate,
        currentDueDate,
        createdBy: admin.id,
      });

      const ruleId = uuidv7();
      await db.insert(deadlineRules).values({
        id: ruleId,
        taskId,
        deadlineType,
        fixedDate,
        amount,
        unit: amount ? "BUSINESS_DAY" : null,
        recurrenceConfig,
        calendarId: calendar.id,
        calculatedDueDate: currentDueDate,
        explanation,
        waitingForTrigger,
      });

      if (occurrenceMaterialized) {
        await db.insert(deadlineOccurrences).values({
          id: uuidv7(),
          taskId,
          deadlineRuleId: ruleId,
          periodStart: occurrenceMaterialized.periodStart,
          periodEnd: occurrenceMaterialized.periodEnd,
          dueDate: occurrenceMaterialized.dueDate,
          status: "OPEN",
          explanation: occurrenceMaterialized.explanation,
        });
      }

      for (const responsibleKey of taskSeed.responsibleKeys) {
        const responsibleId = responsibleIds.get(responsibleKey);
        if (!responsibleId) throw new Error(`missing responsible ${responsibleKey}`);
        await db.insert(taskResponsibles).values({
          id: uuidv7(),
          taskId,
          responsibleId,
          assignedBy: admin.id,
        });
      }

      taskStatuses.set(taskSeed.sequence, baseStatus);
    }

    const edges: { taskId: string; dependsOnTaskId: string; taskSequence: number; dependsOnSequence: number }[] = [];
    for (const taskSeed of matrixSeed.tasks) {
      if (!taskSeed.dependsOnSequence) continue;
      const taskId = taskIds.get(taskSeed.sequence);
      const dependsOnTaskId = taskIds.get(taskSeed.dependsOnSequence);
      if (!taskId || !dependsOnTaskId) throw new Error("dependency mapping failed");
      edges.push({
        taskId,
        dependsOnTaskId,
        taskSequence: taskSeed.sequence,
        dependsOnSequence: taskSeed.dependsOnSequence,
      });
    }

    const existingEdges = edges.map((e) => ({ taskId: e.taskId, dependsOnTaskId: e.dependsOnTaskId }));
    for (const edge of edges) {
      assertCanAddDependency(existingEdges.filter((e) => e.taskId !== edge.taskId), {
        taskId: edge.taskId,
        dependsOnTaskId: edge.dependsOnTaskId,
      });
      await db.insert(taskDependencies).values({
        id: uuidv7(),
        taskId: edge.taskId,
        dependsOnTaskId: edge.dependsOnTaskId,
        createdBy: admin.id,
      });
    }

    console.log(`imported: ${matrixSeed.name} (${matrixSeed.tasks.length} tarefas)`);
  }

  console.log("PDF import complete");
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
