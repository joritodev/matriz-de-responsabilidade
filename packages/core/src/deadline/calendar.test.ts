import { describe, expect, it } from "vitest";
import { addBusinessDays, isBusinessDay } from "./calendar";

describe("unit_businessDays_fase1_weekday", () => {
  it("sábado e domingo não são dias úteis quando feriados estão vazios", () => {
    expect(isBusinessDay("2026-08-28", [])).toBe(true); // sexta
    expect(isBusinessDay("2026-08-29", [])).toBe(false); // sábado
    expect(isBusinessDay("2026-08-30", [])).toBe(false); // domingo
  });

  it("unit_businessDays_pulaSabadoDomingo — sexta 28/08/2026 + 1 dia útil = 31/08/2026", () => {
    expect(addBusinessDays("2026-08-28", 1, [])).toBe("2026-08-31");
  });

  it("pula feriado informado no calendário local (sem API externa)", () => {
    expect(addBusinessDays("2025-12-31", 1, ["2026-01-01"])).toBe("2026-01-02");
  });
});
