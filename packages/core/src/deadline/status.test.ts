import { describe, expect, it } from "vitest";
import { computeDeadlineStatus } from "./status";

describe("unit_deadline_status", () => {
  it("unit_overdue_calculadoNaoPersistidoComoBase — IN_PROGRESS + relógio > due → OVERDUE", () => {
    const result = computeDeadlineStatus({
      baseStatus: "IN_PROGRESS",
      currentDueDate: "2026-08-20",
      today: "2026-08-27",
      holidays: [],
      dueSoonBusinessDays: 3,
    });
    expect(result).toBe("OVERDUE");
  });

  it("unit_completed_deadlineNotApplicable", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "COMPLETED",
        currentDueDate: "2026-08-20",
        today: "2026-08-27",
        holidays: [],
        dueSoonBusinessDays: 3,
      }),
    ).toBe("NOT_APPLICABLE");
    expect(
      computeDeadlineStatus({
        baseStatus: "CANCELLED",
        currentDueDate: "2026-08-20",
        today: "2026-08-27",
        holidays: [],
        dueSoonBusinessDays: 3,
      }),
    ).toBe("NOT_APPLICABLE");
  });

  it("vence hoje", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "PENDING",
        currentDueDate: "2026-08-27",
        today: "2026-08-27",
        holidays: [],
        dueSoonBusinessDays: 3,
      }),
    ).toBe("DUE_TODAY");
  });

  it("vence em breve dentro de N dias úteis", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "PENDING",
        currentDueDate: "2026-08-31",
        today: "2026-08-27",
        holidays: [],
        dueSoonBusinessDays: 3,
      }),
    ).toBe("DUE_SOON");
  });

  it("sem prazo vigente → NOT_APPLICABLE", () => {
    expect(
      computeDeadlineStatus({
        baseStatus: "PENDING",
        currentDueDate: null,
        today: "2026-08-27",
        holidays: [],
        dueSoonBusinessDays: 3,
      }),
    ).toBe("NOT_APPLICABLE");
  });
});
