/**
 * Click-to-chat oficial do WhatsApp (https://faq.whatsapp.com/5913398998672934).
 * Abre a conversa com o texto pré-preenchido; o envio continua sendo um ato humano.
 * Não é transporte automatizado — ver docs/adr/ADR-007.
 */
export function buildWhatsAppChatLink(e164: string, message: string): string | null {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
