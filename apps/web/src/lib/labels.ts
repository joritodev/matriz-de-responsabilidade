import type { BatchKind, Channel, FolderAlert, IsoDate } from "./api-types";
import { addDays, ddmm, weekdayLong } from "./dates";

export const channelLabel = (c: Channel) => (c === "email" ? "E-mail" : "WhatsApp");

export const kindLabel: Record<BatchKind, string> = {
  early: "antecipada",
  due: "no dia",
  mixed: "no dia e antecipada",
};

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function folderAlertText(alert: FolderAlert): string {
  switch (alert.kind) {
    case "overdue": return alert.count === 1 ? "1 atrasada" : `${alert.count} atrasadas`;
    case "today": return `${alert.count} hoje`;
    case "soon": return `${alert.count} em 3 dias`;
    case "ok": return "no prazo";
    case "empty": return "sem demandas";
  }
}

/** "amanhã" quando o próximo dia útil é amanhã; senão o dia da semana ("segunda"). */
export function nextDayWord(next: IsoDate, today: IsoDate): string {
  return next === addDays(today, 1) ? "amanhã" : weekdayLong(next);
}

export function nextDueText(next: IsoDate | null, today: IsoDate): string {
  if (!next) return "Nenhum prazo pela frente.";
  return next === today ? "Próximo prazo hoje." : `Próximo prazo ${ddmm(next)}.`;
}
