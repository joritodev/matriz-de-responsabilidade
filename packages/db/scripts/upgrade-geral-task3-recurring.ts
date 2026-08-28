import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { loadEnv } from "@matriz/config";
import { materializeMonthlyOccurrence } from "@matriz/core";
import { createDb } from "../src/client";
import {
  businessCalendars,
  deadlineOccurrences,
  deadlineRules,
  holidays,
  matrices,
  tasks,
} from "../src/schema/index";

loadEnv();

const TASK_TITLE = "Divulgar as disciplinas do mês nos grupos dos professores da Pós";
const MATRIX_NAME = "Responsabilização Geral";
const INITIAL_YEAR = 2026;
const INITIAL_MONTH = 8;
const NTH = 3;

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
    if (rule?.deadlineType === "RECURRING_BUSINESS_DAY") {
      console.log("Regra já atualizada.");
      return;
    }

    const [calendar] = await db.select().from(businessCalendars).limit(1);
    const holidayRows = calendar
      ? await db.select({ observedOn: holidays.observedOn }).from(holidays).where(eq(holidays.calendarId, calendar.id))
      : [];
    const holidayList = holidayRows.map((h) => h.observedOn);
    const materialized = materializeMonthlyOccurrence(INITIAL_YEAR, INITIAL_MONTH, NTH, holidayList);
    const ruleId = rule?.id ?? uuidv7();

    if (rule) {
      await db
        .update(deadlineRules)
        .set({
          deadlineType: "RECURRING_BUSINESS_DAY",
          fixedDate: null,
          amount: NTH,
          unit: "BUSINESS_DAY",
          recurrenceConfig: {
            nth: NTH,
            unit: "BUSINESS_DAY",
            period: "MONTH",
            startPolicy: "CURRENT_PERIOD",
          },
          calculatedDueDate: materialized.dueDate,
          waitingForTrigger: false,
          explanation: materialized.explanation,
          computedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deadlineRules.id, rule.id));
    } else {
      if (!calendar) throw new Error("calendar missing");
      await db.insert(deadlineRules).values({
        id: ruleId,
        taskId: task.id,
        deadlineType: "RECURRING_BUSINESS_DAY",
        amount: NTH,
        unit: "BUSINESS_DAY",
        recurrenceConfig: {
          nth: NTH,
          unit: "BUSINESS_DAY",
          period: "MONTH",
          startPolicy: "CURRENT_PERIOD",
        },
        calendarId: calendar.id,
        calculatedDueDate: materialized.dueDate,
        waitingForTrigger: false,
        explanation: materialized.explanation,
        computedAt: new Date(),
      });
    }

    const existingOccurrence = await db
      .select()
      .from(deadlineOccurrences)
      .where(eq(deadlineOccurrences.taskId, task.id))
      .limit(1);
    if (existingOccurrence.length === 0) {
      await db.insert(deadlineOccurrences).values({
        id: uuidv7(),
        taskId: task.id,
        deadlineRuleId: ruleId,
        periodStart: materialized.periodStart,
        periodEnd: materialized.periodEnd,
        dueDate: materialized.dueDate,
        status: "OPEN",
        explanation: materialized.explanation,
      });
    }

    await db
      .update(tasks)
      .set({
        originalDueDate: materialized.dueDate,
        currentDueDate: materialized.dueDate,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    console.log(
      `Atualizado: "${TASK_TITLE}" → RECURRING_BUSINESS_DAY (${NTH}º dia útil, due ${materialized.dueDate}).`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
