import { describe, expect, it } from "vitest";
import { isMatrixActive } from "./active";

describe("unit_matrix_active", () => {
  it("active é derivado de archived_at IS NULL (A10)", () => {
    expect(isMatrixActive(null)).toBe(true);
    expect(isMatrixActive("2026-08-27T12:00:00-03:00")).toBe(false);
  });
});
