import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { loadEnv } from "@matriz/config";
import { materializeBusinessDaysAfterDependency } from "@matriz/core";
import { createDb } from "../src/client";
import { businessCalendars, deadlineRules, matrices, tasks } from "../src/schema/index";

loadEnv();

const TASK_TITLE = "Preparar material para a live";
const MATRIX_NAME = "Pós-Graduação Ordenação de Despesas";

async function main() {
  const env = loadEnv();
  const { db, client } = createDb(env.databaseUrl);

  try {
    const [matrix] = await db.select().from(matrices).where(eq(matrices.name, MATRIX_NAME)).limit(1);
    if (!matrix) {
      console.log(`Matriz "${MATRIX_NAME}" não encontrada — nada a fazer.`);
      return;
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.matrixId, matrix.id), eq(tasks.title, TASK_TITLE)))
      .limit(1);
    if (!task) {
      console.log(`Tarefa "${TASK_TITLE}" não encontrada — nada a fazer.`);
      return;
    }

    const [rule] = await db.select().from(deadlineRules).where(eq(deadlineRules.taskId, task.id)).limit(1);
    if (rule?.deadlineType === "BUSINESS_DAYS_AFTER_DEPENDENCY" && rule.amount === 15) {
      console.log("Regra já atualizada.");
      return;
    }

    const [calendar] = await db.select().from(businessCalendars).limit(1);
    const materialized = materializeBusinessDaysAfterDependency(null, 15, []);

    if (rule) {
      await db
        .update(deadlineRules)
        .set({
          deadlineType: "BUSINESS_DAYS_AFTER_DEPENDENCY",
          fixedDate: null,
          amount: 15,
          unit: "BUSINESS_DAY",
          calculatedDueDate: materialized.currentDueDate,
          waitingForTrigger: materialized.waitingForTrigger,
          explanation: {
            type: "BUSINESS_DAYS_AFTER_DEPENDENCY",
            amount: 15,
            waitingForTrigger: materialized.waitingForTrigger,
            upgradedFrom: rule.deadlineType,
          },
          computedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deadlineRules.id, rule.id));
    } else {
      await db.insert(deadlineRules).values({
        id: uuidv7(),
        taskId: task.id,
        deadlineType: "BUSINESS_DAYS_AFTER_DEPENDENCY",
        amount: 15,
        unit: "BUSINESS_DAY",
        calendarId: calendar?.id ?? null,
        calculatedDueDate: materialized.currentDueDate,
        waitingForTrigger: materialized.waitingForTrigger,
        explanation: {
          type: "BUSINESS_DAYS_AFTER_DEPENDENCY",
          amount: 15,
          waitingForTrigger: materialized.waitingForTrigger,
        },
        computedAt: new Date(),
      });
    }

    await db
      .update(tasks)
      .set({
        originalDueDate: materialized.originalDueDate,
        currentDueDate: materialized.currentDueDate,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    console.log(`Atualizado: "${TASK_TITLE}" → BUSINESS_DAYS_AFTER_DEPENDENCY (15 dias úteis).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
