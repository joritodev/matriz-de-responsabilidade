import { NextResponse } from "next/server";
import {
  assessWhatsAppReadiness,
  readWhatsAppConfigFromEnv,
  resolveWebhookChallenge,
  verifyMetaWebhookSignature,
} from "@matriz/whatsapp";
import { createLogger } from "@matriz/shared";

const log = createLogger({ level: process.env.LOG_LEVEL ?? "info", name: "whatsapp-webhook" });

export async function GET(request: Request) {
  const config = readWhatsAppConfigFromEnv();
  if (!config.verifyToken) {
    return new NextResponse("Webhook não configurado (WHATSAPP_VERIFY_TOKEN ausente)", { status: 503 });
  }

  const url = new URL(request.url);
  const challenge = resolveWebhookChallenge(
    {
      "hub.mode": url.searchParams.get("hub.mode") ?? undefined,
      "hub.verify_token": url.searchParams.get("hub.verify_token") ?? undefined,
      "hub.challenge": url.searchParams.get("hub.challenge") ?? undefined,
    },
    config.verifyToken,
  );

  if (!challenge) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  log.info("Webhook verificado pela Meta (GET challenge)");
  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const config = readWhatsAppConfigFromEnv();
  const rawBody = await request.text();

  if (config.appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (!verifyMetaWebhookSignature(rawBody, signature, config.appSecret)) {
      log.warn("Assinatura de webhook inválida");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } else {
    log.warn("WHATSAPP_APP_SECRET ausente — webhook aceito sem verificar assinatura (somente dev)");
  }

  // FASE 3.1: persistir payload bruto antes de processar (tabela messages).
  // Por ora apenas ACK para a Meta não reenviar em loop.
  try {
    const payload = JSON.parse(rawBody) as { object?: string };
    if (payload.object === "whatsapp_business_account") {
      log.info({ bytes: rawBody.length }, "Webhook WhatsApp recebido (persistência completa na FASE 3.1)");
    }
  } catch {
    log.warn("Payload webhook não é JSON válido");
  }

  const readiness = assessWhatsAppReadiness(config, process.env.APP_URL);
  if (!readiness.enabled) {
    log.info("WHATSAPP_ENABLED=false — evento ignorado após ACK");
  }

  return new NextResponse("OK", { status: 200 });
}
