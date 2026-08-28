import { describe, expect, it } from "vitest";
import { brNationalHolidaySeed } from "./br-national-holidays";

describe("brNationalHolidaySeed", () => {
  it("semear 9 feriados federais fixos por ano (2026–2028)", () => {
    const rows = brNationalHolidaySeed();
    expect(rows).toHaveLength(27);
    expect(rows.filter((r) => r.year === 2026)).toHaveLength(9);
    expect(rows.some((r) => r.observedOn === "2026-09-07" && r.name === "Independência")).toBe(true);
    expect(rows.some((r) => r.observedOn === "2028-11-20" && r.name === "Consciência Negra")).toBe(true);
  });
});
