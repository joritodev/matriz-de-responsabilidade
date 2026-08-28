import { describe, expect, it } from "vitest";
import { DomainError, normalizeE164 } from "./e164";

describe("unit_e164", () => {
  it("normaliza celular BR com nono dígito a partir de bruto nacional", () => {
    expect(normalizeE164("11 99988-7766")).toBe("+5511999887766");
  });

  it("aceita número já em E.164", () => {
    expect(normalizeE164("+55 11 99988-7766")).toBe("+5511999887766");
  });

  it("rejeita número vazio", () => {
    expect(() => normalizeE164("")).toThrow(DomainError);
  });

  it("rejeita dígitos insuficientes", () => {
    expect(() => normalizeE164("1199")).toThrow(DomainError);
  });
});
