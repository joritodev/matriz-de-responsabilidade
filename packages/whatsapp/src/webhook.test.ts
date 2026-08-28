import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { resolveWebhookChallenge, verifyMetaWebhookSignature } from "./webhook";

function sign(body: string, secret: string): string {
  const hex = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("verifyMetaWebhookSignature", () => {
  it("aceita assinatura HMAC válida", () => {
    const body = '{"entry":[]}' ;
    const secret = "app-secret-test";
    expect(verifyMetaWebhookSignature(body, sign(body, secret), secret)).toBe(true);
  });

  it("rejeita assinatura ausente ou inválida", () => {
    const body = '{"entry":[]}';
    expect(verifyMetaWebhookSignature(body, null, "secret")).toBe(false);
    expect(verifyMetaWebhookSignature(body, "sha256=deadbeef", "secret")).toBe(false);
  });

  it("rejeita prefixo incorreto", () => {
    const body = "x";
    expect(verifyMetaWebhookSignature(body, "md5=abc", "secret")).toBe(false);
  });
});

describe("resolveWebhookChallenge", () => {
  it("retorna challenge quando token confere", () => {
    expect(
      resolveWebhookChallenge(
        { "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "12345" },
        "tok",
      ),
    ).toBe("12345");
  });

  it("retorna null para token errado ou modo inválido", () => {
    expect(
      resolveWebhookChallenge({ "hub.mode": "subscribe", "hub.verify_token": "bad" }, "tok"),
    ).toBeNull();
    expect(
      resolveWebhookChallenge({ "hub.mode": "unsubscribe", "hub.verify_token": "tok" }, "tok"),
    ).toBeNull();
  });
});
