export type WhatsAppProvider = {
  sendTemplate: (...args: never[]) => Promise<never>;
  sendText: (...args: never[]) => Promise<never>;
};

export class WhatsAppDisabledError extends Error {
  constructor() {
    super("WhatsApp está desligado (WHATSAPP_ENABLED=false). FASE 1 não envia mensagens.");
    this.name = "WhatsAppDisabledError";
  }
}

export function createWhatsAppProvider(): WhatsAppProvider {
  return {
    sendTemplate: async () => {
      throw new WhatsAppDisabledError();
    },
    sendText: async () => {
      throw new WhatsAppDisabledError();
    },
  };
}
