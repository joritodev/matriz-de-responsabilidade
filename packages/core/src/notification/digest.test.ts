import { describe, expect, it } from "vitest";
import {
  buildDigestMessage,
  dedupeKey,
  planDailyReminders,
  skipReasonFor,
  type ReminderCandidate,
} from "./digest";

const TODAY = "2026-08-28";

function candidate(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    taskId: "t1",
    responsibleId: "r1",
    responsibleName: "Matheus Silva",
    sequenceNumber: 3,
    taskTitle: "Elaborar versão 1",
    matrixName: "OD Academy",
    matrixArchived: false,
    dueDate: "2026-08-30",
    baseStatus: "PENDING",
    deadlineStatus: "DUE_SOON",
    responsibleActive: true,
    optInStatus: "OPTED_IN",
    alreadySentToday: false,
    ...overrides,
  };
}

describe("skipReasonFor (§6.2)", () => {
  it("não cobra tarefa concluída ou cancelada", () => {
    expect(skipReasonFor(candidate({ baseStatus: "COMPLETED" }))).toBe("TASK_CLOSED");
    expect(skipReasonFor(candidate({ baseStatus: "CANCELLED" }))).toBe("TASK_CLOSED");
  });

  it("não cobra quem aguarda gatilho", () => {
    expect(skipReasonFor(candidate({ deadlineStatus: "WAITING_FOR_TRIGGER" }))).toBe("WAITING_FOR_TRIGGER");
    expect(skipReasonFor(candidate({ deadlineStatus: "NOT_APPLICABLE" }))).toBe("WAITING_FOR_TRIGGER");
  });

  it("bloqueio não é atraso do responsável (A26)", () => {
    const reason = skipReasonFor(candidate({ baseStatus: "BLOCKED", deadlineStatus: "OVERDUE" }));
    expect(reason).toBe("BLOCKED_IS_NOT_LATE");
  });

  it("não manda sem pressão de prazo", () => {
    expect(skipReasonFor(candidate({ deadlineStatus: "ON_TIME" }))).toBe("NO_DEADLINE_PRESSURE");
  });

  it("respeita opt-out, inativo e matriz arquivada", () => {
    expect(skipReasonFor(candidate({ optInStatus: "OPTED_OUT" }))).toBe("OPTED_OUT");
    expect(skipReasonFor(candidate({ responsibleActive: false }))).toBe("RESPONSIBLE_INACTIVE");
    expect(skipReasonFor(candidate({ matrixArchived: true }))).toBe("MATRIX_ARCHIVED");
  });

  it("não repete no mesmo dia", () => {
    expect(skipReasonFor(candidate({ alreadySentToday: true }))).toBe("ALREADY_SENT_TODAY");
  });

  it("libera quando há pressão real", () => {
    expect(skipReasonFor(candidate({ deadlineStatus: "OVERDUE" }))).toBeNull();
    expect(skipReasonFor(candidate({ deadlineStatus: "DUE_TODAY" }))).toBeNull();
  });
});

describe("planDailyReminders", () => {
  it("uma tarefa por pessoa gera mensagem unitária", () => {
    const plan = planDailyReminders([candidate()], { today: TODAY });
    expect(plan.planned).toHaveLength(1);
    expect(plan.planned[0]!.kind).toBe("SINGLE");
    expect(plan.planned[0]!.message).toContain("Oi, Matheus!");
  });

  it("duas ou mais tarefas da mesma pessoa viram um único digest (A25)", () => {
    const plan = planDailyReminders(
      [
        candidate({ taskId: "t1", sequenceNumber: 1 }),
        candidate({ taskId: "t2", sequenceNumber: 2, deadlineStatus: "OVERDUE" }),
      ],
      { today: TODAY },
    );

    expect(plan.planned).toHaveLength(1);
    const [only] = plan.planned;
    expect(only!.kind).toBe("DIGEST");
    expect(only!.taskIds).toEqual(["t2", "t1"]);
    expect(only!.dedupeKeys).toHaveLength(2);
    expect(only!.message).toContain("2 demandas");
  });

  it("pessoas diferentes não se misturam e saem em ordem alfabética", () => {
    const plan = planDailyReminders(
      [
        candidate({ responsibleId: "r2", responsibleName: "Zeca", taskId: "t9" }),
        candidate({ responsibleId: "r1", responsibleName: "Ana", taskId: "t8" }),
      ],
      { today: TODAY },
    );
    expect(plan.planned.map((p) => p.responsibleName)).toEqual(["Ana", "Zeca"]);
  });

  it("ALWAYS_PER_TASK desliga o digest", () => {
    const plan = planDailyReminders(
      [candidate({ taskId: "t1" }), candidate({ taskId: "t2" })],
      { today: TODAY, strategy: "ALWAYS_PER_TASK" },
    );
    expect(plan.planned).toHaveLength(2);
    expect(plan.planned.every((p) => p.kind === "SINGLE")).toBe(true);
  });

  it("registra os pulos com motivo para auditoria", () => {
    const plan = planDailyReminders(
      [candidate({ baseStatus: "COMPLETED" }), candidate({ taskId: "t2", optInStatus: "OPTED_OUT" })],
      { today: TODAY },
    );
    expect(plan.planned).toHaveLength(0);
    expect(plan.skipped.map((s) => s.reason)).toEqual(["TASK_CLOSED", "OPTED_OUT"]);
  });

  it("atrasada vem antes de vence hoje, que vem antes de vence em breve", () => {
    const plan = planDailyReminders(
      [
        candidate({ taskId: "soon", deadlineStatus: "DUE_SOON" }),
        candidate({ taskId: "late", deadlineStatus: "OVERDUE" }),
        candidate({ taskId: "today", deadlineStatus: "DUE_TODAY" }),
      ],
      { today: TODAY },
    );
    expect(plan.planned[0]!.taskIds).toEqual(["late", "today", "soon"]);
  });
});

describe("buildDigestMessage", () => {
  it("trunca em maxLines e informa o resto (WA-A4)", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      candidate({ taskId: `t${i}`, sequenceNumber: i + 1, deadlineStatus: "OVERDUE" }),
    );
    const text = buildDigestMessage(many, 5);
    expect(text).toContain("7 demandas");
    expect(text).toContain("e mais 2 no sistema");
  });

  it("marca atrasada e vence hoje nas linhas", () => {
    const text = buildDigestMessage([
      candidate({ deadlineStatus: "OVERDUE" }),
      candidate({ taskId: "t2", sequenceNumber: 4, deadlineStatus: "DUE_TODAY" }),
    ]);
    expect(text).toContain("— atrasada");
    expect(text).toContain("— vence hoje");
  });
});

describe("dedupeKey", () => {
  it("inclui tarefa, responsável e dia", () => {
    expect(dedupeKey(candidate(), TODAY)).toBe("task:t1:responsible:r1:day:2026-08-28");
  });
});
