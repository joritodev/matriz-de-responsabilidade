import type { BaseStatus, DeadlineStatus, ExtensionStatus } from "../status/types";

export type ObservationProjectionInput = {
  sequenceNumber: number;
  baseStatus: BaseStatus;
  deadlineStatus: DeadlineStatus;
  extensionStatus: ExtensionStatus;
  blockedBySequenceNumbers: number[];
  completedAt: string | null;
  overdueBusinessDays?: number;
  triggerSequenceNumber?: number | null;
  triggerTitle?: string | null;
  lastNote?: string | null;
};

export function projectObservations(input: ObservationProjectionInput): string[] {
  const lines: string[] = [];

  switch (input.baseStatus) {
    case "PENDING":
      lines.push("Pendente");
      break;
    case "IN_PROGRESS":
      lines.push("Em andamento");
      break;
    case "BLOCKED":
      if (input.blockedBySequenceNumbers.length > 0) {
        lines.push(`Bloqueada por ${input.blockedBySequenceNumbers.map((n) => `#${n}`).join(" e ")}`);
      } else {
        lines.push("Bloqueada");
      }
      break;
    case "WAITING_FOR_INPUT":
      lines.push("Aguardando informação");
      break;
    case "WAITING_FOR_VALIDATION":
      lines.push("Aguardando validação da entrega");
      break;
    case "COMPLETED":
      lines.push(input.completedAt ? `Entregue em ${formatPtBrDate(input.completedAt)}` : "Concluída");
      break;
    case "CANCELLED":
      lines.push("Cancelada");
      break;
  }

  if (input.deadlineStatus === "OVERDUE" && input.baseStatus !== "COMPLETED" && input.baseStatus !== "CANCELLED") {
    const days = input.overdueBusinessDays ?? 0;
    lines.push(days > 0 ? `Atrasada há ${days} dias` : "Atrasada");
  }

  if (input.extensionStatus === "REQUESTED") {
    lines.push("Prorrogação solicitada");
  }

  if (input.lastNote) {
    lines.push(input.lastNote);
  }

  return lines.slice(0, 3);
}

function formatPtBrDate(iso: string): string {
  const date = iso.slice(0, 10);
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
