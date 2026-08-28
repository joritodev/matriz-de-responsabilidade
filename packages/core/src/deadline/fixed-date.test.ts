import { describe, expect, it } from "vitest";
import { materializeFixedDate } from "./fixed-date";

describe("unit_fixedDate", () => {
  it("FIXED_DATE materializa original_due_date = current_due_date", () => {
    const result = materializeFixedDate("2026-08-28");
    expect(result.originalDueDate).toBe("2026-08-28");
    expect(result.currentDueDate).toBe("2026-08-28");
    expect(result.waitingForTrigger).toBe(false);
  });

  it("unit_fixedDate_naoRecalculaQuandoDependenciaConclui — segunda materialização não sobrescreve original", () => {
    const first = materializeFixedDate("2026-08-28");
    const afterPredecessorDone = materializeFixedDate("2026-08-28", first);
    expect(afterPredecessorDone.originalDueDate).toBe("2026-08-28");
    expect(afterPredecessorDone.currentDueDate).toBe("2026-08-28");
  });
});
