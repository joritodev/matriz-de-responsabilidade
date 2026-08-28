export type TemplateParameter = {
  name: string;
  value: string;
};

export type SendTemplateInput = {
  toE164: string;
  templateName: string;
  languageCode?: string;
  parameters?: TemplateParameter[];
  correlationId?: string;
};

export type SendTextInput = {
  toE164: string;
  body: string;
  correlationId?: string;
};

export type SendResult = {
  providerMessageId: string;
  status: "QUEUED" | "SENT";
};

export type WhatsAppProvider = {
  readonly name: string;
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  sendText(input: SendTextInput): Promise<SendResult>;
};

export type WhatsAppConfig = {
  enabled: boolean;
  token?: string;
  phoneNumberId?: string;
  wabaId?: string;
  appSecret?: string;
  verifyToken?: string;
  graphApiVersion?: string;
};

export function readWhatsAppConfigFromEnv(
  source: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): WhatsAppConfig {
  const enabled = ["1", "true", "yes", "on"].includes((source.WHATSAPP_ENABLED ?? "false").toLowerCase());
  return {
    enabled,
    token: source.WHATSAPP_TOKEN,
    phoneNumberId: source.WHATSAPP_PHONE_NUMBER_ID,
    wabaId: source.WHATSAPP_WABA_ID,
    appSecret: source.WHATSAPP_APP_SECRET,
    verifyToken: source.WHATSAPP_VERIFY_TOKEN,
    graphApiVersion: source.WHATSAPP_GRAPH_API_VERSION ?? "v22.0",
  };
}

export type WhatsAppReadiness = {
  enabled: boolean;
  readyToEnable: boolean;
  missing: string[];
  webhookUrl: string | null;
  notes: string[];
};

export function assessWhatsAppReadiness(
  config: WhatsAppConfig,
  appUrl?: string,
): WhatsAppReadiness {
  const required = [
    ["WHATSAPP_TOKEN", config.token],
    ["WHATSAPP_PHONE_NUMBER_ID", config.phoneNumberId],
    ["WHATSAPP_WABA_ID", config.wabaId],
    ["WHATSAPP_APP_SECRET", config.appSecret],
    ["WHATSAPP_VERIFY_TOKEN", config.verifyToken],
  ] as const;
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  const webhookUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/api/whatsapp/webhook` : null;
  const notes = [
    "WHATSAPP_ENABLED=false — nenhuma mensagem será enviada nem cobrada.",
    "Templates UTILITY precisam estar APPROVED na Meta antes do primeiro envio.",
    "Use um chip dedicado; não use o número pessoal do grupo dos chefes.",
    "Opt-in de cada responsável é obrigatório antes de enviar.",
  ];
  return {
    enabled: config.enabled,
    readyToEnable: missing.length === 0,
    missing: [...missing],
    webhookUrl,
    notes,
  };
}
