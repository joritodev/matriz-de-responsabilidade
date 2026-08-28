import type { BaseStatus, DeadlineStatus, ExtensionStatus, MatrixType } from "@matriz/core";

export const matrixTypeLabel: Record<MatrixType, string> = {
  GENERAL: "Geral",
  PROJECT: "Projeto",
  COURSE: "Curso",
  PRODUCT: "Produto",
  EVENT: "Evento",
  OTHER: "Outro",
};

export const baseStatusLabel: Record<BaseStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  BLOCKED: "Bloqueada",
  WAITING_FOR_INPUT: "Aguardando informação",
  WAITING_FOR_VALIDATION: "Aguardando validação",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const deadlineStatusLabel: Record<DeadlineStatus, string> = {
  ON_TIME: "No prazo",
  DUE_SOON: "Vence em breve",
  DUE_TODAY: "Vence hoje",
  OVERDUE: "Atrasada",
  WAITING_FOR_TRIGGER: "Aguardando gatilho",
  NOT_APPLICABLE: "Não se aplica",
};

export const extensionStatusLabel: Record<ExtensionStatus, string> = {
  NONE: "Nenhuma",
  REQUESTED: "Solicitada",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

export function deadlineAccent(status: DeadlineStatus): string {
  switch (status) {
    case "OVERDUE":
      return "border-l-red-700";
    case "DUE_TODAY":
    case "DUE_SOON":
      return "border-l-amber-500";
    case "WAITING_FOR_TRIGGER":
      return "border-l-slate-400";
    default:
      return "border-l-transparent";
  }
}
