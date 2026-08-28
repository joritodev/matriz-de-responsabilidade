import { DomainError } from "../errors";

export { DomainError };

export type E164 = string;

export function normalizeE164(raw: string): E164 {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    throw new DomainError("INVALID_E164", "Número de WhatsApp vazio");
  }

  let e164Digits: string;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    e164Digits = digits;
  } else if (digits.length === 10 || digits.length === 11) {
    e164Digits = `55${digits}`;
  } else {
    throw new DomainError("INVALID_E164", "Número de WhatsApp com dígitos insuficientes");
  }

  if (e164Digits.length < 12) {
    throw new DomainError("INVALID_E164", "Número de WhatsApp com dígitos insuficientes");
  }

  return `+${e164Digits}`;
}
