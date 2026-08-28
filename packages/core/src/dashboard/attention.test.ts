import { describe, expect, it } from "vitest";
import { attentionRank } from "./attention";

describe("unit_attention_rank", () => {
  it("prioridade de atenção não usa sequence_number", () => {
    const a = {
      sequenceNumber: 1,
      deadlineStatus: "ON_TIME" as const,
      baseStatus: "PENDING" as const,
      extensionStatus: "NONE" as const,
    };
    const b = {
      sequenceNumber: 99,
      deadlineStatus: "OVERDUE" as const,
      baseStatus: "IN_PROGRESS" as const,
      extensionStatus: "NONE" as const,
    };
    expect(attentionRank(b)).toBeLessThan(attentionRank(a));
  });

  it("OVERDUE pesa mais que DUE_TODAY, que pesa mais que DUE_SOON", () => {
    const overdue = attentionRank({
      sequenceNumber: 1,
      deadlineStatus: "OVERDUE",
      baseStatus: "IN_PROGRESS",
      extensionStatus: "NONE",
    });
    const today = attentionRank({
      sequenceNumber: 1,
      deadlineStatus: "DUE_TODAY",
      baseStatus: "IN_PROGRESS",
      extensionStatus: "NONE",
    });
    const soon = attentionRank({
      sequenceNumber: 1,
      deadlineStatus: "DUE_SOON",
      baseStatus: "IN_PROGRESS",
      extensionStatus: "NONE",
    });
    expect(overdue).toBeLessThan(today);
    expect(today).toBeLessThan(soon);
  });
});
