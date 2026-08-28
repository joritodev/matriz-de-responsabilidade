import { describe, expect, it } from "vitest";
import { computeDeadlineStatus } from "../deadline/status";
import { materializeFixedDate } from "../deadline/fixed-date";

const HOLIDAYS_2026 = ["2026-01-01", "2026-04-21", "2026-05-01", "2026-09-07", "2026-12-25"];

/** Casos canônicos do docs/09-test-plan.md §4 */
describe("casoA_matrizGeral_task1_prazoFixo", () => {
  const due = materializeFixedDate("2026-08-28");

  it("materializa data fixa 28/08/2026", () => {
    expect(due.currentDueDate).toBe("2026-08-28");
    expect(due.originalDueDate).toBe("2026-08-28");
  });

  it("deadlineStatus evolui com o relógio (A13)", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "IN_PROGRESS",
        currentDueDate: due.currentDueDate,
        today: "2026-08-20",
        holidays: HOLIDAYS_2026,
        dueSoonBusinessDays: 3,
      }),
    ).toBe("ON_TIME");

    expect(
      computeDeadlineStatus({
        baseStatus: "IN_PROGRESS",
        currentDueDate: due.currentDueDate,
        today: "2026-08-25",
        holidays: HOLIDAYS_2026,
        dueSoonBusinessDays: 3,
      }),
    ).toBe("DUE_SOON");

    expect(
      computeDeadlineStatus({
        baseStatus: "IN_PROGRESS",
        currentDueDate: due.currentDueDate,
        today: "2026-08-28",
        holidays: HOLIDAYS_2026,
        dueSoonBusinessDays: 3,
      }),
    ).toBe("DUE_TODAY");

    expect(
      computeDeadlineStatus({
        baseStatus: "IN_PROGRESS",
        currentDueDate: due.currentDueDate,
        today: "2026-08-31",
        holidays: HOLIDAYS_2026,
        dueSoonBusinessDays: 3,
      }),
    ).toBe("OVERDUE");
  });

  it("COMPLETED não fica atrasada", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "COMPLETED",
        currentDueDate: due.currentDueDate,
        today: "2026-09-01",
        holidays: HOLIDAYS_2026,
        dueSoonBusinessDays: 3,
      }),
    ).toBe("NOT_APPLICABLE");
  });
});

describe("casoB_dependencia_explicita", () => {
  it("WAITING_FOR_TRIGGER enquanto predecessora não concluída", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "PENDING",
        currentDueDate: null,
        today: "2026-08-20",
        holidays: HOLIDAYS_2026,
        dueSoonBusinessDays: 3,
        waitingForTrigger: true,
      }),
    ).toBe("WAITING_FOR_TRIGGER");
  });
});
