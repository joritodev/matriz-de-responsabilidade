import { describe, expect, it } from "vitest";
import { isWeekend } from "./calendar";
import {
  materializeMonthlyOccurrence,
  nextPeriod,
  nthBusinessDayOfMonth,
  periodFromStart,
  resolveInitialPeriod,
} from "./recurring";

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

describe("casoD_divulgarDisciplinas_terceiroDiaUtil", () => {
  it("casoD_mesComecaSabado_ago2026", () => {
    expect(nthBusinessDayOfMonth(2026, 8, 3, holidays2026)).toBe("2026-08-05");
  });

  it("casoD_mesComecaDomingo_mar2026", () => {
    expect(nthBusinessDayOfMonth(2026, 3, 3, holidays2026)).toBe("2026-03-04");
  });

  it("casoD_mesComecaDomingo_fev2026", () => {
    expect(nthBusinessDayOfMonth(2026, 2, 3, holidays2026)).toBe("2026-02-04");
  });

  it("casoD_feriadoNoPrimeiroDiaUtil_jan2026", () => {
    expect(nthBusinessDayOfMonth(2026, 1, 3, holidays2026)).toBe("2026-01-06");
  });

  it("casoD_feriadoNaoAfeta_set2026", () => {
    expect(nthBusinessDayOfMonth(2026, 9, 3, holidays2026)).toBe("2026-09-03");
  });

  it("casoD_mesComecaSegunda_jun2026", () => {
    expect(nthBusinessDayOfMonth(2026, 6, 3, holidays2026)).toBe("2026-06-03");
  });

  it("casoD_feriadoCustomNoTerceiroUtil", () => {
    const custom = [...holidays2026, "2026-08-05"];
    expect(nthBusinessDayOfMonth(2026, 8, 3, custom)).toBe("2026-08-06");
  });

  it("sábado/domingo nunca saem como due", () => {
    for (let month = 1; month <= 12; month += 1) {
      const due = nthBusinessDayOfMonth(2026, month, 3, holidays2026);
      expect(isWeekend(due)).toBe(false);
    }
  });
});

describe("casoD_completaAgostoAbreSetembro", () => {
  it("agosto 2026 → setembro 2026", () => {
    const agosto = materializeMonthlyOccurrence(2026, 8, 3, holidays2026);
    expect(agosto.dueDate).toBe("2026-08-05");

    const { year, month } = periodFromStart(agosto.periodStart);
    const next = nextPeriod(year, month);
    const setembro = materializeMonthlyOccurrence(next.year, next.month, 3, holidays2026);
    expect(setembro.dueDate).toBe("2026-09-03");
    expect(setembro.periodStart).toBe("2026-09-01");
  });
});

describe("resolveInitialPeriod", () => {
  it("default CURRENT_PERIOD mantém o mês corrente mesmo após o 3º útil", () => {
    expect(resolveInitialPeriod("2026-03-10", 3, holidays2026, "CURRENT_PERIOD")).toEqual({
      year: 2026,
      month: 3,
    });
  });

  it("NEXT_PERIOD pula para abril se março já passou do 3º útil", () => {
    expect(resolveInitialPeriod("2026-03-10", 3, holidays2026, "NEXT_PERIOD")).toEqual({
      year: 2026,
      month: 4,
    });
  });
});
