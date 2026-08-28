import { describe, expect, it } from "vitest";
import { formatDeadlineExplanation } from "./explain";

describe("formatDeadlineExplanation", () => {
  it("FIXED_DATE", () => {
    expect(
      formatDeadlineExplanation("FIXED_DATE", { type: "FIXED_DATE", date: "2026-08-28" }),
    ).toContain("28/08/2026");
  });

  it("BUSINESS_DAYS_AFTER_DEPENDENCY aguardando gatilho", () => {
    expect(
      formatDeadlineExplanation("BUSINESS_DAYS_AFTER_DEPENDENCY", {
        type: "BUSINESS_DAYS_AFTER_DEPENDENCY",
        amount: 15,
        waitingForTrigger: true,
      }),
    ).toContain("Aguardando");
  });

  it("CALENDAR_DAYS_AFTER_TRIGGER aguardando gatilho", () => {
    expect(
      formatDeadlineExplanation("CALENDAR_DAYS_AFTER_TRIGGER", {
        type: "CALENDAR_DAYS_AFTER_TRIGGER",
        amount: 10,
        waitingForTrigger: true,
      }),
    ).toContain("dias corridos");
  });

  it("RECURRING_BUSINESS_DAY", () => {
    expect(
      formatDeadlineExplanation("RECURRING_BUSINESS_DAY", {
        type: "RECURRING_BUSINESS_DAY",
        nth: 3,
        year: 2026,
        month: 8,
        dueDate: "2026-08-05",
      }),
    ).toContain("3º dia útil");
  });
});
