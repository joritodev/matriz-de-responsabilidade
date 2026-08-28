import { describe, expect, it } from "vitest";
import { addBusinessDays } from "./calendar";
import {
  materializeBusinessDaysAfterCreation,
  materializeBusinessDaysAfterDependency,
  resolveDependencyTriggerInstant,
} from "./relative";

const holidays2026 = [
  "2026-01-01",
  "2026-04-21",
  "2026-05-01",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
];

describe("materializeBusinessDaysAfterCreation", () => {
  it("15 dias úteis após criação em dia útil", () => {
    const result = materializeBusinessDaysAfterCreation("2026-08-20", 15, holidays2026);
    expect(result.waitingForTrigger).toBe(false);
    expect(result.currentDueDate).toBe(result.originalDueDate);
    expect(result.currentDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("casoC_posLive_waitingForTrigger_depoisCalcula15du", () => {
  it("aguarda gatilho sem data até a predecessora ser concluída", () => {
    const waiting = materializeBusinessDaysAfterDependency(null, 15, holidays2026);
    expect(waiting.waitingForTrigger).toBe(true);
    expect(waiting.currentDueDate).toBeNull();
  });

  it("calcula 15 dias úteis após validação em 2026-09-01 (pula 07/09)", () => {
    const trigger = resolveDependencyTriggerInstant([
      { baseStatus: "COMPLETED", completedAt: "2026-09-01T15:00:00.000Z" },
    ]);
    expect(trigger).not.toBeNull();

    const result = materializeBusinessDaysAfterDependency(trigger, 15, holidays2026);
    expect(result.waitingForTrigger).toBe(false);
    expect(result.currentDueDate).toBe(addBusinessDays("2026-09-01", 15, holidays2026));
    expect(result.currentDueDate).not.toBe("2026-09-07");
  });
});

describe("resolveDependencyTriggerInstant", () => {
  it("exige todas as predecessoras COMPLETED", () => {
    expect(
      resolveDependencyTriggerInstant([
        { baseStatus: "COMPLETED", completedAt: "2026-09-01T12:00:00.000Z" },
        { baseStatus: "PENDING", completedAt: null },
      ]),
    ).toBeNull();
  });

  it("usa a conclusão mais recente como âncora", () => {
    const trigger = resolveDependencyTriggerInstant([
      { baseStatus: "COMPLETED", completedAt: "2026-09-01T12:00:00.000Z" },
      { baseStatus: "COMPLETED", completedAt: "2026-09-07T15:00:00.000Z" },
    ]);
    expect(trigger).not.toBeNull();
    const result = materializeBusinessDaysAfterDependency(trigger, 1, []);
    expect(result.currentDueDate).toBe("2026-09-08");
  });
});
