import { describe, expect, it } from "vitest";
import { addCalendarDaysExclusive } from "./calendar";
import {
  materializeCalendarDaysAfterTrigger,
  resolveDependencyTriggerInstant,
} from "./relative";

describe("addCalendarDaysExclusive", () => {
  it("soma dias corridos sem pular fim de semana", () => {
    expect(addCalendarDaysExclusive("2026-08-28", 1)).toBe("2026-08-29");
    expect(addCalendarDaysExclusive("2026-08-28", 3)).toBe("2026-08-31");
  });
});

describe("materializeCalendarDaysAfterTrigger", () => {
  it("aguarda gatilho sem data até a predecessora ser concluída", () => {
    const waiting = materializeCalendarDaysAfterTrigger(null, 15);
    expect(waiting.waitingForTrigger).toBe(true);
    expect(waiting.currentDueDate).toBeNull();
  });

  it("calcula 15 dias corridos após validação em 2026-09-01", () => {
    const trigger = resolveDependencyTriggerInstant([
      { baseStatus: "COMPLETED", completedAt: "2026-09-01T15:00:00.000Z" },
    ]);
    const result = materializeCalendarDaysAfterTrigger(trigger, 15);
    expect(result.waitingForTrigger).toBe(false);
    expect(result.currentDueDate).toBe("2026-09-16");
  });

  it("inclui fim de semana na contagem (diferente de dias úteis)", () => {
    const trigger = resolveDependencyTriggerInstant([
      { baseStatus: "COMPLETED", completedAt: "2026-09-05T12:00:00.000Z" },
    ]);
    const calendar = materializeCalendarDaysAfterTrigger(trigger, 1);
    expect(calendar.currentDueDate).toBe("2026-09-06");
  });
});
