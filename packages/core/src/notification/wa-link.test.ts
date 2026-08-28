import { describe, expect, it } from "vitest";
import { buildWhatsAppChatLink } from "./wa-link";

describe("buildWhatsAppChatLink", () => {
  it("monta wa.me com E.164 e texto codificado", () => {
    const link = buildWhatsAppChatLink("+5511999998888", "Oi, Matheus!");
    expect(link).toBe("https://wa.me/5511999998888?text=Oi%2C%20Matheus!");
  });

  it("rejeita número curto demais", () => {
    expect(buildWhatsAppChatLink("+5511", "teste")).toBeNull();
  });

  it("aceita dígitos com formatação no E.164", () => {
    const link = buildWhatsAppChatLink("+55 (11) 99999-8888", "ok");
    expect(link).toContain("https://wa.me/5511999998888");
  });
});
