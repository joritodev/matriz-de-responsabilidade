import type { SendResult, SendTemplateInput, SendTextInput, WhatsAppConfig, WhatsAppProvider } from "./types";

export class WhatsAppDisabledError extends Error {
  constructor() {
    super("WhatsApp está desligado (WHATSAPP_ENABLED=false).");
    this.name = "WhatsAppDisabledError";
  }
}

function digitsE164(e164: string): string {
  return e164.replace(/\D/g, "");
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta-cloud-api";

  constructor(private readonly config: Required<Pick<WhatsAppConfig, "token" | "phoneNumberId">> & WhatsAppConfig) {}

  private url(path: string): string {
    const version = this.config.graphApiVersion ?? "v22.0";
    return `https://graph.facebook.com/${version}/${path}`;
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    const components =
      input.parameters && input.parameters.length > 0
        ? [
            {
              type: "body",
              parameters: input.parameters.map((p) => ({
                type: "text",
                parameter_name: p.name,
                text: p.value,
              })),
            },
          ]
        : undefined;

    const body = {
      messaging_product: "whatsapp",
      to: digitsE164(input.toE164),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "pt_BR" },
        ...(components ? { components } : {}),
      },
    };

    const res = await fetch(this.url(`${this.config.phoneNumberId}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Meta API HTTP ${res.status}`);
    }
    const id = json.messages?.[0]?.id;
    if (!id) throw new Error("Meta API não retornou message id");
    return { providerMessageId: id, status: "QUEUED" };
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    const body = {
      messaging_product: "whatsapp",
      to: digitsE164(input.toE164),
      type: "text",
      text: { body: input.body },
    };

    const res = await fetch(this.url(`${this.config.phoneNumberId}/messages`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) {
      throw new Error(json.error?.message ?? `Meta API HTTP ${res.status}`);
    }
    const id = json.messages?.[0]?.id;
    if (!id) throw new Error("Meta API não retornou message id");
    return { providerMessageId: id, status: "QUEUED" };
  }
}

export class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly name = "disabled";

  async sendTemplate(): Promise<SendResult> {
    throw new WhatsAppDisabledError();
  }

  async sendText(): Promise<SendResult> {
    throw new WhatsAppDisabledError();
  }
}

export type SentMessage = { input: SendTemplateInput | SendTextInput; result: SendResult };

export class FakeWhatsAppProvider implements WhatsAppProvider {
  readonly name = "fake";
  readonly sent: SentMessage[] = [];

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    const result = { providerMessageId: `wamid.fake.${this.sent.length + 1}`, status: "QUEUED" as const };
    this.sent.push({ input, result });
    return result;
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    const result = { providerMessageId: `wamid.fake.${this.sent.length + 1}`, status: "QUEUED" as const };
    this.sent.push({ input, result });
    return result;
  }
}

export function createWhatsAppProvider(config: WhatsAppConfig): WhatsAppProvider {
  if (!config.enabled) return new DisabledWhatsAppProvider();
  if (!config.token || !config.phoneNumberId) {
    throw new Error("WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID são obrigatórios com WHATSAPP_ENABLED=true");
  }
  return new MetaWhatsAppProvider({
    ...config,
    token: config.token,
    phoneNumberId: config.phoneNumberId,
  });
}
