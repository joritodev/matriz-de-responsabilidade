import { describe, expect, it } from "vitest";
import { maskPhone } from "./mask-phone";

describe("unit_maskPhone", () => {
  it("mascara E.164 brasileiro preservando DDI e últimos 4 dígitos", () => {
    expect(maskPhone("+5511999887766")).toBe("+5511****7766");
  });

  it("não devolve o número cru quando o formato é inesperado", () => {
    expect(maskPhone("11999887766")).not.toBe("11999887766");
    expect(maskPhone("11999887766")).toMatch(/\*/);
  });
});
