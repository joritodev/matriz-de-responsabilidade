import { describe, expect, it } from "vitest";
import { nextSequenceNumber } from "./sequence-number";

describe("unit_sequence_number", () => {
  it("começa em 1 quando a matriz está vazia", () => {
    expect(nextSequenceNumber([])).toBe(1);
  });

  it("incrementa o máximo existente da matriz, sem reutilizar buracos", () => {
    expect(nextSequenceNumber([1, 2, 4])).toBe(5);
  });

  it("não trata sequence_number como prioridade — só cadastro incremental", () => {
    expect(nextSequenceNumber([3, 1])).toBe(4);
  });
});
