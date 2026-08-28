/**
 * Ajuste administrativo de prazo (não é prorrogação).
 * Move todas as demandas com vencimento HOJE para uma nova data civil.
 *
 * Uso: tsx --env-file=../../.env scripts/fix-due-today-to-date.ts [YYYY-MM-DD]
 * Default destino: 2026-09-04
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { loadEnv } from "@matriz/config";
import { createDb } from "../src/client";
import { deadlineOccurrences, deadlineRules, matrices, taskNotes, tasks, users } from "../src/schema/index";

loadEnv();

const TARGET_DATE = process.argv[2] ?? "2026-09-04";
const REASON =
  "Ajuste de prazo (erro de comunicação) — não é prorrogação. Data corrigida para 04/09/2026.";

function todayCivil(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main() {
  const env = loadEnv();
  const { db, client } = createDb(env.databaseUrl);
  const today = todayCivil(env.tz);

  try {
    const dueToday = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        matrixName: matrices.name,
        sequenceNumber: tasks.sequenceNumber,
        currentDueDate: tasks.currentDueDate,
      })
      .from(tasks)
      .innerJoin(matrices, eq(matrices.id, tasks.matrixId))
      .where(
        and(
          eq(tasks.currentDueDate, today),
          isNull(tasks.completedAt),
          isNull(tasks.cancelledAt),
        ),
      );

    if (dueToday.length === 0) {
      console.log(`Nenhuma demanda aberta com prazo ${today}. Nada a fazer.`);
      return;
    }

    console.log(`Ajustando ${dueToday.length} demanda(s) de ${today} → ${TARGET_DATE}:\n`);
    for (const row of dueToday) {
      console.log(`  #${row.sequenceNumber} ${row.matrixName} — ${row.title}`);
    }

    const taskIds = dueToday.map((t) => t.id);
    const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN")).limit(1);
    const noteBy = admin?.id ?? dueToday[0]!.id;

    await db.transaction(async (tx) => {
      await tx
        .update(tasks)
        .set({
          originalDueDate: TARGET_DATE,
          currentDueDate: TARGET_DATE,
          cachedDeadlineStatus: null,
          deadlineStatusComputedAt: null,
          deadlineStatusAsOf: null,
          updatedAt: new Date(),
        })
        .where(inArray(tasks.id, taskIds));

      const rules = await tx.select().from(deadlineRules).where(inArray(deadlineRules.taskId, taskIds));
      for (const rule of rules) {
        const patch: Record<string, unknown> = {
          calculatedDueDate: TARGET_DATE,
          computedAt: new Date(),
          updatedAt: new Date(),
        };
        if (rule.deadlineType === "FIXED_DATE") {
          patch.fixedDate = TARGET_DATE;
        }
        if (rule.explanation && typeof rule.explanation === "object") {
          patch.explanation = {
            ...(rule.explanation as Record<string, unknown>),
            adminDateCorrection: { from: today, to: TARGET_DATE, reason: REASON },
          };
        }
        await tx.update(deadlineRules).set(patch).where(eq(deadlineRules.id, rule.id));
      }

      const openOcc = await tx
        .select()
        .from(deadlineOccurrences)
        .where(and(inArray(deadlineOccurrences.taskId, taskIds), eq(deadlineOccurrences.status, "OPEN")));
      for (const occ of openOcc) {
        await tx
          .update(deadlineOccurrences)
          .set({ dueDate: TARGET_DATE, updatedAt: new Date() })
          .where(eq(deadlineOccurrences.id, occ.id));
      }

      for (const taskId of taskIds) {
        await tx.insert(taskNotes).values({
          id: uuidv7(),
          taskId,
          body: REASON,
          createdBy: noteBy,
        });
      }
    });

    console.log(`\nConcluído. Rode npm run db:deadline-tick para recalcular status.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
