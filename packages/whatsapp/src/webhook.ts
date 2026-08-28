import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica X-Hub-Signature-256 (Meta Cloud API webhook). */
export function verifyMetaWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  if (expected.length !== received.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
  } catch {
    return false;
  }
}

export type WebhookVerifyQuery = {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
};

export function resolveWebhookChallenge(
  query: WebhookVerifyQuery,
  verifyToken: string,
): string | null {
  if (query["hub.mode"] !== "subscribe") return null;
  if (query["hub.verify_token"] !== verifyToken) return null;
  return query["hub.challenge"] ?? null;
}
